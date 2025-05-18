
"use client";

import * as React from "react";
import { PlusCircle, List, Target, PiggyBank, Settings, BookOpen, AlertCircle, Wallet, BarChart3, Activity, UserCircle, Home as HomeIcon, FolderCog, Edit, Trash2, TrendingUp } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";


export default function Home() {
  const { user } = useAuth();
  const [appData, setAppData] = React.useState<AppData>(defaultAppData);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);

  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = React.useState<Budget | null>(null);


  const [tempIncome, setTempIncome] = React.useState<string>('');
  const [selectedIncomeCategory, setSelectedIncomeCategory] = React.useState<string>('');
  const { toast } = useToast();
  const pathname = usePathname();

  const currentMonth = format(new Date(), 'yyyy-MM');
  const previousMonthDate = new Date();
  previousMonthDate.setDate(1); 
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = format(previousMonthDate, 'yyyy-MM');


  React.useEffect(() => {
    if (user) {
        const loadedData = loadAppData();
        setAppData(loadedData);
        setTempIncome(loadedData.monthlyIncome?.toString() ?? '');
        setIsLoaded(true);
    } else {
        setAppData(defaultAppData);
        setIsLoaded(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isLoaded && user) {
      saveAppData(appData);
    }
  }, [appData, isLoaded, user]);

  const { monthlyIncome, transactions, budgets, categories, savingGoals } = appData;

  const monthlySummary = React.useMemo(() => {
    if (!isLoaded) return { income: 0, expenses: 0, balance: 0, incomeTransactions: 0 };

    const currentMonthTransactions = transactions.filter(t => format(new Date(t.date), 'yyyy-MM') === currentMonth);

    const incomeFromTransactionsThisMonth = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const actualBalance = incomeFromTransactionsThisMonth - expenses;

    return {
        income: monthlyIncome ?? 0, 
        expenses,
        balance: actualBalance, 
        incomeTransactions: incomeFromTransactionsThisMonth 
    };
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
    if (!isLoaded || !user) return; 

    setAppData(prevData => {
        let budgetsChanged = false;
        const currentSetMonthlyIncome = prevData.monthlyIncome ?? 0;

        const updatedBudgets = prevData.budgets.map(budget => {
            let changed = false;
            const spent = prevData.transactions
                .filter(t => t.type === 'expense' && t.category === budget.category && format(new Date(t.date), 'yyyy-MM') === (budget.month || currentMonth))
                .reduce((sum, t) => sum + t.amount, 0);

            if (budget.spent !== spent) changed = true;

            let limit = budget.limit;
            if (budget.category !== 'savings' && budget.percentage !== undefined && currentSetMonthlyIncome > 0) {
                const newLimit = parseFloat(((budget.percentage / 100) * currentSetMonthlyIncome).toFixed(2));
                if (budget.limit !== newLimit) {
                    limit = newLimit;
                    changed = true;
                }
            } else if (budget.category !== 'savings' && budget.percentage !== undefined && currentSetMonthlyIncome === 0) {
                 if (budget.limit !== 0) {
                    limit = 0;
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

        const leftoverForSavings = Math.max(0, currentSetMonthlyIncome - totalBudgetedExcludingSavings);

        if (savingsBudgetIndex > -1) {
            const savingsSpent = prevData.transactions
                .filter(t => t.type === 'expense' && t.category === 'savings' && format(new Date(t.date), 'yyyy-MM') === currentMonth)
                .reduce((sum, t) => sum + t.amount, 0);

            const currentSavingsBudget = updatedBudgets[savingsBudgetIndex];
            if (currentSavingsBudget.limit !== leftoverForSavings || currentSavingsBudget.spent !== savingsSpent) {
                updatedBudgets[savingsBudgetIndex] = {
                    ...currentSavingsBudget,
                    limit: leftoverForSavings,
                    spent: savingsSpent, 
                    percentage: undefined 
                };
                budgetsChanged = true;
            }
        } else if (currentSetMonthlyIncome > 0 || totalBudgetedExcludingSavings < currentSetMonthlyIncome) {
            const savingsSpent = prevData.transactions
                .filter(t => t.type === 'expense' && t.category === 'savings' && format(new Date(t.date), 'yyyy-MM') === currentMonth)
                .reduce((sum, t) => sum + t.amount, 0);
            updatedBudgets.push({
                id: `b-savings-${Date.now().toString()}`,
                category: 'savings',
                limit: leftoverForSavings,
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
  }, [transactions, appData.monthlyIncome, currentMonth, isLoaded, categories, appData.budgets, user]);


  const handleSaveTransaction = (transactionData: Transaction) => {
    let toastTitle = "";
    let toastMessage = "";
    let validTransaction = true;

    if (transactionData.type === 'expense' && transactionData.category !== 'savings') {
      const categoryBudget = currentMonthBudgets.find(b => b.category === transactionData.category);
      if (!categoryBudget) {
        toastTitle = "Budget Required";
        toastMessage = `Please set a budget for '${getCategoryById(transactionData.category, categories)?.label ?? transactionData.category}' before adding expenses.`;
        validTransaction = false;
      }
    }

    if (!validTransaction) {
        requestAnimationFrame(() => {
            toast({ title: toastTitle, description: toastMessage, variant: "destructive" });
        });
        return;
    }

    setAppData(prev => {
        let updatedTransactions;
        const existingIndex = prev.transactions.findIndex(t => t.id === transactionData.id);

        if (existingIndex > -1) {
            updatedTransactions = [...prev.transactions];
            updatedTransactions[existingIndex] = transactionData;
        } else {
            updatedTransactions = [transactionData, ...prev.transactions];
        }

        updatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        
        let newMonthlyIncome = prev.monthlyIncome;
        if (transactionData.type === 'income' && !transactionData.id) { // Only for new income transactions
            newMonthlyIncome = (newMonthlyIncome ?? 0) + transactionData.amount;
        } else if (transactionData.type === 'income' && transactionData.id && existingIndex > -1) { // For updated income transactions
            const originalTransaction = prev.transactions[existingIndex];
            newMonthlyIncome = (newMonthlyIncome ?? 0) - originalTransaction.amount + transactionData.amount;
        }
        
        return {
            ...prev,
            transactions: updatedTransactions,
            monthlyIncome: newMonthlyIncome,
        };
    });
    
    const isUpdating = !!(transactionData.id && appData.transactions.find(t => t.id === transactionData.id));
    requestAnimationFrame(() => {
        if (isUpdating) {
            toast({ title: "Transaction Updated", description: `Transaction for ${getCategoryById(transactionData.category, categories)?.label ?? transactionData.category} updated.` });
        } else {
            toast({ title: "Transaction Added", description: `${transactionData.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(transactionData.amount)} logged for ${getCategoryById(transactionData.category, categories)?.label ?? transactionData.category}.` });
        }
    });
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    setAppData(prev => {
        const updatedTransactions = prev.transactions.filter(t => t.id !== transactionId);
        let newMonthlyIncome = prev.monthlyIncome;
        if (transaction.type === 'income') {
            newMonthlyIncome = (newMonthlyIncome ?? 0) - transaction.amount;
        }
        return {
            ...prev,
            transactions: updatedTransactions,
            monthlyIncome: newMonthlyIncome < 0 ? 0 : newMonthlyIncome, // Ensure income doesn't go negative
        };
    });
    requestAnimationFrame(() => {
        toast({ title: "Transaction Deleted", description: `Transaction for ${getCategoryById(transaction.category, categories)?.label ?? transaction.category} removed.` });
    });
    setTransactionToDelete(null);
  };

  const openEditTransactionSheet = (transactionId: string) => {
      const transactionToEdit = transactions.find(t => t.id === transactionId);
      if (transactionToEdit) {
          setEditingTransaction(transactionToEdit);
          setIsAddTransactionSheetOpen(true);
      }
  };

 const handleSaveBudget = (budgetData: Budget) => {
    const currentSetMonthlyIncome = appData.monthlyIncome ?? 0;

    let calculatedLimit = budgetData.limit;
    if (budgetData.percentage !== undefined && currentSetMonthlyIncome > 0 && budgetData.category !== 'savings') {
        calculatedLimit = parseFloat(((budgetData.percentage / 100) * currentSetMonthlyIncome).toFixed(2));
    } else if (budgetData.category !== 'savings' && budgetData.percentage !== undefined && currentSetMonthlyIncome === 0) {
        calculatedLimit = 0; 
    }

     if (budgetData.category !== 'savings' && (budgetData.percentage === undefined || budgetData.percentage <=0)) {
         requestAnimationFrame(() => { 
             toast({ title: "Invalid Budget", description: "Budget percentage must be a positive value for expense categories.", variant: "destructive" });
         });
         return;
     }

    const finalBudgetData: Budget = {
        ...budgetData,
        limit: calculatedLimit,
        spent: appData.transactions
            .filter(t => t.type === 'expense' && t.category === budgetData.category && format(new Date(t.date), 'yyyy-MM') === (budgetData.month || currentMonth))
            .reduce((sum, t) => sum + t.amount, 0),
        month: budgetData.month || currentMonth,
    };


    setAppData(prev => {
        let updatedBudgets;
        const existingBudgetIndex = prev.budgets.findIndex(b => b.id === finalBudgetData.id);

        if (existingBudgetIndex > -1) {
            updatedBudgets = [...prev.budgets];
            updatedBudgets[existingBudgetIndex] = finalBudgetData;
        } else {
            updatedBudgets = [...prev.budgets, finalBudgetData];
        }

        updatedBudgets.sort((a, b) => {
             if (a.category === 'savings') return 1;
             if (b.category === 'savings') return -1;
             const labelA = getCategoryById(a.category, prev.categories)?.label ?? a.category;
             const labelB = getCategoryById(b.category, prev.categories)?.label ?? b.category;
             return labelA.localeCompare(labelB);
         });
        return { ...prev, budgets: updatedBudgets };
    });
    
    const isUpdatingAfterState = !!(budgetData.id && appData.budgets.find(b => b.id === budgetData.id));
    requestAnimationFrame(() => {
        if (isUpdatingAfterState) {
            toast({ title: "Budget Updated", description: `Budget for ${getCategoryById(finalBudgetData.category, categories)?.label ?? finalBudgetData.category} updated to ${finalBudgetData.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(finalBudgetData.limit)}).` });
        } else {
            toast({ title: "Budget Set", description: `Budget for ${getCategoryById(finalBudgetData.category, categories)?.label ?? finalBudgetData.category} set to ${finalBudgetData.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(finalBudgetData.limit)}).` });
        }

        const needsCategoryIds = categories.filter(c =>
            !c.isIncomeSource && (
            c.label.toLowerCase().includes('housing') ||
            c.label.toLowerCase().includes('groceries') ||
            c.label.toLowerCase().includes('transport') ||
            c.label.toLowerCase().includes('bill'))
        ).map(c => c.id);

        const currentTotalNeedsPercentage = appData.budgets 
            .filter(b => needsCategoryIds.includes(b.category) && b.month === currentMonth && b.percentage !== undefined)
            .reduce((sum, b) => sum + (b.percentage ?? 0), 0);

        if (currentTotalNeedsPercentage > 50) {
             toast({
                title: "Budget Reminder",
                description: `Your 'Needs' categories now represent ${currentTotalNeedsPercentage.toFixed(1)}% of your income, exceeding the recommended 50%. Consider reviewing your allocations.`,
                variant: "default",
                duration: 7000,
            });
        }
    });
    setEditingBudget(null);
};

const handleDeleteBudget = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;

    if (budget.category === 'savings') {
        requestAnimationFrame(() => {
            toast({ title: "Cannot Delete", description: "The 'Savings' budget cannot be deleted.", variant: "destructive" });
        });
        setBudgetToDelete(null);
        return;
    }

    const hasTransactions = transactions.some(t => t.category === budget.category && format(new Date(t.date), 'yyyy-MM') === budget.month && t.type === 'expense');
    if (hasTransactions) {
         requestAnimationFrame(() => {
            toast({ title: "Cannot Delete", description: `Budget for '${getCategoryById(budget.category, categories)?.label}' has associated transactions this month.`, variant: "destructive" });
        });
        setBudgetToDelete(null);
        return;
    }

    setAppData(prev => ({
        ...prev,
        budgets: prev.budgets.filter(b => b.id !== budgetId)
    }));
    requestAnimationFrame(() => {
        toast({ title: "Budget Deleted", description: `Budget for ${getCategoryById(budget.category, categories)?.label} removed.` });
    });
    setBudgetToDelete(null);
};

const openEditBudgetDialog = (budgetId: string) => {
    const budgetToEdit = budgets.find(b => b.id === budgetId);
    if (budgetToEdit && budgetToEdit.category !== 'savings') {
        setEditingBudget(budgetToEdit);
        setIsAddBudgetDialogOpen(true);
    } else if (budgetToEdit && budgetToEdit.category === 'savings') {
         requestAnimationFrame(() => {
            toast({title: "Info", description: "The Savings budget limit is auto-calculated and cannot be edited directly. Its percentage is not set by the user."})
        });
    }
};


 const handleSetIncome = () => {
    const incomeValue = parseFloat(tempIncome);
    if (isNaN(incomeValue) || incomeValue <= 0) {
         requestAnimationFrame(() => {
            toast({ title: "Invalid Income", description: "Please enter a valid positive number for income.", variant: "destructive" });
        });
        return;
    }
    if (!selectedIncomeCategory) { 
         requestAnimationFrame(() => {
            toast({ title: "Select Income Source", description: "Please select an income source category.", variant: "destructive" });
        });
         return;
    }

    setAppData(prev => ({ ...prev, monthlyIncome: incomeValue }));
    // The actual income transaction will be logged through the normal transaction flow.
    // This function only sets the *budgeted* monthly income.
       
    requestAnimationFrame(() => {
        toast({ title: "Income Updated", description: `Monthly budgeted income set to ${formatCurrency(incomeValue)}. Percentage-based budgets will update their monetary limits.` });
    });
  };

  const getCategoryById = React.useCallback((id: string, cats: Category[]): Category | undefined => {
    return cats.find(cat => cat.id === id);
  }, []);


   const getCategoryTree = React.useCallback((cats: Category[], parentId: string | null = null): (Category & { children?: Category[] })[] => {
    const topLevel = cats.filter(cat => cat.parentId === parentId);
    return topLevel.map(cat => ({
        ...cat,
        children: getCategoryTree(cats, cat.id)
    }));
  }, []);

  const totalAllocatedPercentage = React.useMemo(() => {
     return currentMonthBudgets
         .filter(b => b.category !== 'savings' && b.percentage !== undefined)
         .reduce((sum, b) => sum + (b.percentage ?? 0), 0);
  }, [currentMonthBudgets]);

  const hasExpenseBudgetsSet = React.useMemo(() => {
    return currentMonthBudgets.some(b => b.category !== 'savings' && b.limit > 0 && b.percentage !== undefined && b.percentage > 0);
  }, [currentMonthBudgets]);


    if (!user) {
        return null;
    }
    if (!isLoaded && user) {
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
            </div>

            {monthlyIncome === null || monthlyIncome === 0 ? (
              <Card className="border-primary border-2 animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Wallet className="text-primary h-5 w-5"/> Set Your Monthly Income</CardTitle>
                  <CardDescription>Enter your estimated total income for the month and select its primary source category. This forms the basis for your budget. This can be updated later.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="monthly-income">Amount (₱)</Label>
                            <Input
                                id="monthly-income"
                                type="number"
                                placeholder="e.g., 25000"
                                value={tempIncome}
                                onChange={(e) => setTempIncome(e.target.value)}
                                className="flex-grow rounded-lg"
                            />
                        </div>
                         <div className="space-y-1">
                             <Label htmlFor="income-category">Source Category (for this estimate)</Label>
                             <Select value={selectedIncomeCategory} onValueChange={setSelectedIncomeCategory}>
                                <SelectTrigger id="income-category" className="truncate rounded-lg">
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
                   <Button onClick={handleSetIncome} className="w-full rounded-lg">Set Monthly Income</Button>
                   {incomeCategories.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">No income source categories found. Please add some in 'Profile' &gt; 'Categories'.</p>
                   )}
                </CardContent>
              </Card>
            ) : null}

             {monthlyIncome !== null && monthlyIncome > 0 && (
                <>
                 <div className="grid gap-4 grid-cols-1 md:grid-cols-2 animate-slide-up">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(monthlySummary.income)}</div>
                        <p className="text-xs text-muted-foreground">This month's budgeted total</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses Logged</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {hasExpenseBudgetsSet ? (
                            <div className="text-2xl font-bold">{formatCurrency(monthlySummary.expenses)}</div>
                         ) : (
                             <Skeleton className="h-8 w-24 rounded-md" />
                         )}
                         <p className="text-xs text-muted-foreground">{hasExpenseBudgetsSet ? "This month" : "Set budgets first"}</p>
                    </CardContent>
                    </Card>
                </div>
                <Card className="animate-slide-up" style={{"animationDelay": "0.1s"}}>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Actual Balance</CardTitle>
                    <CardDescription>Actual income transactions minus logged expenses this month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{formatCurrency(monthlySummary.balance)}</div>
                       <p className="text-xs text-muted-foreground">Logged Income Transactions: {formatCurrency(monthlySummary.incomeTransactions)}</p>
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
            <Card className="animate-slide-up" style={{"animationDelay": "0.3s"}}>
                <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                 <CardDescription>Your latest financial activity.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    {transactions.slice(0, 5).map((t) => (
                        <TransactionListItem
                            key={t.id}
                            transaction={t}
                            categories={categories}
                            onEdit={() => openEditTransactionSheet(t.id)}
                            onDelete={() => setTransactionToDelete(t)}
                        />
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
                             <Button variant="link" size="sm" className="rounded-lg">View All History</Button>
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
                         <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>
                             Go to Budgets
                        </Button>
                    </CardContent>
                </Card>
           )}
           {(monthlyIncome === null || monthlyIncome === 0) && isLoaded && (
                 <Card className="border-dashed border-destructive/30 bg-destructive/10 animate-fade-in">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                         <p className="font-semibold text-destructive">Set Your Income</p>
                        <p className="text-sm text-destructive/80">Please set your estimated monthly income above to unlock budgeting and tracking features.</p>
                    </CardContent>
                </Card>
           )}
             <Card className="animate-slide-up" style={{"animationDelay": `${(savingGoals.length + 1) * 0.05}s`}}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/> Financial Planning Tips</CardTitle>
                     <CardDescription className="text-xs">Learn more about managing your money.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild variant="link" className="p-0 h-auto text-base">
                        <Link href="/learn/budgeting-guide">
                           How to Budget Guide
                        </Link>
                    </Button>
                </CardContent>
             </Card>
        </TabsContent>

        <TabsContent value="transactions" className="flex-grow overflow-y-auto p-0">
           <ScrollArea className="h-full">
             <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold mb-2">All Transactions</h2>
               {transactions.length === 0 && monthlyIncome === null && (
                      <Card className="border-dashed border-destructive/30 bg-destructive/10">
                        <CardContent className="p-6 text-center">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                            <p className="font-semibold text-destructive">Set Income First</p>
                            <p className="text-sm text-destructive/80">Please set your income on the Home screen to log transactions.</p>
                            <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.querySelector('button[value="home"]')?.click()}>Go to Home</Button>
                        </CardContent>
                     </Card>
               )}
               {transactions.length === 0 && monthlyIncome !== null && !hasExpenseBudgetsSet && (
                    <Card className="border-dashed border-secondary/50 bg-secondary/30">
                         <CardContent className="p-6 text-center text-muted-foreground">
                            <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                             <p className="font-semibold">Set Budgets to Log Expenses</p>
                            <p className="text-sm">You can log income now. To log expenses, set budgets in the 'Budgets' tab.</p>
                            <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>Go to Budgets</Button>
                         </CardContent>
                    </Card>
               )}
               {transactions.length > 0 ? (
                   transactions.map((t) => (
                    <TransactionListItem
                        key={t.id}
                        transaction={t}
                        categories={categories}
                        onEdit={() => openEditTransactionSheet(t.id)}
                        onDelete={() => setTransactionToDelete(t)}
                    />
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
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link href="/saving-goals" className="flex items-center justify-center gap-2">
                          <PiggyBank className="h-4 w-4" /> Manage Goals
                      </Link>
                  </Button>
                 {monthlyIncome !== null && monthlyIncome > 0 && (
                    <Button size="sm" onClick={() => { setEditingBudget(null); setIsAddBudgetDialogOpen(true); }} className="rounded-lg">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
                    </Button>
                 )}
             </div>
          </div>
          {(monthlyIncome === null || monthlyIncome === 0) ? (
            <Card className="border-dashed border-destructive/30 bg-destructive/10 animate-fade-in">
                <CardContent className="p-6 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                    <p className="font-semibold text-destructive">Set Your Income First</p>
                    <p className="text-sm text-destructive/80">Please set your monthly income on the Home tab before creating budgets.</p>
                    <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.querySelector('button[value="home"]')?.click()}>
                       Go to Home
                    </Button>
                </CardContent>
            </Card>
           ) : currentMonthBudgets.length > 0 ? (
             [...currentMonthBudgets]
                .sort((a, b) => {
                    if (a.category === 'savings') return 1;
                    if (b.category === 'savings') return -1;
                    const catAInfo = getCategoryById(a.category, categories);
                    const catBInfo = getCategoryById(b.category, categories);
                    const labelA = catAInfo?.label ?? a.category;
                    const labelB = catBInfo?.label ?? b.category;
                    return labelA.localeCompare(labelB);
                })
                .map((budget, index) => (
                    <div key={budget.id} className="animate-slide-up" style={{"animationDelay": `${index * 0.05}s`}}>
                         <BudgetCard
                            budget={budget}
                            categories={categories}
                            monthlyIncome={monthlyIncome}
                            onEdit={() => openEditBudgetDialog(budget.id)}
                            onDelete={() => setBudgetToDelete(budget)}
                          />
                    </div>
                 ))
           ) : (
                <Card className="border-dashed border-secondary/50 bg-secondary/30 animate-fade-in">
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
                   <Card className="border-dashed border-destructive/30 bg-destructive/10 animate-fade-in">
                       <CardContent className="p-6 text-center">
                           <AlertCircle className="mx-auto h-8 w-8 mb-2 text-destructive" />
                            <p className="font-semibold text-destructive">Set Your Income First</p>
                          <p className="text-sm text-destructive/80">Please set your monthly income on the Home tab to view insights.</p>
                           <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.querySelector('button[value="home"]')?.click()}>
                              Go to Home
                           </Button>
                       </CardContent>
                   </Card>
             ) : !hasExpenseBudgetsSet ? (
                  <Card className="border-dashed border-secondary/50 bg-secondary/30 animate-fade-in">
                       <CardContent className="p-6 text-center text-muted-foreground">
                          <BarChart3 className="mx-auto h-8 w-8 mb-2 text-primary" />
                           <p className="font-semibold">Set Budgets First</p>
                          <p className="text-sm">Set your budgets in the 'Budgets' tab to generate detailed spending insights.</p>
                          <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.querySelector('button[value="budgets"]')?.click()}>
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
                    onClick={() => {setEditingTransaction(null); setIsAddTransactionSheetOpen(true);}}
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
        onOpenChange={(isOpen) => {
            setIsAddTransactionSheetOpen(isOpen);
            if (!isOpen) setEditingTransaction(null);
        }}
        onSaveTransaction={handleSaveTransaction}
        categoriesForSelect={categories}
        canAddExpense={hasExpenseBudgetsSet || (!!editingTransaction && editingTransaction.type ==='expense')} 
        currentMonthBudgetCategoryIds={currentMonthBudgets.filter(b => b.category !== 'savings').map(b => b.category)}
        existingTransaction={editingTransaction}
      />
       <AddBudgetDialog
        open={isAddBudgetDialogOpen}
        onOpenChange={(isOpen) => {
            setIsAddBudgetDialogOpen(isOpen);
            if(!isOpen) setEditingBudget(null);
        }}
        onSaveBudget={handleSaveBudget}
        existingBudgetCategoryIds={currentMonthBudgets
            .filter(b => b.category !== 'savings' && b.id !== editingBudget?.id)
            .map(b => b.category)}
        availableSpendingCategories={expenseCategories.filter(cat => cat.id !== 'savings')}
        monthlyIncome={monthlyIncome}
        totalAllocatedPercentage={totalAllocatedPercentage - (editingBudget?.percentage ?? 0)}
        existingBudget={editingBudget}
      />

      {transactionToDelete && (
        <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this transaction? This action cannot be undone.
                        <br/>Amount: {formatCurrency(transactionToDelete.amount)}
                        <br/>Category: {getCategoryById(transactionToDelete.category, categories)?.label ?? transactionToDelete.category}
                        <br/>Date: {format(new Date(transactionToDelete.date), "PPP")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTransactionToDelete(null)} className="rounded-lg">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteTransaction(transactionToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {budgetToDelete && (
        <AlertDialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the budget for "{getCategoryById(budgetToDelete.category, categories)?.label ?? budgetToDelete.category}"?
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBudgetToDelete(null)} className="rounded-lg">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteBudget(budgetToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
