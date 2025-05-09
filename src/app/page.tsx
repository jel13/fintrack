
"use client";

import * as React from "react";
import { PlusCircle, LayoutDashboard, List, Target, TrendingUp, PiggyBank, Settings, BookOpen, AlertCircle, Info, Wallet, BarChart3, Activity, UserCircle, Home as HomeIcon } from "lucide-react"; // Added HomeIcon
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
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryIconComponent } from '@/components/category-icon';
import { Progress } from "@/components/ui/progress";
import { InsightsView } from "@/components/insights-view";
import { Skeleton } from "@/components/ui/skeleton";


export default function Home() {
  const [appData, setAppData] = React.useState<AppData>(defaultAppData);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);
  const [tempIncome, setTempIncome] = React.useState<string>('');
  const [selectedIncomeCategory, setSelectedIncomeCategory] = React.useState<string>('');
  const { toast } = useToast();
  const pathname = usePathname();

  const currentMonth = format(new Date(), 'yyyy-MM');
  const previousMonthDate = new Date(currentMonth + '-01T00:00:00');
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = format(previousMonthDate, 'yyyy-MM');

  React.useEffect(() => {
    const loadedData = loadAppData();
    setAppData(loadedData);
    setTempIncome(loadedData.monthlyIncome?.toString() ?? '');
    setIsLoaded(true);
  }, []);

  React.useEffect(() => {
    if (isLoaded) {
      saveAppData(appData);
    }
  }, [appData, isLoaded]);

  const { monthlyIncome, transactions, budgets, categories, savingGoals } = appData;

  const monthlySummary = React.useMemo(() => {
    if (!isLoaded) return { income: 0, expenses: 0, balance: 0, incomeTransactions: 0 };
    const currentMonthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth);

    const incomeFromTransactionsThisMonth = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    // Use the set monthlyIncome as the primary income source for budget calculations
    // but also track actual income transactions for the balance.
    const effectiveIncome = monthlyIncome ?? 0;
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Balance should reflect actual cash flow: income transactions - expense transactions
    const actualBalance = incomeFromTransactionsThisMonth - expenses;

    return { income: effectiveIncome, expenses, balance: actualBalance, incomeTransactions: incomeFromTransactionsThisMonth };
  }, [transactions, monthlyIncome, currentMonth, isLoaded]);

  const incomeCategories = React.useMemo(() => categories.filter(cat => cat.isIncomeSource), [categories]);
  const expenseCategories = React.useMemo(() => categories.filter(cat => !cat.isIncomeSource && cat.id !== 'savings'), [categories]);

  const spendingCategoriesForSelect = React.useMemo(() => {
     return expenseCategories.filter(cat => cat.id !== 'savings');
   }, [expenseCategories]);

  const currentMonthBudgets = React.useMemo(() => {
      return budgets.filter(b => b.month === currentMonth);
  }, [budgets, currentMonth]);

  React.useEffect(() => {
    if (!isLoaded || monthlyIncome === null) return;

     setAppData(prevData => {
         let budgetsChanged = false;
         const currentMonthlyIncome = prevData.monthlyIncome ?? 0;

         const updatedBudgets = prevData.budgets.map(budget => {
              let changed = false;
              const spent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === budget.category && format(t.date, 'yyyy-MM') === (budget.month || currentMonth))
                 .reduce((sum, t) => sum + t.amount, 0);

              if (budget.spent !== spent) changed = true;

             let limit = budget.limit;
             if (budget.category !== 'savings' && budget.percentage !== undefined) {
                 const newLimit = parseFloat(((budget.percentage / 100) * currentMonthlyIncome).toFixed(2));
                  if (budget.limit !== newLimit) {
                     limit = newLimit;
                     changed = true;
                 }
             }

             if (changed) budgetsChanged = true;
             return { ...budget, spent, limit, month: budget.month || currentMonth };
         });

        const savingsBudgetIndex = updatedBudgets.findIndex(b => b.category === 'savings' && b.month === currentMonth);
        const totalBudgetedExcludingSavings = updatedBudgets
            .filter(b => b.category !== 'savings' && b.month === currentMonth)
            .reduce((sum, b) => sum + b.limit, 0);

        const leftover = Math.max(0, currentMonthlyIncome - totalBudgetedExcludingSavings);

        if (savingsBudgetIndex > -1) {
            const savingsSpent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                 .reduce((sum, t) => sum + t.amount, 0);

            const currentSavingsBudget = updatedBudgets[savingsBudgetIndex];
            if (currentSavingsBudget.limit !== leftover || currentSavingsBudget.spent !== savingsSpent) {
                updatedBudgets[savingsBudgetIndex] = {
                    ...currentSavingsBudget,
                    limit: leftover,
                    spent: savingsSpent,
                    percentage: undefined
                };
                budgetsChanged = true;
            }

        } else if (currentMonthlyIncome > 0) {
             const savingsSpent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                 .reduce((sum, t) => sum + t.amount, 0);
             updatedBudgets.push({
                id: `b-savings-${Date.now().toString()}`,
                category: 'savings',
                limit: leftover,
                percentage: undefined,
                spent: savingsSpent,
                month: currentMonth,
            });
            budgetsChanged = true;
        }

        if (budgetsChanged) {
             updatedBudgets.sort((a, b) => {
                 if (a.category === 'savings') return 1;
                 if (b.category === 'savings') return -1;
                 const labelA = prevData.categories.find(c => c.id === a.category)?.label ?? a.category;
                 const labelB = prevData.categories.find(c => c.id === b.category)?.label ?? b.category;
                 return labelA.localeCompare(labelB);
             });
             return { ...prevData, budgets: updatedBudgets };
        }
        return prevData;

     });
  }, [transactions, monthlyIncome, currentMonth, isLoaded, categories]);


  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    if (newTransaction.type === 'expense') {
      const categoryBudgetExists = currentMonthBudgets.some(b => b.category === newTransaction.category);
      if (!categoryBudgetExists && newTransaction.category !== 'savings') {
        toast({
          title: "Budget Required",
          description: `Please set a budget for '${getCategoryById(newTransaction.category)?.label ?? newTransaction.category}' before adding expenses.`,
          variant: "destructive"
        });
        return;
      }
    }

    const transactionWithId: Transaction = {
      ...newTransaction,
      id: `tx-${Date.now().toString()}`,
    };

    setAppData(prev => {
        const updatedTransactions = [transactionWithId, ...prev.transactions].sort((a, b) => b.date.getTime() - a.date.getTime());

        let updatedMonthlyIncome = prev.monthlyIncome;
        // If this new transaction is an income transaction and matches the *selectedIncomeCategory*
        // for the initial monthly income setup, update monthlyIncome.
        // This logic might need refinement if users can log multiple "main" income sources
        // or if 'monthlyIncome' represents something other than a single main income stream.
        // For now, let's assume 'monthlyIncome' reflects the primary source value.
        if (newTransaction.type === 'income' && newTransaction.category === prev.categories.find(c => c.isIncomeSource && c.label === 'Salary')?.id /* Example, adjust if needed */ ) {
            // This part is tricky. If monthlyIncome is a manually set budget,
            // should individual income transactions automatically update it?
            // For simplicity now, individual income transactions will affect the *balance*
            // but 'monthlyIncome' for budgeting purposes remains as set by the user.
            // If 'monthlyIncome' should be dynamic based on all income transactions:
            // updatedMonthlyIncome = updatedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        }

        return {
            ...prev,
            transactions: updatedTransactions,
            monthlyIncome: updatedMonthlyIncome,
        };
    });
    toast({
        title: "Transaction added",
        description: `${newTransaction.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(newTransaction.amount)} logged for ${getCategoryById(newTransaction.category)?.label ?? newTransaction.category}.`
    });
  };

 const handleAddBudget = (newBudget: Omit<Budget, 'id' | 'spent' | 'month' | 'limit'>) => {
    const currentMonthlyIncome = appData.monthlyIncome ?? 0;

    const calculatedLimit = newBudget.percentage !== undefined && currentMonthlyIncome > 0
        ? parseFloat(((newBudget.percentage / 100) * currentMonthlyIncome).toFixed(2))
        : 0;

     if (newBudget.percentage === undefined || newBudget.percentage <=0) {
        toast({ title: "Invalid Budget", description: "Budget percentage must be a positive value.", variant: "destructive" });
        return;
     }

    const budgetWithDetails: Budget = {
        ...newBudget,
        id: `b-${newBudget.category}-${Date.now().toString()}`,
        spent: transactions
            .filter(t => t.type === 'expense' && t.category === newBudget.category && format(t.date, 'yyyy-MM') === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0),
        month: currentMonth,
        limit: calculatedLimit,
        percentage: newBudget.percentage,
    };

    const needsCategoryIds = appData.categories.filter(c =>
        !c.isIncomeSource && (
        c.label.toLowerCase().includes('housing') ||
        c.label.toLowerCase().includes('groceries') ||
        c.label.toLowerCase().includes('transport') ||
        c.label.toLowerCase().includes('bill'))
    ).map(c => c.id);

    const currentTotalNeedsPercentage = currentMonthBudgets
        .filter(b => needsCategoryIds.includes(b.category) && b.category !== newBudget.category)
        .reduce((sum, b) => sum + (b.percentage ?? 0), 0)
        + (needsCategoryIds.includes(newBudget.category) ? (newBudget.percentage ?? 0) : 0);

    if (currentTotalNeedsPercentage > 50) {
         toast({
            title: "Budget Reminder",
            description: `Your 'Needs' categories now represent ${currentTotalNeedsPercentage.toFixed(1)}% of your income, exceeding the recommended 50%. Consider reviewing your allocations.`,
            variant: "default",
            duration: 7000,
         });
    }

    setAppData(prev => {
        const existingBudgetIndex = prev.budgets.findIndex(b => b.category === newBudget.category && b.month === currentMonth);
        let updatedBudgets;
        if (existingBudgetIndex > -1) {
            updatedBudgets = [...prev.budgets];
            updatedBudgets[existingBudgetIndex] = budgetWithDetails;
        } else {
            updatedBudgets = [...prev.budgets, budgetWithDetails];
        }

        updatedBudgets.sort((a, b) => {
             if (a.category === 'savings') return 1;
             if (b.category === 'savings') return -1;
             const labelA = getCategoryById(a.category)?.label ?? a.category;
             const labelB = getCategoryById(b.category)?.label ?? b.category;
             return labelA.localeCompare(labelB);
         });

        return { ...prev, budgets: updatedBudgets };
    });
    toast({ title: "Budget Set", description: `Budget for ${getCategoryById(newBudget.category)?.label ?? newBudget.category} set to ${newBudget.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(budgetWithDetails.limit)}).` });
};

 const handleSetIncome = () => {
    const incomeValue = parseFloat(tempIncome);
    if (isNaN(incomeValue) || incomeValue <= 0) {
        toast({ title: "Invalid Income", description: "Please enter a valid positive number for income.", variant: "destructive" });
        return;
    }
    if (!selectedIncomeCategory) {
         toast({ title: "Select Income Source", description: "Please select an income source category.", variant: "destructive" });
         return;
    }

     const incomeTransaction: Omit<Transaction, 'id'> = {
         type: 'income',
         amount: incomeValue,
         category: selectedIncomeCategory,
         date: new Date(),
         description: `Initial monthly income set via Home screen`,
         receiptDataUrl: undefined,
     };

     setAppData(prev => {
            // The `monthlyIncome` field should be the single source of truth for the budgeted income.
            const newTotalIncome = incomeValue;

            // When new income is set, update budget limits based on *fixed percentages*.
            const updatedBudgets = prev.budgets.map(budget => {
                let newLimit = budget.limit;
                // Only recalculate for budgets with a defined percentage (i.e., not 'savings')
                if (budget.category !== 'savings' && budget.percentage !== undefined && budget.percentage > 0) {
                    newLimit = parseFloat(((budget.percentage / 100) * newTotalIncome).toFixed(2));
                }
                return { ...budget, limit: newLimit };
            });

            // Add the initial income setting as a transaction for record-keeping
            const transactionWithId: Transaction = { ...incomeTransaction, id: `initial-inc-${Date.now()}` };
            const updatedTransactions = [transactionWithId, ...prev.transactions]
                .sort((a, b) => b.date.getTime() - a.date.getTime());

            return {
                ...prev,
                monthlyIncome: newTotalIncome,
                budgets: updatedBudgets,
                transactions: updatedTransactions
            };
       });

      toast({ title: "Income Updated", description: `Monthly income set to ${formatCurrency(incomeValue)}. Budgets using percentages will update.` });
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

  const totalAllocatedPercentage = React.useMemo(() => {
     return currentMonthBudgets
         .filter(b => b.category !== 'savings' && b.percentage !== undefined)
         .reduce((sum, b) => sum + (b.percentage ?? 0), 0);
  }, [currentMonthBudgets]);

  const totalAllocatedBudgetAmount = React.useMemo(() => {
      return currentMonthBudgets
          .filter(b => b.category !== 'savings')
          .reduce((sum, b) => sum + b.limit, 0);
  }, [currentMonthBudgets]);

  const savingsBudgetAmount = React.useMemo(() => {
      const savings = currentMonthBudgets.find(b => b.category === 'savings');
      return savings?.limit ?? 0;
  }, [currentMonthBudgets]);

  const hasExpenseBudgetsSet = React.useMemo(() => {
    return currentMonthBudgets.some(b => b.category !== 'savings' && b.limit > 0 && b.percentage !== undefined && b.percentage > 0);
  }, [currentMonthBudgets]);


    if (!isLoaded) {
        return (
            <div className="flex flex-col h-screen p-4 bg-background items-center justify-center">
                 <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-muted-foreground">Loading your financial data...</p>
            </div>
        );
    }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Tabs defaultValue="home" className="flex-grow flex flex-col">
        <TabsContent value="home" className="flex-grow overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-primary">Home</h1>
                {/* Profile Link was here, moved to bottom nav */}
            </div>

            {monthlyIncome === null || monthlyIncome === 0 ? (
              <Card className="border-primary border-2 shadow-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Wallet className="text-primary h-5 w-5"/> Set Your Monthly Income</CardTitle>
                  <CardDescription>Estimate your total income for the month and select the primary source. This will be the basis for your budgeting.</CardDescription>
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
                                <SelectTrigger id="income-category" className="truncate">
                                    <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {incomeCategories.length > 0 ? (
                                        incomeCategories.map((cat) => {
                                            const Icon = getCategoryIconComponent(cat.icon);
                                            return (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                    <span>{cat.label}</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })
                                    ) : (
                                         <SelectItem value="no-income-cats" disabled>
                                            Define income categories first
                                         </SelectItem>
                                    )}
                                </SelectContent>
                             </Select>
                         </div>
                   </div>
                   <Button onClick={handleSetIncome} className="w-full">Set Monthly Income</Button>
                   {incomeCategories.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">No income source categories found. Please add some in 'Manage Categories' via the Profile page.</p>
                   )}
                </CardContent>
              </Card>
            ) : null}

             {monthlyIncome !== null && monthlyIncome > 0 && (
                <>
                 <div className="grid gap-4 grid-cols-2 animate-slide-up">
                    <Card className="transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.02]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(monthlySummary.income)}</div>
                        <p className="text-xs text-muted-foreground">This month's budgeted total</p>
                    </CardContent>
                    </Card>
                    <Card className="transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.02]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses Logged</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {hasExpenseBudgetsSet ? (
                            <div className="text-2xl font-bold">{formatCurrency(monthlySummary.expenses)}</div>
                         ) : (
                             <Skeleton className="h-8 w-24" />
                         )}
                         <p className="text-xs text-muted-foreground">{hasExpenseBudgetsSet ? "This month" : "Set budgets first"}</p>
                    </CardContent>
                    </Card>
                </div>
                <Card className="animate-slide-up transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.02]" style={{"animationDelay": "0.1s"}}>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Actual Balance</CardTitle>
                    <CardDescription>Actual income transactions minus logged expenses this month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{formatCurrency(monthlySummary.balance)}</div>
                       <p className="text-xs text-muted-foreground">Logged Income: {formatCurrency(monthlySummary.incomeTransactions)}</p>
                    </CardContent>
                </Card>
                </>
             )}


          {monthlyIncome !== null && monthlyIncome > 0 && hasExpenseBudgetsSet && (
             <div className="animate-slide-up" style={{"animationDelay": "0.2s"}}>
                 <SpendingChart transactions={transactions} month={currentMonth} categories={categories} />
             </div>
           )}

          {monthlyIncome !== null && monthlyIncome > 0 && (
            <Card className="animate-slide-up transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.02]" style={{"animationDelay": "0.3s"}}>
                <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                 <CardDescription>Your latest financial activity.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    {transactions.slice(0, 5).map((t) => (
                        <TransactionListItem key={t.id} transaction={t} categories={categories} />
                    ))}
                    {transactions.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                             <List className="mx-auto h-8 w-8 mb-2" />
                            No transactions yet. Use the '+' button to add one!
                        </div>
                    )}
                </ScrollArea>
                 {transactions.length > 5 && (
                     <div className="p-2 text-center border-t">
                        <Link href="#" onClick={(e) => { e.preventDefault(); document.querySelector('button[value="transactions"]')?.click(); }}>
                             <Button variant="link" size="sm">View All History</Button>
                        </Link>
                     </div>
                )}
                </CardContent>
            </Card>
          )}
           {!hasExpenseBudgetsSet && monthlyIncome !== null && monthlyIncome > 0 && (
                <Card className="border-dashed border-muted-foreground animate-fade-in bg-secondary/30">
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                        <p className="font-semibold">Ready to Budget?</p>
                        <p className="text-sm">Head over to the 'Budgets' tab to allocate your income and start tracking your spending effectively.</p>
                         <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>
                             Go to Budgets
                        </Button>
                    </CardContent>
                </Card>
           )}
           {(monthlyIncome === null || monthlyIncome === 0) && isLoaded && (
                <Card className="border-dashed border-muted-foreground animate-fade-in bg-destructive/10">
                    <CardContent className="p-6 text-center text-muted-foreground">
                         <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                         <p className="font-semibold">Set Your Income</p>
                        <p className="text-sm">Please set your estimated monthly income above to unlock budgeting and tracking features.</p>
                    </CardContent>
                </Card>
           )}
             <Card className="animate-slide-up transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.01]" style={{"animationDelay": `${(savingGoals.length + 1) * 0.05}s`}}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/> Financial Planning Tips</CardTitle>
                     <CardDescription className="text-xs">Learn more about managing your money.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/learn/budgeting-guide" passHref legacyBehavior>
                        <Button asChild variant="link" className="p-0 h-auto">
                           <a>How to Budget Guide</a>
                        </Button>
                    </Link>
                </CardContent>
             </Card>
        </TabsContent>

        <TabsContent value="transactions" className="flex-grow overflow-y-auto p-0">
           <ScrollArea className="h-full">
             <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold mb-2">All Transactions</h2>
               {transactions.length === 0 && monthlyIncome === null && (
                     <Card className="border-dashed border-muted-foreground bg-destructive/10">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                            <p className="font-semibold">Set Income First</p>
                            <p className="text-sm">Please set your income on the Home screen to log transactions.</p>
                            <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="home"]')?.click()}>Go to Home</Button>
                        </CardContent>
                     </Card>
               )}
               {transactions.length === 0 && monthlyIncome !== null && !hasExpenseBudgetsSet && (
                    <Card className="border-dashed border-muted-foreground bg-secondary/30">
                         <CardContent className="p-6 text-center text-muted-foreground">
                            <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                             <p className="font-semibold">Set Budgets to Log Expenses</p>
                            <p className="text-sm">You can log income now. To log expenses, set budgets in the 'Budgets' tab.</p>
                            <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>Go to Budgets</Button>
                         </CardContent>
                    </Card>
               )}
               {transactions.length > 0 ? (
                   transactions.map((t) => (
                    <TransactionListItem key={t.id} transaction={t} categories={categories} />
                   ))
                ) : (
                    monthlyIncome !== null && hasExpenseBudgetsSet && (
                        <div className="p-4 text-center text-muted-foreground pt-10">
                            <List className="mx-auto h-8 w-8 mb-2" />
                           No transactions recorded yet.
                        </div>
                    )
                )}
             </div>
           </ScrollArea>
        </TabsContent>

        <TabsContent value="budgets" className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-semibold">Monthly Budgets</h2>
             <div className="flex gap-2">
                 <Link href="/saving-goals" passHref legacyBehavior>
                      <Button asChild variant="outline" size="sm">
                        <a><PiggyBank className="h-4 w-4" /> Manage Goals</a>
                      </Button>
                  </Link>
                 {monthlyIncome !== null && monthlyIncome > 0 && (
                    <Button size="sm" onClick={() => setIsAddBudgetDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
                    </Button>
                 )}
             </div>
          </div>

            {monthlyIncome !== null && monthlyIncome > 0 && (
                <Card className="mb-4 bg-primary/10 border-primary/30 animate-fade-in">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                           <Info className="h-5 w-5 text-primary" /> Allocation Summary ({format(new Date(currentMonth + '-01T00:00:00'), 'MMMM')})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                         <div className="flex justify-between text-primary col-span-2 border-b pb-1 mb-1 border-primary/20">
                             <span>Total Budgeted Income:</span>
                             <span className="font-semibold">{formatCurrency(monthlyIncome)}</span>
                         </div>
                        <div className="flex justify-between text-primary">
                            <span>Expenses Allocated (%):</span>
                            <span className="font-semibold">{totalAllocatedPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-primary">
                            <span>Expenses Allocated ($):</span>
                            <span className="font-semibold">{formatCurrency(totalAllocatedBudgetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-accent">
                            <span>Available for Savings (%):</span>
                             <span className="font-semibold">{(100 - totalAllocatedPercentage).toFixed(1)}%</span>
                        </div>
                         <div className="flex justify-between text-accent">
                            <span>Available for Savings ($):</span>
                            <span className="font-semibold">{formatCurrency(savingsBudgetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-primary col-span-2 pt-1 mt-1 border-t border-primary/20">
                            <span>Total Allocated Budget ($):</span>
                            <span className="font-semibold">{formatCurrency(totalAllocatedBudgetAmount + savingsBudgetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-foreground col-span-2">
                            <span>Remaining Unbudgeted ($):</span>
                             <span className="font-semibold">{formatCurrency(monthlyIncome - (totalAllocatedBudgetAmount + savingsBudgetAmount))}</span>
                        </div>


                         {(totalAllocatedPercentage > 100) && (
                            <p className="text-xs text-destructive font-semibold mt-1 col-span-2">Warning: Expense allocation exceeds 100%!</p>
                         )}
                          {!hasExpenseBudgetsSet && (
                              <p className="text-xs text-primary/80 mt-1 col-span-2">Add budgets for expense categories to start tracking.</p>
                          )}
                    </CardContent>
                </Card>
            )}


          {(monthlyIncome === null || monthlyIncome === 0) ? (
             <Card className="border-dashed border-muted-foreground animate-fade-in bg-destructive/10">
                 <CardContent className="p-6 text-center text-muted-foreground">
                     <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                      <p className="font-semibold">Set Your Income First</p>
                    <p className="text-sm">Please set your monthly income on the Home tab before creating budgets.</p>
                     <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="home"]')?.click()}>
                        Go to Home
                     </Button>
                 </CardContent>
             </Card>
           ) : currentMonthBudgets.length > 0 ? (
             [...currentMonthBudgets]
                .sort((a, b) => {
                    if (a.category === 'savings') return 1;
                    if (b.category === 'savings') return -1;
                    const labelA = getCategoryById(a.category)?.label ?? a.category;
                    const labelB = getCategoryById(b.category)?.label ?? b.category;
                    return labelA.localeCompare(labelB);
                })
                .map((budget, index) => (
                    <div key={budget.id} className="animate-slide-up" style={{"animationDelay": `${index * 0.05}s`}}>
                         <BudgetCard budget={budget} categories={categories} monthlyIncome={monthlyIncome} />
                    </div>
                 ))
           ) : (
                 <Card className="border-dashed border-muted-foreground animate-fade-in bg-secondary/30">
                     <CardContent className="p-6 text-center text-muted-foreground">
                        <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                        <p className="font-semibold">No Budgets Yet</p>
                        <p className="text-sm">Click 'Add Budget' above to allocate percentages of your income to different spending categories.</p>
                     </CardContent>
                 </Card>
           )}
        </TabsContent>

         <TabsContent value="insights" className="flex-grow overflow-y-auto p-4 space-y-4">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold">Financial Insights</h2>
             </div>
             {(monthlyIncome === null || monthlyIncome === 0) ? (
                  <Card className="border-dashed border-muted-foreground animate-fade-in bg-destructive/10">
                      <CardContent className="p-6 text-center text-muted-foreground">
                          <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                           <p className="font-semibold">Set Your Income First</p>
                         <p className="text-sm">Please set your monthly income on the Home tab to view insights.</p>
                          <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="home"]')?.click()}>
                             Go to Home
                          </Button>
                      </CardContent>
                  </Card>
             ) : !hasExpenseBudgetsSet ? (
                 <Card className="border-dashed border-muted-foreground animate-fade-in bg-secondary/30">
                      <CardContent className="p-6 text-center text-muted-foreground">
                         <BarChart3 className="mx-auto h-8 w-8 mb-2 text-primary" />
                          <p className="font-semibold">Set Budgets First</p>
                         <p className="text-sm">Set your budgets in the 'Budgets' tab to generate detailed spending insights.</p>
                         <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>
                             Go to Budgets
                        </Button>
                      </CardContent>
                  </Card>
             ) : (
                 <div className="animate-fade-in">
                    <InsightsView
                        currentMonth={currentMonth}
                        previousMonth={previousMonth}
                        transactions={transactions}
                        budgets={budgets}
                        categories={categories}
                        monthlyIncome={monthlyIncome}
                    />
                 </div>
             )}
         </TabsContent>


        {(monthlyIncome !== null && monthlyIncome > 0 && (incomeCategories.length > 0 || hasExpenseBudgetsSet)) && (
             <div className="fixed bottom-20 right-4 z-10 animate-bounce-in">
                <Button
                    size="icon"
                    className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 active:scale-95 transition-transform"
                    onClick={() => setIsAddTransactionSheetOpen(true)}
                    aria-label="Add Transaction"
                >
                    <PlusCircle className="h-6 w-6" />
                </Button>
             </div>
        )}


        <TabsList className="grid w-full grid-cols-5 h-16 rounded-none sticky bottom-0 bg-background border-t shadow-[0_-2px_5px_-1px_rgba(0,0,0,0.1)]">
          <TabsTrigger value="home" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <HomeIcon className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <List className="h-5 w-5" />
             <span className="text-xs">History</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Target className="h-5 w-5" />
             <span className="text-xs">Budgets</span>
          </TabsTrigger>
           <TabsTrigger value="insights" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Activity className="h-5 w-5" />
             <span className="text-xs">Insights</span>
          </TabsTrigger>
          <Link
            href="/profile"
            className={cn(
              "flex flex-col items-center justify-center h-full gap-1 rounded-none text-muted-foreground hover:text-primary",
              pathname === "/profile"
                ? "border-t-2 border-primary bg-primary/10 text-primary"
                : "border-t-2 border-transparent"
            )}
          >
            <UserCircle className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Link>
        </TabsList>
      </Tabs>

      <AddTransactionSheet
        open={isAddTransactionSheetOpen}
        onOpenChange={setIsAddTransactionSheetOpen}
        onAddTransaction={handleAddTransaction}
        categoriesForSelect={[...incomeCategories, ...spendingCategoriesForSelect]}
        canAddExpense={hasExpenseBudgetsSet}
        currentMonthBudgetCategoryIds={currentMonthBudgets.filter(b => b.category !== 'savings').map(b => b.category)}
      />
       <AddBudgetDialog
        open={isAddBudgetDialogOpen}
        onOpenChange={setIsAddBudgetDialogOpen}
        onAddBudget={handleAddBudget}
        existingBudgetCategoryIds={currentMonthBudgets.filter(b => b.category !== 'savings').map(b => b.category)}
        availableSpendingCategories={expenseCategories.filter(cat => cat.id !== 'savings')}
        monthlyIncome={monthlyIncome}
        totalAllocatedPercentage={totalAllocatedPercentage}
      />
    </div>
  );
}
