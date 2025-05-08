"use client";

import * as React from "react";
import { PlusCircle, LayoutDashboard, List, Target, TrendingDown, TrendingUp, PiggyBank, Settings, BookOpen, AlertCircle, Info, Wallet, BarChart3, Activity } from "lucide-react"; // Added BarChart3/Activity for Insights
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
import { InsightsView } from "@/components/insights-view"; // Import InsightsView
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state


export default function Home() {
  const [appData, setAppData] = React.useState<AppData>(defaultAppData);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);
  const [tempIncome, setTempIncome] = React.useState<string>(''); // Initialize empty
  const [selectedIncomeCategory, setSelectedIncomeCategory] = React.useState<string>(''); // Default income category selection - empty initially
  const { toast } = useToast();

  const currentMonth = format(new Date(), 'yyyy-MM');
  // Calculate previous month string
   const previousMonthDate = new Date(currentMonth + '-01T00:00:00'); // Ensure time part for correct month calculation
   previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
   const previousMonth = format(previousMonthDate, 'yyyy-MM');


  // Load data from localStorage only on the client after initial mount
  React.useEffect(() => {
    const loadedData = loadAppData();
    setAppData(loadedData);
    setTempIncome(loadedData.monthlyIncome?.toString() ?? ''); // Update tempIncome after loading
    // Pre-select the first income category if none is stored/selected (improved UX)
    const firstIncomeCat = loadedData.categories.find(c => c.isIncomeSource)?.id ?? '';
    setSelectedIncomeCategory(firstIncomeCat);
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
    if (!isLoaded) return { income: 0, expenses: 0, balance: 0, incomeTransactions: 0 };
    const currentMonthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth);
    const incomeTransactions = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    // Use monthlyIncome as the primary source of truth for total income
    const effectiveIncome = monthlyIncome ?? 0;
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = effectiveIncome - expenses; // Balance based on set income vs logged expenses
    return { income: effectiveIncome, expenses, balance, incomeTransactions };
  }, [transactions, monthlyIncome, currentMonth, isLoaded]);

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
         let budgetsChanged = false; // Flag to track if budgets actually change

         const updatedBudgets = prevData.budgets.map(budget => {
              let changed = false;
              // Recalculate spent for all budgets based on current transactions
              const spent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === budget.category && format(t.date, 'yyyy-MM') === (budget.month || currentMonth)) // Use budget month or current month
                 .reduce((sum, t) => sum + t.amount, 0);

              if (budget.spent !== spent) changed = true;


             // Recalculate limit based on percentage if applicable (excluding Savings)
             let limit = budget.limit;
             if (budget.category !== 'savings' && budget.percentage !== undefined && prevData.monthlyIncome !== null) {
                 const newLimit = parseFloat(((budget.percentage / 100) * prevData.monthlyIncome).toFixed(2));
                  if (budget.limit !== newLimit) {
                     limit = newLimit;
                     changed = true;
                 }
             }

             if (changed) budgetsChanged = true;
             // Ensure budget always has a month, defaulting to current if somehow missing
             return { ...budget, spent, limit, month: budget.month || currentMonth };
         });

        // Auto-calculate and update the Savings budget limit FOR THE CURRENT MONTH
        const savingsBudgetIndex = updatedBudgets.findIndex(b => b.category === 'savings' && b.month === currentMonth);
        const totalBudgetedExcludingSavings = updatedBudgets
            .filter(b => b.category !== 'savings' && b.month === currentMonth) // Only consider current month budgets
            .reduce((sum, b) => sum + b.limit, 0); // Use the potentially recalculated limits

        const leftover = Math.max(0, (prevData.monthlyIncome ?? 0) - totalBudgetedExcludingSavings); // Leftover for savings

        if (savingsBudgetIndex > -1) {
            // Update existing savings budget limit and spent amount
            const savingsSpent = prevData.transactions
                 .filter(t => t.type === 'expense' && t.category === 'savings' && format(t.date, 'yyyy-MM') === currentMonth)
                 .reduce((sum, t) => sum + t.amount, 0);

            const currentSavingsBudget = updatedBudgets[savingsBudgetIndex];
            if (currentSavingsBudget.limit !== leftover || currentSavingsBudget.spent !== savingsSpent) {
                updatedBudgets[savingsBudgetIndex] = {
                    ...currentSavingsBudget,
                    limit: leftover,
                    spent: savingsSpent, // Recalculate spent for savings too
                    percentage: undefined // Savings percentage is implicit
                };
                budgetsChanged = true;
            }

        } else if (prevData.monthlyIncome !== null) { // Only add savings if income is set
            // Add new savings budget if it doesn't exist FOR THE CURRENT MONTH
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
            budgetsChanged = true;
        }

        // Only return updated data if budgets actually changed to prevent infinite loops
        if (budgetsChanged) {
             // Sort budgets after potential changes
             updatedBudgets.sort((a, b) => {
                 if (a.category === 'savings') return 1; // Savings last
                 if (b.category === 'savings') return -1;
                 // Handle potential case where category doesn't exist (shouldn't happen ideally)
                 const labelA = prevData.categories.find(c => c.id === a.category)?.label ?? a.category;
                 const labelB = prevData.categories.find(c => c.id === b.category)?.label ?? b.category;
                 return labelA.localeCompare(labelB);
             });
             return { ...prevData, budgets: updatedBudgets };
        }
        return prevData; // No changes, return previous state

     });
  }, [transactions, monthlyIncome, currentMonth, isLoaded]); // Recalculate when these change


  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    // Basic validation: Check if adding an expense without a budget set for that category
    if (newTransaction.type === 'expense') {
      const budgetExists = currentMonthBudgets.some(b => b.category === newTransaction.category);
      if (!budgetExists && newTransaction.category !== 'savings') { // Allow savings pseudo-transactions
        toast({ title: "Budget Required", description: `Please set a budget for '${getCategoryById(newTransaction.category)?.label ?? newTransaction.category}' before adding expenses.`, variant: "destructive" });
        return;
      }
    }

    const transactionWithId: Transaction = {
      ...newTransaction,
      id: `tx-${Date.now().toString()}`, // Simple unique ID generation
    };
    setAppData(prev => ({
        ...prev,
        transactions: [transactionWithId, ...prev.transactions].sort((a, b) => b.date.getTime() - a.date.getTime()),
    }));
    toast({ title: "Transaction added", description: `${newTransaction.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(newTransaction.amount)} logged for ${getCategoryById(newTransaction.category)?.label ?? newTransaction.category}.` });
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
     const needsCategoryIds = appData.categories.filter(c =>
        c.label.toLowerCase().includes('housing') ||
        c.label.toLowerCase().includes('groceries') ||
        c.label.toLowerCase().includes('transport') ||
        c.label.toLowerCase().includes('bill')
    ).map(c => c.id); // Define your needs categories IDs dynamically or statically

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
    if (isNaN(incomeValue) || incomeValue <= 0) { // Income must be positive
        toast({ title: "Invalid Income", description: "Please enter a valid positive number for income.", variant: "destructive" });
        return;
    }
    // Ensure an income category is selected
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
         description: `Monthly income set`, // Simplified description
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
      // setSelectedIncomeCategory(''); // Reset category selection to force selection next time
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


  // Loading State UI
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
      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <TabsContent value="dashboard" className="flex-grow overflow-y-auto p-4 space-y-4">
           {/* Set Income Card - Show if income is null */}
            {monthlyIncome === null ? (
              <Card className="border-primary border-2 shadow-lg animate-fade-in">
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
                                    {/* Display placeholder only if no category is selected */}
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
                                            No income categories defined
                                         </SelectItem>
                                    )}
                                </SelectContent>
                             </Select>
                         </div>
                   </div>
                   <Button onClick={handleSetIncome} className="w-full">Set Monthly Income</Button>
                </CardContent>
              </Card>
            ) : null}

            {/* Monthly Summary Cards (Show only if income is set) */}
             {monthlyIncome !== null && (
                <>
                 <div className="grid gap-4 grid-cols-2 animate-slide-up">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(monthlyIncome)}</div>
                        <p className="text-xs text-muted-foreground">Set for this month</p>
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
                             <Skeleton className="h-8 w-24" /> // Skeleton for loading feel
                         )}
                         <p className="text-xs text-muted-foreground">{hasExpenseBudgetsSet ? "This month" : "Set budgets first"}</p>
                    </CardContent>
                    </Card>
                </div>
                <Card className="animate-slide-up" style={{"animationDelay": "0.1s"}}>
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


          {/* Spending Chart (Show if income set, and expense budgets exist) */}
          {monthlyIncome !== null && hasExpenseBudgetsSet && (
             <div className="animate-slide-up" style={{"animationDelay": "0.2s"}}>
                 <SpendingChart transactions={transactions} month={currentMonth} categories={expenseCategories} />
             </div>
           )}

          {/* Recent Transactions (Show if income set) */}
          {monthlyIncome !== null && (
            <Card className="animate-slide-up" style={{"animationDelay": "0.3s"}}>
                <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                 <CardDescription>Your latest financial activity.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    {transactions.slice(0, 5).map((t) => ( // Show latest 5
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
                     <div className="p-2 text-center">
                        <Link href="#" onClick={(e) => { e.preventDefault(); document.querySelector('button[value="transactions"]')?.click(); }}>
                             <Button variant="link" size="sm">View All History</Button>
                        </Link>
                     </div>
                )}
                </CardContent>
            </Card>
          )}
           {!hasExpenseBudgetsSet && monthlyIncome !== null && (
                <Card className="border-dashed border-muted-foreground animate-fade-in">
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
           {monthlyIncome === null && (
                <Card className="border-dashed border-muted-foreground animate-fade-in">
                    <CardContent className="p-6 text-center text-muted-foreground">
                         <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                         <p className="font-semibold">Set Your Income</p>
                        <p className="text-sm">Please set your estimated monthly income above to unlock budgeting and tracking features.</p>
                    </CardContent>
                </Card>
           )}
        </TabsContent>

        <TabsContent value="transactions" className="flex-grow overflow-y-auto p-0">
           <ScrollArea className="h-full">
             <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold mb-2">All Transactions</h2>
               {/* Show message if no budget set and trying to view transactions */}
               {!hasExpenseBudgetsSet && monthlyIncome !== null && transactions.filter(t => t.type === 'expense').length === 0 ? (
                    <Card className="border-dashed border-muted-foreground">
                         <CardContent className="p-6 text-center text-muted-foreground">
                            <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                             <p className="font-semibold">Set Budgets First</p>
                            <p className="text-sm">You need to set budgets in the 'Budgets' tab before you can log or view expense transactions.</p>
                            <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>
                                Go to Budgets
                            </Button>
                         </CardContent>
                    </Card>
               ) : transactions.length > 0 ? (
                   transactions.map((t) => (
                    <TransactionListItem key={t.id} transaction={t} categories={categories} />
                   ))
                ) : (
                    <div className="p-4 text-center text-muted-foreground pt-10">
                        <List className="mx-auto h-8 w-8 mb-2" />
                       No transactions recorded yet.
                    </div>
                )}
             </div>
           </ScrollArea>
        </TabsContent>

        <TabsContent value="budgets" className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-semibold">Monthly Budgets</h2>
             {/* Enable Add Budget only if income is set */}
             {monthlyIncome !== null && (
                <Button size="sm" onClick={() => setIsAddBudgetDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
                </Button>
             )}
          </div>

           {/* Budget Summary Card */}
            {monthlyIncome !== null && (
                <Card className="mb-4 bg-primary/10 border-primary animate-fade-in">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                           <Info className="h-5 w-5 text-primary" /> Allocation Summary ({format(new Date(currentMonth + '-01T00:00:00'), 'MMMM')})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-primary-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                         <div className="flex justify-between text-primary col-span-2 border-b pb-1 mb-1 border-primary/20">
                             <span>Total Income:</span>
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
                             {/* Calculate savings percentage */}
                             <span className="font-semibold">{(100 - totalAllocatedPercentage).toFixed(1)}%</span>
                        </div>
                         <div className="flex justify-between text-accent">
                            <span>Available for Savings ($):</span>
                            <span className="font-semibold">{formatCurrency(savingsBudgetAmount)}</span>
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


          {monthlyIncome === null ? (
             <Card className="border-dashed border-muted-foreground animate-fade-in">
                 <CardContent className="p-6 text-center text-muted-foreground">
                     <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                      <p className="font-semibold">Set Your Income</p>
                    <p className="text-sm">Please set your monthly income on the Dashboard tab before creating budgets.</p>
                     <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="dashboard"]')?.click()}>
                        Go to Dashboard
                     </Button>
                 </CardContent>
             </Card>
           ) : currentMonthBudgets.length > 0 ? (
              // Sort budgets: Savings last, others alphabetically
             [...currentMonthBudgets] // Create a copy before sorting
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
                 <Card className="border-dashed border-muted-foreground animate-fade-in">
                     <CardContent className="p-6 text-center text-muted-foreground">
                        <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                        <p className="font-semibold">No Budgets Yet</p>
                        <p className="text-sm">Click 'Add Budget' above to allocate percentages of your income to different spending categories.</p>
                     </CardContent>
                 </Card>
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
             {monthlyIncome !== null && (
                <Card className="mb-4 bg-accent/10 border-accent animate-fade-in">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <PiggyBank className="h-5 w-5 text-accent"/> Savings & Goals Allocation
                        </CardTitle>
                         <CardDescription className="text-xs">
                            Your Savings budget is automatically calculated based on leftover income after expense budgets. Allocate percentages of this savings amount to your goals.
                         </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-accent grid grid-cols-2 gap-x-4 gap-y-1">
                         <div className="flex justify-between col-span-2 border-b pb-1 mb-1 border-accent/20">
                            <span>Monthly Savings Budget:</span>
                            <span className="font-semibold">{formatCurrency(savingsBudgetAmount)}</span>
                        </div>
                         {/* Show allocation only if savings budget > 0 */}
                         {savingsBudgetAmount > 0 && (
                             <>
                             <div className="flex justify-between">
                                <span>Allocated to Goals (%):</span>
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
                              <div className="flex justify-between text-accent/80">
                                <span>Unallocated Savings (%):</span>
                                <span className="font-semibold">
                                    {(100 - savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0)).toFixed(1)}%
                                </span>
                            </div>
                             <div className="flex justify-between text-accent/80">
                                <span>Unallocated Savings ($):</span>
                                 <span className="font-semibold">
                                    {formatCurrency(savingsBudgetAmount * (1 - (savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0) / 100)))}
                                 </span>
                            </div>
                             </>
                         )}
                         {savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0) > 100 && (
                             <p className="text-xs text-destructive font-semibold mt-1 col-span-2">Warning: Goal allocation exceeds 100% of savings budget!</p>
                         )}
                          {savingsBudgetAmount <= 0 && (
                             <p className="text-xs text-accent/80 mt-1 col-span-2">Your savings budget is currently $0. Manage goals, but funding requires reducing expense budgets.</p>
                          )}
                           {!hasExpenseBudgetsSet && monthlyIncome !== null && (
                               <p className="text-xs text-accent/80 mt-1 col-span-2">Set expense budgets first to determine your available savings.</p>
                           )}
                            {monthlyIncome === null && (
                               <p className="text-xs text-accent/80 mt-1 col-span-2">Set your income first to calculate savings.</p>
                           )}
                    </CardContent>
                </Card>
            )}


            {/* Display Saving Goals summary */}
            {savingGoals.length > 0 ? (
                 savingGoals.map((goal, index) => {
                     // Calculate contribution based on the current month's savings budget limit
                     const monthlyContribution = savingsBudgetAmount > 0 && goal.percentageAllocation
                         ? (goal.percentageAllocation / 100) * savingsBudgetAmount
                         : 0;
                     const progressPercent = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
                     return (
                         <div key={goal.id} className="animate-slide-up" style={{"animationDelay": `${index * 0.05}s`}}>
                            <Card>
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
                                    {goal.percentageAllocation && goal.percentageAllocation > 0 && savingsBudgetAmount > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Receives {goal.percentageAllocation}% of Savings ({formatCurrency(monthlyContribution)}/month)
                                        </p>
                                    )}
                                    {goal.percentageAllocation && goal.percentageAllocation > 0 && savingsBudgetAmount <= 0 && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                              Receives {goal.percentageAllocation}% of Savings ($0/month)
                                          </p>
                                    )}
                                     {goal.targetDate && (
                                         <p className="text-xs text-muted-foreground mt-1">Target: {format(goal.targetDate, 'MMM yyyy')}</p>
                                     )}
                                </CardContent>
                            </Card>
                         </div>
                     );
                 })
            ) : (
                  <Card className="border-dashed border-muted-foreground animate-fade-in">
                     <CardContent className="p-6 text-center text-muted-foreground">
                         <PiggyBank className="mx-auto h-8 w-8 mb-2 text-accent" />
                         <p className="font-semibold">No Saving Goals Yet</p>
                        <p className="text-sm">Go to 'Manage Goals' to create goals and allocate your savings towards them.</p>
                        <Link href="/saving-goals" passHref>
                            <Button size="sm" className="mt-3" variant="outline">Manage Goals</Button>
                        </Link>
                     </CardContent>
                  </Card>
            )}

             {/* E-Learning Link */}
             <Card className="animate-slide-up" style={{"animationDelay": `${(savingGoals.length + 1) * 0.05}s`}}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/> Financial Planning Tips</CardTitle>
                     <CardDescription className="text-xs">Learn more about managing your money.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/learn/budgeting-guide" passHref>
                        <Button variant="link" className="p-0 h-auto">How to Budget Guide</Button>
                    </Link>
                     {/* Add more links later */}
                </CardContent>
             </Card>
        </TabsContent>

         {/* Insights Tab */}
         <TabsContent value="insights" className="flex-grow overflow-y-auto p-4 space-y-4">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold">Financial Insights</h2>
                 {/* Optional actions like export? */}
             </div>
             {monthlyIncome === null ? (
                  <Card className="border-dashed border-muted-foreground animate-fade-in">
                      <CardContent className="p-6 text-center text-muted-foreground">
                          <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                           <p className="font-semibold">Set Your Income</p>
                         <p className="text-sm">Please set your monthly income on the Dashboard tab to view insights.</p>
                          <Button size="sm" className="mt-3" onClick={() => document.querySelector('button[value="dashboard"]')?.click()}>
                             Go to Dashboard
                          </Button>
                      </CardContent>
                  </Card>
             ) : !hasExpenseBudgetsSet ? (
                 <Card className="border-dashed border-muted-foreground animate-fade-in">
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
                        budgets={budgets} // Pass all budgets for potential cross-month comparison
                        categories={categories}
                        monthlyIncome={monthlyIncome}
                    />
                 </div>
             )}
         </TabsContent>


        {/* Floating Action Button (Show only if income set AND expense budgets exist) */}
        {monthlyIncome !== null && hasExpenseBudgetsSet && (
             <div className="fixed bottom-20 right-4 z-10 animate-bounce-in">
                <Button
                    size="icon"
                    className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
                    onClick={() => setIsAddTransactionSheetOpen(true)}
                    aria-label="Add Transaction"
                >
                    <PlusCircle className="h-6 w-6" />
                </Button>
             </div>
        )}


        {/* Bottom Navigation */}
        <TabsList className="grid w-full grid-cols-5 h-16 rounded-none sticky bottom-0 bg-background border-t shadow-[0_-2px_5px_-1px_rgba(0,0,0,0.1)]"> {/* Changed to grid-cols-5 */}
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
           <TabsTrigger value="insights" className="flex-col h-full gap-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"> {/* Added Insights Trigger */}
            <Activity className="h-5 w-5" /> {/* Using Activity icon */}
             <span className="text-xs">Insights</span>
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
        // Pass total percentage allocated to *other* expense categories
        totalAllocatedPercentage={totalAllocatedPercentage}
      />
    </div>
  );
}
