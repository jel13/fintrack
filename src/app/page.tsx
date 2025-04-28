"use client";

import * as React from "react";
import { PlusCircle, LayoutDashboard, List, Target, TrendingDown, TrendingUp, PiggyBank, Settings, BookOpen, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { AddBudgetDialog } from "@/components/add-budget-dialog";
import BudgetCard from "@/components/budget-card";
import TransactionListItem from "@/components/transaction-list-item";
import { SpendingChart } from "@/components/spending-chart";
import type { Transaction, Budget, Category, AppData, SavingGoal } from "@/types";
import { format } from 'date-fns';
import { loadAppData, saveAppData } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link"; // Import Link for navigation


export default function Home() {
  const [appData, setAppData] = React.useState<AppData>(loadAppData());
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);
  const [tempIncome, setTempIncome] = React.useState<string>(appData.monthlyIncome?.toString() ?? '');
  const { toast } = useToast();

  const currentMonth = format(new Date(), 'yyyy-MM'); // Get current month in YYYY-MM format

  // Derived state from appData
  const { monthlyIncome, transactions, budgets, categories, savingGoals } = appData;

   // Persist data whenever appData changes
  React.useEffect(() => {
    saveAppData(appData);
  }, [appData]);


  // Calculate summaries for the current month
  const monthlySummary = React.useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth);
    const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    // Use monthlyIncome if set and no income transactions exist for the month yet
    const effectiveIncome = monthlyIncome !== null && income === 0 ? monthlyIncome : income;
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = effectiveIncome - expenses;
    return { income: effectiveIncome, expenses, balance };
  }, [transactions, monthlyIncome, currentMonth]);

  // Filter budgets for the current month
  const currentMonthBudgets = React.useMemo(() => {
      return budgets.filter(b => b.month === currentMonth);
  }, [budgets, currentMonth]);

   // Filter categories (excluding income and parent categories like 'Bills')
   const spendingCategories = React.useMemo(() => {
       return categories.filter(cat => cat.id !== 'income' && !categories.some(c => c.parentId === cat.id));
   }, [categories]);


  // Update budget spending whenever transactions change
  React.useEffect(() => {
     setAppData(prevData => {
         const updatedBudgets = prevData.budgets.map(budget => {
             if (budget.month === currentMonth) {
                 const spent = prevData.transactions
                     .filter(t => t.type === 'expense' && t.category === budget.category && format(t.date, 'yyyy-MM') === currentMonth)
                     .reduce((sum, t) => sum + t.amount, 0);
                 return { ...budget, spent };
             }
             return budget;
         });

        // Auto-allocate leftover budget to Savings
        const savingsBudgetIndex = updatedBudgets.findIndex(b => b.category === 'savings' && b.month === currentMonth);
        const totalBudgeted = updatedBudgets
            .filter(b => b.category !== 'savings' && b.month === currentMonth)
            .reduce((sum, b) => sum + b.limit, 0);

        if (prevData.monthlyIncome !== null) {
            const leftover = prevData.monthlyIncome - totalBudgeted;
            if (savingsBudgetIndex > -1) {
                // Update existing savings budget limit if leftover is positive
                 if (leftover > 0) {
                     updatedBudgets[savingsBudgetIndex].limit = leftover;
                 } else {
                     // Remove savings budget if no leftover or negative
                     // updatedBudgets.splice(savingsBudgetIndex, 1);
                     // Or set limit to 0
                     updatedBudgets[savingsBudgetIndex].limit = 0;
                 }
            } else if (leftover > 0) {
                // Add new savings budget if it doesn't exist and leftover is positive
                 const savingsSpent = prevData.transactions
                     .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                     .reduce((sum, t) => sum + t.amount, 0);
                 updatedBudgets.push({
                    id: `b-savings-${Date.now().toString()}`,
                    category: 'savings',
                    limit: leftover,
                    percentage: undefined, // Savings percentage is implicit
                    spent: savingsSpent,
                    month: currentMonth,
                });
            }
             // Re-calculate percentage for all budgets based on new income/limits if needed
             updatedBudgets.forEach(budget => {
                 if (budget.category !== 'savings' && prevData.monthlyIncome !== null && prevData.monthlyIncome > 0) {
                     budget.percentage = parseFloat(((budget.limit / prevData.monthlyIncome) * 100).toFixed(1));
                 } else if (budget.category === 'savings') {
                    // Clear percentage for savings as it's the remainder
                     budget.percentage = undefined;
                 }
             });
        }


        return { ...prevData, budgets: updatedBudgets };
     });
  }, [transactions, monthlyIncome, currentMonth]); // Dependency on monthlyIncome added


  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    const transactionWithId: Transaction = {
      ...newTransaction,
      id: Date.now().toString(), // Simple unique ID generation
    };
    setAppData(prev => ({
        ...prev,
        transactions: [transactionWithId, ...prev.transactions].sort((a, b) => b.date.getTime() - a.date.getTime()),
    }));
    toast({ title: "Transaction added", description: `${newTransaction.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(newTransaction.amount)} logged.` });
  };

 const handleAddBudget = (newBudget: Omit<Budget, 'id' | 'spent' | 'month'>) => {
    if (monthlyIncome === null || monthlyIncome <= 0) {
        toast({ title: "Set Income First", description: "Please set your monthly income before creating budgets.", variant: "destructive" });
        return;
    }

    const budgetWithDetails: Budget = {
        ...newBudget,
        id: `b-${Date.now().toString()}`, // Simple unique ID
        spent: transactions // Calculate initial spent amount
            .filter(t => t.type === 'expense' && t.category === newBudget.category && format(t.date, 'yyyy-MM') === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0),
        month: currentMonth,
        // Calculate percentage if limit is provided and income is set
        percentage: newBudget.limit > 0 && monthlyIncome > 0 ? parseFloat(((newBudget.limit / monthlyIncome) * 100).toFixed(1)) : newBudget.percentage,
        // Calculate limit if percentage is provided and income is set
        limit: newBudget.percentage !== undefined && monthlyIncome > 0 ? parseFloat(((newBudget.percentage / 100) * monthlyIncome).toFixed(2)) : newBudget.limit,
    };

    setAppData(prev => {
        const updatedBudgets = [...prev.budgets, budgetWithDetails];
        // Recalculate Savings budget after adding a new one
        const savingsBudgetIndex = updatedBudgets.findIndex(b => b.category === 'savings' && b.month === currentMonth);
        const totalBudgeted = updatedBudgets
            .filter(b => b.category !== 'savings' && b.month === currentMonth)
            .reduce((sum, b) => sum + b.limit, 0);

        if (prev.monthlyIncome !== null) {
            const leftover = prev.monthlyIncome - totalBudgeted;
            if (savingsBudgetIndex > -1) {
                 updatedBudgets[savingsBudgetIndex].limit = Math.max(0, leftover); // Ensure non-negative limit
            } else if (leftover > 0) {
                 const savingsSpent = prev.transactions
                     .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                     .reduce((sum, t) => sum + t.amount, 0);
                 updatedBudgets.push({
                    id: `b-savings-${Date.now().toString()}`,
                    category: 'savings',
                    limit: leftover,
                    percentage: undefined, // Savings percentage is implicit
                    spent: savingsSpent,
                    month: currentMonth,
                });
            }
        }

        return { ...prev, budgets: updatedBudgets };
    });
    toast({ title: "Budget Set", description: `Budget for ${getCategoryById(newBudget.category)?.label} set to ${formatCurrency(budgetWithDetails.limit)} (${budgetWithDetails.percentage ?? '-'}%).` });
};


  // Format currency helper
  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    // Basic formatting, consider using Intl.NumberFormat for robustness
    return `${sign}$${absAmount.toFixed(2)}`;
  };

 const handleSetIncome = () => {
    const incomeValue = parseFloat(tempIncome);
    if (!isNaN(incomeValue) && incomeValue >= 0) {
       setAppData(prev => {
            const prevIncome = prev.monthlyIncome;
            const newIncome = incomeValue;
            const updatedBudgets = prev.budgets.map(budget => {
                if (budget.month === currentMonth && budget.category !== 'savings') {
                    // If percentage was set, recalculate limit based on new income
                    if (budget.percentage !== undefined && newIncome > 0) {
                         budget.limit = parseFloat(((budget.percentage / 100) * newIncome).toFixed(2));
                    }
                    // If only limit was set, recalculate percentage (optional, could leave as is)
                    // else if (newIncome > 0) {
                    //     budget.percentage = parseFloat(((budget.limit / newIncome) * 100).toFixed(1));
                    // }
                }
                return budget;
            });

             // Recalculate Savings budget
            const savingsBudgetIndex = updatedBudgets.findIndex(b => b.category === 'savings' && b.month === currentMonth);
            const totalBudgeted = updatedBudgets
                .filter(b => b.category !== 'savings' && b.month === currentMonth)
                .reduce((sum, b) => sum + b.limit, 0);
             const leftover = newIncome - totalBudgeted;

             if (savingsBudgetIndex > -1) {
                 updatedBudgets[savingsBudgetIndex].limit = Math.max(0, leftover); // Ensure non-negative
             } else if (leftover > 0) {
                  const savingsSpent = prev.transactions
                     .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                     .reduce((sum, t) => sum + t.amount, 0);
                 updatedBudgets.push({
                    id: `b-savings-${Date.now().toString()}`,
                    category: 'savings',
                    limit: leftover,
                    percentage: undefined, // Savings percentage is implicit
                    spent: savingsSpent,
                    month: currentMonth,
                });
             }


            return { ...prev, monthlyIncome: newIncome, budgets: updatedBudgets };
       });
      toast({ title: "Income Updated", description: `Monthly income set to ${formatCurrency(incomeValue)}.` });
    } else {
      toast({ title: "Invalid Income", description: "Please enter a valid positive number for income.", variant: "destructive" });
    }
  };

   const getCategoryById = (id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  }

   const getCategoryTree = (parentId: string | null = null): (Category & { children?: Category[] })[] => {
    const topLevel = categories.filter(cat => cat.parentId === parentId);
    return topLevel.map(cat => ({
        ...cat,
        children: getCategoryTree(cat.id)
    }));
  }


  return (
    <div className="flex flex-col h-screen bg-background">
      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <TabsContent value="dashboard" className="flex-grow overflow-y-auto p-4 space-y-4">
           {/* Set Income Card (if not set) */}
            {monthlyIncome === null && (
              <Card className="border-primary border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><AlertCircle className="text-primary h-5 w-5"/> Set Your Monthly Income</CardTitle>
                  <CardDescription>Start by telling us your estimated monthly income or allowance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                   <Label htmlFor="monthly-income">Estimated Monthly Income ($)</Label>
                   <div className="flex gap-2">
                     <Input
                        id="monthly-income"
                        type="number"
                        placeholder="e.g., 2500"
                        value={tempIncome}
                        onChange={(e) => setTempIncome(e.target.value)}
                        className="flex-grow"
                      />
                      <Button onClick={handleSetIncome}>Set Income</Button>
                   </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Summary Cards (only show if income is set) */}
             {monthlyIncome !== null && (
                <>
                 <div className="grid gap-4 grid-cols-2">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-accent">{formatCurrency(monthlySummary.income)}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(monthlySummary.expenses)}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Balance</CardTitle>
                    <CardDescription>Income vs Expenses this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="text-3xl font-bold text-primary">{formatCurrency(monthlySummary.balance)}</div>
                    </CardContent>
                </Card>
                </>
             )}


          {/* Spending Chart */}
          {monthlyIncome !== null && <SpendingChart transactions={transactions} month={currentMonth} categories={categories} />}

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[200px]">
                 {transactions.slice(0, 5).map((t) => ( // Show latest 5
                   <TransactionListItem key={t.id} transaction={t} categories={categories} />
                 ))}
                 {transactions.length === 0 && <p className="p-4 text-center text-muted-foreground">No transactions yet.</p>}
               </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="flex-grow overflow-y-auto p-0">
           <ScrollArea className="h-full">
             <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold">All Transactions</h2>
               {transactions.length > 0 ? (
                   transactions.map((t) => (
                    <TransactionListItem key={t.id} transaction={t} categories={categories} />
                   ))
                ) : (
                   <p className="text-center text-muted-foreground pt-10">No transactions recorded.</p>
                )}
             </div>
           </ScrollArea>
        </TabsContent>

        <TabsContent value="budgets" className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-semibold">Monthly Budgets</h2>
             {monthlyIncome !== null && (
                <Button size="sm" onClick={() => setIsAddBudgetDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
                </Button>
             )}
          </div>

          {monthlyIncome === null ? (
             <Card className="border-dashed border-muted-foreground">
                 <CardContent className="p-6 text-center text-muted-foreground">
                     <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>Please set your monthly income on the Dashboard tab before creating budgets.</p>
                 </CardContent>
             </Card>
           ) : currentMonthBudgets.length > 0 ? (
             currentMonthBudgets.map((budget) => (
                <BudgetCard key={budget.id} budget={budget} categories={categories} monthlyIncome={monthlyIncome} />
              ))
           ) : (
             <p className="text-center text-muted-foreground pt-10">No budgets set for this month. Click 'Add Budget' to start.</p>
           )}
        </TabsContent>

        {/* Saving Goals Tab */}
        <TabsContent value="goals" className="flex-grow overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Saving Goals</h2>
                {/* Link to a dedicated Saving Goals page */}
                <Link href="/saving-goals" passHref>
                     <Button size="sm" variant="outline">
                        Manage Goals <Settings className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </div>
            {/* Display Saving Goals summary here - Example */}
            {savingGoals.length > 0 ? (
                 savingGoals.map(goal => (
                    <Card key={goal.id}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{goal.name}</CardTitle>
                            {goal.description && <CardDescription>{goal.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-sm mb-1">
                                <span>{formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                <span>{((goal.savedAmount / goal.targetAmount) * 100).toFixed(1)}%</span>
                            </div>
                            <progress value={goal.savedAmount} max={goal.targetAmount} className="w-full h-2 [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent"></progress>
                            {goal.percentageAllocation && monthlyIncome && budgets.find(b => b.category === 'savings') && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Receives {goal.percentageAllocation}% of Savings budget ({formatCurrency((goal.percentageAllocation / 100) * (budgets.find(b => b.category === 'savings')?.limit ?? 0))}/month)
                                </p>
                            )}
                        </CardContent>
                    </Card>
                 ))
            ) : (
                <p className="text-center text-muted-foreground pt-10">No saving goals set yet. Go to 'Manage Goals' to create some.</p>
            )}

             {/* Placeholder for E-Learning Link */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/> Financial Planning Tips</CardTitle>
                </CardHeader>
                <CardContent>
                    <Link href="/learn/budgeting-guide" passHref>
                        <Button variant="link" className="p-0 h-auto">How to Budget Guide</Button>
                    </Link>
                     {/* Add more links later */}
                </CardContent>
             </Card>
        </TabsContent>

        {/* Floating Action Button */}
        {monthlyIncome !== null && (
             <div className="fixed bottom-20 right-4 z-10">
                <Button
                    size="icon"
                    className="rounded-full h-14 w-14 shadow-lg"
                    onClick={() => setIsAddTransactionSheetOpen(true)}
                    aria-label="Add Transaction"
                >
                    <PlusCircle className="h-6 w-6" />
                </Button>
             </div>
        )}


        {/* Bottom Navigation */}
        <TabsList className="grid w-full grid-cols-4 h-16 rounded-none sticky bottom-0 bg-background border-t">
          <TabsTrigger value="dashboard" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <List className="h-5 w-5" />
             <span className="text-xs">History</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Target className="h-5 w-5" />
             <span className="text-xs">Budgets</span>
          </TabsTrigger>
           <TabsTrigger value="goals" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <PiggyBank className="h-5 w-5" />
             <span className="text-xs">Goals</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Modals/Sheets */}
      <AddTransactionSheet
        open={isAddTransactionSheetOpen}
        onOpenChange={setIsAddTransactionSheetOpen}
        onAddTransaction={handleAddTransaction}
        categories={categories} // Pass categories list
      />
       <AddBudgetDialog
        open={isAddBudgetDialogOpen}
        onOpenChange={setIsAddBudgetDialogOpen}
        onAddBudget={handleAddBudget}
        existingCategories={currentMonthBudgets.map(b => b.category)} // Pass existing budget categories for the month
        categories={spendingCategories} // Pass available spending categories
        monthlyIncome={monthlyIncome} // Pass income for calculations
      />
    </div>
  );
}
