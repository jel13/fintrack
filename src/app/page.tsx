

"use client";

import * as React from "react";
import { PlusCircle, LayoutDashboard, List, Target, TrendingDown, TrendingUp, PiggyBank, Settings, BookOpen, AlertCircle, Info, Wallet } from "lucide-react";
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
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage"; // Import defaultAppData
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link"; // Import Link for navigation
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryIconComponent } from '@/components/category-icon';
import { Progress } from "@/components/ui/progress"; // Import Progress


export default function Home() {
  const [appData, setAppData] = React.useState<AppData>(defaultAppData);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);
  const [tempIncome, setTempIncome] = React.useState<string>(''); // Initialize empty
  const [selectedIncomeCategory, setSelectedIncomeCategory] = React.useState<string>('salary'); // Default income category selection
  const { toast } = useToast();

  const currentMonth = format(new Date(), 'yyyy-MM');

  // Load data from localStorage only on the client after initial mount
  React.useEffect(() => {
    const loadedData = loadAppData();
    setAppData(loadedData);
    setTempIncome(loadedData.monthlyIncome?.toString() ?? ''); // Update tempIncome after loading
    setIsLoaded(true); // Mark data as loaded
  }, []); // Empty dependency array ensures this runs only once on mount

  // Persist data whenever appData changes *after* initial load
  React.useEffect(() => {
    if (isLoaded) { // Only save after initial data is loaded
      saveAppData(appData);
    }
  }, [appData, isLoaded]);

  // Destructure AFTER the useEffect load might update it
  const { monthlyIncome, transactions, budgets, categories, savingGoals } = appData;

  // Calculate summaries for the current month
  const monthlySummary = React.useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth);
    const incomeTransactions = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    // Use monthlyIncome as the primary source of truth for total income
    const effectiveIncome = monthlyIncome ?? 0;
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = effectiveIncome - expenses; // Balance based on set income vs logged expenses
    return { income: effectiveIncome, expenses, balance, incomeTransactions };
  }, [transactions, monthlyIncome, currentMonth]);

  // Separate categories
  const incomeCategories = React.useMemo(() => categories.filter(cat => cat.isIncomeSource), [categories]);
  const expenseCategories = React.useMemo(() => categories.filter(cat => !cat.isIncomeSource && cat.id !== 'savings'), [categories]); // Exclude savings
  const spendingCategoriesForSelect = React.useMemo(() => {
       // Filter out parent categories for selection in transactions/budgets
       return expenseCategories.filter(cat => !expenseCategories.some(c => c.parentId === cat.id));
   }, [expenseCategories]);


  // Filter budgets for the current month
  const currentMonthBudgets = React.useMemo(() => {
      return budgets.filter(b => b.month === currentMonth);
  }, [budgets, currentMonth]);

  // Update budget spending and Savings budget limit whenever relevant data changes
  React.useEffect(() => {
    if (!isLoaded || monthlyIncome === null) return; // Don't run until loaded and income is set

     setAppData(prevData => {
         const updatedBudgets = prevData.budgets.map(budget => {
              // Recalculate spent for all budgets based on current transactions
             const spent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === budget.category && format(t.date, 'yyyy-MM') === currentMonth)
                 .reduce((sum, t) => sum + t.amount, 0);

             // Recalculate limit based on percentage if applicable (excluding Savings)
             let limit = budget.limit;
             if (budget.category !== 'savings' && budget.percentage !== undefined && prevData.monthlyIncome !== null) {
                 limit = parseFloat(((budget.percentage / 100) * prevData.monthlyIncome).toFixed(2));
             }

             return { ...budget, spent, limit, month: budget.month || currentMonth }; // Ensure month is set
         });

        // Auto-calculate and update the Savings budget limit
        const savingsBudgetIndex = updatedBudgets.findIndex(b => b.category === 'savings' && b.month === currentMonth);
        const totalBudgetedExcludingSavings = updatedBudgets
            .filter(b => b.category !== 'savings' && b.month === currentMonth)
            .reduce((sum, b) => sum + b.limit, 0); // Use the recalculated limits

        const leftover = Math.max(0, (prevData.monthlyIncome ?? 0) - totalBudgetedExcludingSavings); // Leftover for savings

        if (savingsBudgetIndex > -1) {
            // Update existing savings budget limit and spent amount
            const savingsSpent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                 .reduce((sum, t) => sum + t.amount, 0);
            updatedBudgets[savingsBudgetIndex] = {
                ...updatedBudgets[savingsBudgetIndex],
                limit: leftover,
                spent: savingsSpent, // Recalculate spent for savings too
                percentage: undefined // Savings percentage is implicit
            };

        } else {
            // Add new savings budget if it doesn't exist
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

        // Only return updated data if something actually changed to prevent infinite loops
        // Compare based on relevant fields that change here (limits, spent amounts)
        const relevantOldBudgets = JSON.stringify(prevData.budgets.map(b => ({ id: b.id, limit: b.limit, spent: b.spent, month: b.month })));
        const relevantNewBudgets = JSON.stringify(updatedBudgets.map(b => ({ id: b.id, limit: b.limit, spent: b.spent, month: b.month })));

        if (relevantOldBudgets !== relevantNewBudgets) {
             return { ...prevData, budgets: updatedBudgets };
        }
        return prevData;

     });
  }, [transactions, monthlyIncome, currentMonth, isLoaded]); // Recalculate when these change


  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    // Basic validation: Check if adding an expense without a budget set for that category
    if (newTransaction.type === 'expense') {
      const budgetExists = currentMonthBudgets.some(b => b.category === newTransaction.category);
      if (!budgetExists && newTransaction.category !== 'savings') { // Allow savings pseudo-transactions
        toast({ title: "Budget Required", description: `Please set a budget for '${getCategoryById(newTransaction.category)?.label}' before adding expenses.`, variant: "destructive" });
        return;
      }
    }

    const transactionWithId: Transaction = {
      ...newTransaction,
      id: Date.now().toString(), // Simple unique ID generation
    };
    setAppData(prev => ({
        ...prev,
        transactions: [transactionWithId, ...prev.transactions].sort((a, b) => b.date.getTime() - a.date.getTime()),
    }));
    toast({ title: "Transaction added", description: `${newTransaction.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(newTransaction.amount)} logged for ${getCategoryById(newTransaction.category)?.label}.` });
  };

 const handleAddBudget = (newBudget: Omit<Budget, 'id' | 'spent' | 'month' | 'limit'>) => {
    // monthlyIncome check is implicitly handled by useEffect dependency and dialog logic

    const calculatedLimit = newBudget.percentage !== undefined && monthlyIncome && monthlyIncome > 0
        ? parseFloat(((newBudget.percentage / 100) * monthlyIncome).toFixed(2))
        : 0; // Default to 0 if percentage is missing or income is zero/null

     if (calculatedLimit <= 0 && newBudget.percentage && newBudget.percentage > 0) {
         toast({ title: "Invalid Budget", description: "Calculated budget limit must be positive. Check income and percentage.", variant: "destructive" });
         return; // Prevent adding budget with zero or negative limit if percentage > 0
     }


    const budgetWithDetails: Budget = {
        ...newBudget,
        id: `b-${newBudget.category}-${Date.now().toString()}`, // More specific ID
        spent: transactions // Calculate initial spent amount
            .filter(t => t.type === 'expense' && t.category === newBudget.category && format(t.date, 'yyyy-MM') === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0),
        month: currentMonth,
        limit: calculatedLimit, // Use the calculated limit
        percentage: newBudget.percentage, // Keep the user-input percentage
    };

    // 50% Needs Rule Check (Example: Housing, Groceries, Transport, Bills are 'Needs')
    const needsCategoryIds = ['housing', 'groceries', 'transport', 'bills']; // Define your needs categories
    const currentNeedsPercentage = currentMonthBudgets
        .filter(b => needsCategoryIds.includes(b.category) && b.category !== newBudget.category) // Exclude the new budget being added for now
        .reduce((sum, b) => sum + (b.percentage ?? 0), 0)
        + (needsCategoryIds.includes(newBudget.category) ? (newBudget.percentage ?? 0) : 0); // Add the new budget's percentage if it's a need

    if (currentNeedsPercentage > 50) {
         toast({
            title: "Budget Reminder",
            description: `Your 'Needs' categories now represent ${currentNeedsPercentage.toFixed(1)}% of your income, exceeding the recommended 50%. Consider reviewing your allocations.`,
            variant: "default", // Use default or a custom 'warning' variant
            duration: 7000, // Longer duration
            action: <Info className="h-5 w-5 text-blue-500" />, // Example using Info icon
         });
         // NOTE: We DO NOT return here, allowing the user to proceed.
    }


    setAppData(prev => {
        // Replace if budget for this category exists for the month, otherwise add
        const existingBudgetIndex = prev.budgets.findIndex(b => b.category === newBudget.category && b.month === currentMonth);
        let updatedBudgets;
        if (existingBudgetIndex > -1) {
            updatedBudgets = [...prev.budgets];
            updatedBudgets[existingBudgetIndex] = budgetWithDetails; // Replace with new details (including potentially updated percentage)
        } else {
            updatedBudgets = [...prev.budgets, budgetWithDetails];
        }

        // --- Recalculate Savings budget AFTER adding/updating ---
        // This logic is now handled by the useEffect hook, ensuring it runs
        // after the state update with the new/updated budget.
        // ---

        // Sort budgets for consistent display (e.g., by category label)
        updatedBudgets.sort((a, b) => {
             if (a.category === 'savings') return 1; // Savings last
             if (b.category === 'savings') return -1;
             return (getCategoryById(a.category)?.label ?? a.category).localeCompare(getCategoryById(b.category)?.label ?? b.category);
         });

        return { ...prev, budgets: updatedBudgets };
    });
    toast({ title: "Budget Set", description: `Budget for ${getCategoryById(newBudget.category)?.label} set to ${newBudget.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(budgetWithDetails.limit)}).` });
};



 const handleSetIncome = () => {
    const incomeValue = parseFloat(tempIncome);
    if (isNaN(incomeValue) || incomeValue < 0) {
        toast({ title: "Invalid Income", description: "Please enter a valid positive number for income.", variant: "destructive" });
        return;
    }
    if (!selectedIncomeCategory) {
         toast({ title: "Select Income Source", description: "Please select an income source category.", variant: "destructive" });
         return;
    }

     // Log the income setting as a transaction
     const incomeTransaction: Omit<Transaction, 'id'> = {
         type: 'income',
         amount: incomeValue,
         category: selectedIncomeCategory, // Use selected category
         date: new Date(),
         description: `Initial monthly income set`, // Or a more generic description
     };

     // Update AppData: set monthlyIncome and recalculate budget limits based on FIXED percentages
     setAppData(prev => {
            const newIncome = incomeValue;
            // Keep existing budgets, update their LIMITS based on FIXED percentages
            const updatedBudgets = prev.budgets.map(budget => {
                let newLimit = budget.limit;
                // Recalculate LIMIT based on FIXED percentage and NEW income
                if (budget.category !== 'savings' && budget.percentage !== undefined && budget.percentage > 0) {
                    newLimit = parseFloat(((budget.percentage / 100) * newIncome).toFixed(2));
                }
                // Do NOT recalculate spent here, let the useEffect handle it based on transactions
                return { ...budget, limit: newLimit };
            });

            // --- Recalculate Savings budget after updating income ---
            // This logic is now handled by the useEffect hook, ensuring it runs
            // after the state update with the new income and recalculated limits.
            // ---


            // Add the income setting transaction
            const transactionWithId: Transaction = { ...incomeTransaction, id: `inc-${Date.now()}` };
            const updatedTransactions = [transactionWithId, ...prev.transactions]
                .sort((a, b) => b.date.getTime() - a.date.getTime());


            return {
                ...prev,
                monthlyIncome: newIncome,
                budgets: updatedBudgets,
                transactions: updatedTransactions
            };
       });

      toast({ title: "Income Updated", description: `Monthly income set to ${formatCurrency(incomeValue)}. Budget limits updated.` });
      // Optionally clear tempIncome here if desired after successful set
      // setTempIncome('');
      // setSelectedIncomeCategory('salary'); // Reset category selection
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

  // Calculate total allocated percentage EXCLUDING savings
  const totalAllocatedPercentage = React.useMemo(() => {
     return currentMonthBudgets
         .filter(b => b.category !== 'savings' && b.percentage !== undefined) // Exclude savings & ensure percentage exists
         .reduce((sum, b) => sum + (b.percentage ?? 0), 0);
  }, [currentMonthBudgets]);

  // Calculate total allocated budget amount EXCLUDING savings
  const totalAllocatedBudgetAmount = React.useMemo(() => {
      return currentMonthBudgets
          .filter(b => b.category !== 'savings')
          .reduce((sum, b) => sum + b.limit, 0);
  }, [currentMonthBudgets]);

  // Get the current Savings budget amount (limit)
  const savingsBudgetAmount = React.useMemo(() => {
      const savings = currentMonthBudgets.find(b => b.category === 'savings');
      return savings?.limit ?? 0;
  }, [currentMonthBudgets]);

  // Determine if any NON-SAVINGS budget has been set for the current month
  const hasExpenseBudgetsSet = React.useMemo(() => {
    return currentMonthBudgets.some(b => b.category !== 'savings');
  }, [currentMonthBudgets]);


  return (
    <div className="flex flex-col h-screen bg-background">
      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <TabsContent value="dashboard" className="flex-grow overflow-y-auto p-4 space-y-4">
           {/* Set Income Card - Show if not loaded OR if income is null */}
            {!isLoaded || monthlyIncome === null ? (
              <Card className="border-primary border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Wallet className="text-primary h-5 w-5"/> Set Your Monthly Income</CardTitle>
                  <CardDescription>Estimate your total income for the month and select the primary source.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="monthly-income">Amount ($)</Label>
                            <Input
                                id="monthly-income"
                                type="number"
                                placeholder="e.g., 2500"
                                value={tempIncome}
                                onChange={(e) => setTempIncome(e.target.value)}
                                className="flex-grow"
                            />
                        </div>
                         <div className="space-y-1">
                             <Label htmlFor="income-category">Source Category</Label>
                             <Select value={selectedIncomeCategory} onValueChange={setSelectedIncomeCategory}>
                                <SelectTrigger id="income-category">
                                    <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {incomeCategories.map((cat) => {
                                        const Icon = getCategoryIconComponent(cat.icon);
                                        return (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                <span>{cat.label}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                             </Select>
                         </div>
                   </div>
                   <Button onClick={handleSetIncome} className="w-full">Set Monthly Income</Button>
                </CardContent>
              </Card>
            ) : null}

            {/* Monthly Summary Cards (Show only if loaded and income is set) */}
             {isLoaded && monthlyIncome !== null && (
                <>
                 <div className="grid gap-4 grid-cols-2">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(monthlySummary.income)}</div>
                        <p className="text-xs text-muted-foreground">Set for this month</p>
                        {/* Optionally show income logged via transactions */}
                        {/* <p className="text-xs text-muted-foreground">Logged: {formatCurrency(monthlySummary.incomeTransactions)}</p> */}
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses Logged</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {/* Hide expenses until budget is set */}
                         {hasExpenseBudgetsSet ? (
                            <div className="text-2xl font-bold">{formatCurrency(monthlySummary.expenses)}</div>
                         ) : (
                            <div className="text-sm text-muted-foreground italic">Set budgets first</div>
                         )}
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Remaining Balance</CardTitle>
                    <CardDescription>Estimated income vs logged expenses this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Show balance regardless of budget setting, based on income vs logged expenses */}
                      <div className="text-3xl font-bold text-primary">{formatCurrency(monthlySummary.balance)}</div>
                    </CardContent>
                </Card>
                </>
             )}


          {/* Spending Chart (Show if loaded, income set, and expense budgets exist) */}
          {isLoaded && monthlyIncome !== null && hasExpenseBudgetsSet && <SpendingChart transactions={transactions} month={currentMonth} categories={expenseCategories} />}

          {/* Recent Transactions (Show if loaded and income set) */}
          {isLoaded && monthlyIncome !== null && (
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
          )}
           {!hasExpenseBudgetsSet && isLoaded && monthlyIncome !== null && (
                <Card className="border-dashed border-muted-foreground">
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <List className="mx-auto h-8 w-8 mb-2" />
                        <p>Set your budgets in the 'Budgets' tab to start tracking expenses and see spending analysis.</p>
                    </CardContent>
                </Card>
           )}
        </TabsContent>

        <TabsContent value="transactions" className="flex-grow overflow-y-auto p-0">
           <ScrollArea className="h-full">
             <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold">All Transactions</h2>
               {/* Show message if no budget set and trying to view transactions */}
               {!hasExpenseBudgetsSet && isLoaded && monthlyIncome !== null && transactions.filter(t => t.type === 'expense').length === 0 ? (
                   <p className="text-center text-muted-foreground pt-10">Set expense budgets first to view or add expense transactions.</p>
               ) : transactions.length > 0 ? (
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
             {/* Enable Add Budget only if income is set */}
             {isLoaded && monthlyIncome !== null && (
                <Button size="sm" onClick={() => setIsAddBudgetDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
                </Button>
             )}
          </div>

           {/* Budget Summary Card */}
            {isLoaded && monthlyIncome !== null && (
                <Card className="mb-4 bg-primary/10 border-primary">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                           <Info className="h-5 w-5 text-primary" /> Allocation Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-primary-foreground flex flex-col gap-1">
                        <div className="flex justify-between text-primary">
                            <span>Total Allocated (% of Income):</span>
                            <span className="font-semibold">{totalAllocatedPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-primary">
                            <span>Total Allocated Budget ($):</span>
                            <span className="font-semibold">{formatCurrency(totalAllocatedBudgetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-accent">
                            <span>Allocated to Savings ($):</span>
                            <span className="font-semibold">{formatCurrency(savingsBudgetAmount)}</span>
                        </div>
                         {(totalAllocatedPercentage > 100) && (
                            <p className="text-xs text-destructive font-semibold mt-1">Warning: Total allocation exceeds 100%!</p>
                         )}
                          {!hasExpenseBudgetsSet && (
                              <p className="text-xs text-primary/80 mt-1">Add budgets for expense categories to start tracking.</p>
                          )}
                    </CardContent>
                </Card>
            )}


          {!isLoaded ? (
              <p className="text-center text-muted-foreground pt-10">Loading...</p>
          ) : monthlyIncome === null ? (
             <Card className="border-dashed border-muted-foreground">
                 <CardContent className="p-6 text-center text-muted-foreground">
                     <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>Please set your monthly income on the Dashboard tab before creating budgets.</p>
                 </CardContent>
             </Card>
           ) : currentMonthBudgets.length > 0 ? (
              // Sort budgets: Savings last, others alphabetically
             [...currentMonthBudgets] // Create a copy before sorting
                .sort((a, b) => {
                    if (a.category === 'savings') return 1;
                    if (b.category === 'savings') return -1;
                    return (getCategoryById(a.category)?.label ?? a.category)
                           .localeCompare(getCategoryById(b.category)?.label ?? b.category);
                })
                .map((budget) => (
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

              {/* Display Savings Summary */}
             {isLoaded && monthlyIncome !== null && hasExpenseBudgetsSet && (
                <Card className="mb-4 bg-accent/10 border-accent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <PiggyBank className="h-5 w-5 text-accent"/> Savings & Goals Allocation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-accent flex flex-col gap-1">
                         <div className="flex justify-between">
                            <span>Monthly Savings Budget:</span>
                            <span className="font-semibold">{formatCurrency(savingsBudgetAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Allocated to Goals (% of Savings):</span>
                             <span className="font-semibold">
                                {savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0).toFixed(1)}%
                             </span>
                        </div>
                         <div className="flex justify-between">
                            <span>Allocated to Goals ($):</span>
                             <span className="font-semibold">
                                {formatCurrency(savingsBudgetAmount * (savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0) / 100))}
                             </span>
                        </div>
                         {savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0) > 100 && (
                             <p className="text-xs text-destructive font-semibold mt-1">Warning: Goal allocation exceeds 100% of savings budget!</p>
                         )}
                          {savingsBudgetAmount <= 0 && (
                             <p className="text-xs text-accent/80 mt-1">Increase your Savings budget (by reducing expense budgets) on the Budgets tab to allocate funds to goals.</p>
                          )}
                           {!hasExpenseBudgetsSet && (
                               <p className="text-xs text-accent/80 mt-1">Set expense budgets first to determine savings amount.</p>
                           )}
                    </CardContent>
                </Card>
            )}


            {/* Display Saving Goals summary */}
            {isLoaded && savingGoals.length > 0 ? (
                 savingGoals.map(goal => {
                     // Calculate contribution based on the current month's savings budget limit
                     const monthlyContribution = savingsBudgetAmount > 0 && goal.percentageAllocation
                         ? (goal.percentageAllocation / 100) * savingsBudgetAmount
                         : 0;
                     const progressPercent = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
                     return (
                        <Card key={goal.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{goal.name}</CardTitle>
                                {goal.description && <CardDescription className="text-xs">{goal.description}</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                    <span>{progressPercent.toFixed(1)}%</span>
                                </div>
                                <Progress value={progressPercent} className="w-full h-2 [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent" />
                                {/* Show allocation info if applicable */}
                                {goal.percentageAllocation && goal.percentageAllocation > 0 && isLoaded && hasExpenseBudgetsSet && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Receives {goal.percentageAllocation}% of Savings
                                        {savingsBudgetAmount > 0 ? ` (${formatCurrency(monthlyContribution)}/month)` : ' ($0/month)'}
                                    </p>
                                )}
                                 {goal.targetDate && (
                                     <p className="text-xs text-muted-foreground mt-1">Target: {format(goal.targetDate, 'MMM yyyy')}</p>
                                 )}
                            </CardContent>
                        </Card>
                     );
                 })
            ) : (
                 isLoaded && <p className="text-center text-muted-foreground pt-10">No saving goals set yet. Go to 'Manage Goals' to create some.</p>
            )}

             {/* E-Learning Link */}
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

        {/* Floating Action Button (Show only if loaded, income set, AND expense budgets exist) */}
        {isLoaded && monthlyIncome !== null && hasExpenseBudgetsSet && (
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
        // Pass only categories relevant for selection (exclude parents, include income sources)
        categoriesForSelect={[...incomeCategories, ...spendingCategoriesForSelect]}
        canAddExpense={hasExpenseBudgetsSet} // Pass flag to enable/disable expense option
      />
       <AddBudgetDialog
        open={isAddBudgetDialogOpen}
        onOpenChange={setIsAddBudgetDialogOpen}
        onAddBudget={handleAddBudget}
        // Pass IDs of categories that *already* have a non-savings budget this month
        existingBudgetCategoryIds={currentMonthBudgets.filter(b => b.category !== 'savings').map(b => b.category)}
        // Pass available *spending* categories for selection (excluding parents)
        availableSpendingCategories={spendingCategoriesForSelect}
        monthlyIncome={monthlyIncome} // Pass income for calculations
        // Pass total percentage allocated to *expense* categories
        totalAllocatedPercentage={totalAllocatedPercentage}
      />
    </div>
  );
}

