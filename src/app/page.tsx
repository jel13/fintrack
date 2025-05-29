
"use client";

import * as React from "react";
import { PlusCircle, List, Target, PiggyBank, Settings, BookOpen, AlertCircle, Wallet, BarChart3, Activity, UserCircle, Home as HomeIcon, Edit, Trash2, TrendingDown, Scale, FolderCog } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs"; // TabsList and TabsTrigger are now in BottomNavigation
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { AddBudgetDialog } from "@/components/add-budget-dialog";
import BudgetCard from "@/components/budget-card";
import TransactionListItem from "@/components/transaction-list-item";
import { SpendingChart } from "@/components/spending-chart";
import type { Transaction, Budget, Category, AppData, SavingGoal } from "@/types";
import { format, parseISO } from 'date-fns'; // Added parseISO
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryIconComponent } from '@/components/category-icon';
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
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from 'next/navigation';


export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'home';

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
    if (!isLoaded) return { income: 0, expenses: 0, balance: 0 };
    
    const expenses = transactions.filter(t => t.type === 'expense' && format(parseISO(t.date as unknown as string), 'yyyy-MM') === currentMonth).reduce((sum, t) => sum + t.amount, 0);
    const calculatedBalance = (monthlyIncome ?? 0) - expenses; 

    return {
        income: monthlyIncome ?? 0, 
        expenses,
        balance: calculatedBalance, 
    };
  }, [transactions, monthlyIncome, currentMonth, isLoaded]);


  const incomeCategories = React.useMemo(() => categories.filter(cat => cat.isIncomeSource), [categories]);
  const expenseCategories = React.useMemo(() => categories.filter(cat => !cat.isIncomeSource && cat.id !== 'savings'), [categories]);

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
            let spent = 0;

            if (budget.category === 'savings') {
                 spent = prevData.transactions
                    .filter(t => 
                        t.type === 'expense' && 
                        (t.category === 'savings' || prevData.savingGoals.some(sg => sg.id === t.category)) &&
                        format(parseISO(t.date as unknown as string), 'yyyy-MM') === (budget.month || currentMonth)
                    )
                    .reduce((sum, t) => sum + t.amount, 0);
            } else {
                 spent = prevData.transactions
                    .filter(t => t.type === 'expense' && t.category === budget.category && format(parseISO(t.date as unknown as string), 'yyyy-MM') === (budget.month || currentMonth))
                    .reduce((sum, t) => sum + t.amount, 0);
            }

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
            const savingsSpent = updatedBudgets[savingsBudgetIndex].spent; // Already calculated above

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
                .filter(t => 
                    t.type === 'expense' && 
                    (t.category === 'savings' || prevData.savingGoals.some(sg => sg.id === t.category)) &&
                    format(parseISO(t.date as unknown as string), 'yyyy-MM') === currentMonth
                )
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
  }, [transactions, appData.monthlyIncome, currentMonth, isLoaded, categories, user, appData.budgets, appData.savingGoals]);


  const handleSaveTransaction = (transactionData: Transaction) => {
    let toastTitle = "";
    let toastMessageDescription = "";
    let validTransaction = true;
    let isUpdate = false;
    let originalAmountIfUpdate = 0;
    let originalTypeIfUpdate = transactionData.type;
    let updatedSavingGoals: SavingGoal[] | undefined = undefined;

    setAppData(prev => {
        const existingIndex = prev.transactions.findIndex(t => t.id === transactionData.id);
        isUpdate = existingIndex > -1;

        if (isUpdate) {
            const originalTransaction = prev.transactions[existingIndex];
            originalAmountIfUpdate = originalTransaction.amount;
            originalTypeIfUpdate = originalTransaction.type;
        }

        // Check if category is a saving goal
        const targetSavingGoal = prev.savingGoals.find(sg => sg.id === transactionData.category);

        if (transactionData.type === 'expense' && !targetSavingGoal) { // Regular expense
            const categoryBudget = prev.budgets.find(b => b.category === transactionData.category && b.month === (format(parseISO(transactionData.date as unknown as string), 'yyyy-MM')));
            if (!categoryBudget && transactionData.category !== 'savings') { // Allow 'savings' category without explicit budget check here
                toastTitle = "Budget Required";
                toastMessageDescription = `Please set a budget for '${getCategoryById(transactionData.category, prev.categories)?.label ?? transactionData.category}' for ${format(parseISO(transactionData.date as unknown as string), 'MMMM yyyy')} before adding expenses.`;
                validTransaction = false;
            }
        }
        
        if (!validTransaction) return prev;

        let updatedTransactions;
        if (isUpdate) {
            updatedTransactions = [...prev.transactions];
            updatedTransactions[existingIndex] = transactionData;
        } else {
            updatedTransactions = [transactionData, ...prev.transactions];
        }
        updatedTransactions.sort((a, b) => parseISO(b.date as unknown as string).getTime() - parseISO(a.date as unknown as string).getTime());
        
        let newMonthlyIncome = prev.monthlyIncome ?? 0;
        if (transactionData.type === 'income') {
            if (isUpdate && originalTypeIfUpdate === 'income') {
                 newMonthlyIncome = (prev.monthlyIncome ?? 0) - originalAmountIfUpdate + transactionData.amount;
            } else if (isUpdate && originalTypeIfUpdate === 'expense') { 
                 newMonthlyIncome = (prev.monthlyIncome ?? 0) + transactionData.amount;
            } else if (!isUpdate) { 
                 newMonthlyIncome = (prev.monthlyIncome ?? 0) + transactionData.amount;
            }
        } else if (isUpdate && originalTypeIfUpdate === 'income' && transactionData.type === 'expense') {
            newMonthlyIncome = (prev.monthlyIncome ?? 0) - originalAmountIfUpdate;
        }

        // If it's a contribution to a saving goal
        if (targetSavingGoal && transactionData.type === 'expense') {
            updatedSavingGoals = prev.savingGoals.map(sg => 
                sg.id === targetSavingGoal.id 
                ? { ...sg, savedAmount: sg.savedAmount + transactionData.amount - (isUpdate && originalTransaction?.category === sg.id ? originalAmountIfUpdate : 0) } 
                : sg
            );
        }
        
        return {
            ...prev,
            transactions: updatedTransactions,
            monthlyIncome: Math.max(0, newMonthlyIncome),
            savingGoals: updatedSavingGoals || prev.savingGoals,
        };
    });
    
    requestAnimationFrame(() => {
        if (!validTransaction) {
            toast({ title: toastTitle, description: toastMessageDescription, variant: "destructive" });
            return;
        }
        const targetSavingGoal = appData.savingGoals.find(sg => sg.id === transactionData.category);

        if (isUpdate) {
            toast({ title: "Transaction Updated", description: `Transaction for ${targetSavingGoal ? targetSavingGoal.name : (getCategoryById(transactionData.category, categories)?.label ?? transactionData.category)} updated.` });
        } else {
            toast({ title: "Transaction Added", description: `${transactionData.type === 'income' ? 'Income' : (targetSavingGoal ? 'Contribution' : 'Expense')} of ${formatCurrency(transactionData.amount)} logged for ${targetSavingGoal ? targetSavingGoal.name : (getCategoryById(transactionData.category, categories)?.label ?? transactionData.category)}.` });
        }
    });
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    let toastMessage = "";
    const targetSavingGoal = appData.savingGoals.find(sg => sg.id === transaction.category);
    toastMessage = `Transaction for ${targetSavingGoal ? targetSavingGoal.name : (getCategoryById(transaction.category, categories)?.label ?? transaction.category)} removed.`;
    

    setAppData(prev => {
        const updatedTransactions = prev.transactions.filter(t => t.id !== transactionId);
        let newMonthlyIncome = prev.monthlyIncome ?? 0;
        let updatedSavingGoalsData = prev.savingGoals;

        if (transaction.type === 'income') {
            newMonthlyIncome -= transaction.amount;
            toastMessage += ` Budgeted income reduced by ${formatCurrency(transaction.amount)}.`;
        }

        // If the deleted transaction was a contribution to a saving goal, reduce the goal's savedAmount
        if (targetSavingGoal && transaction.type === 'expense') {
            updatedSavingGoalsData = prev.savingGoals.map(sg => 
                sg.id === targetSavingGoal.id 
                ? { ...sg, savedAmount: Math.max(0, sg.savedAmount - transaction.amount) } 
                : sg
            );
            toastMessage += ` Goal "${targetSavingGoal.name}" balance reduced.`;
        }
        
        return {
            ...prev,
            transactions: updatedTransactions,
            monthlyIncome: Math.max(0, newMonthlyIncome),
            savingGoals: updatedSavingGoalsData,
        };
    });
    requestAnimationFrame(() => {
        toast({ title: "Transaction Deleted", description: toastMessage });
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
    let isUpdate = !!budgetData.id;

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
            .filter(t => t.type === 'expense' && t.category === budgetData.category && format(parseISO(t.date as unknown as string), 'yyyy-MM') === (budgetData.month || currentMonth))
            .reduce((sum, t) => sum + t.amount, 0),
        month: budgetData.month || currentMonth,
    };

    let needsCategoryWarning = false;
    setAppData(prev => {
        let updatedBudgets;
        const existingBudgetIndex = prev.budgets.findIndex(b => b.id === finalBudgetData.id);

        if (existingBudgetIndex > -1) {
            updatedBudgets = [...prev.budgets];
            updatedBudgets[existingBudgetIndex] = finalBudgetData;
        } else {
            updatedBudgets = [...prev.budgets, finalBudgetData];
            isUpdate = false;
        }

        updatedBudgets.sort((a, b) => {
             if (a.category === 'savings') return 1;
             if (b.category === 'savings') return -1;
             const labelA = getCategoryById(a.category, prev.categories)?.label ?? a.category;
             const labelB = getCategoryById(b.category, prev.categories)?.label ?? b.category;
             return labelA.localeCompare(labelB);
         });
        
        const needsCategoryIds = prev.categories.filter(c =>
            !c.isIncomeSource && (
            c.label.toLowerCase().includes('housing') ||
            c.label.toLowerCase().includes('groceries') ||
            c.label.toLowerCase().includes('transport') ||
            c.label.toLowerCase().includes('bill'))
        ).map(c => c.id);

        const currentTotalNeedsPercentage = updatedBudgets
            .filter(b => needsCategoryIds.includes(b.category) && b.month === currentMonth && b.percentage !== undefined)
            .reduce((sum, b) => sum + (b.percentage ?? 0), 0);
        
        if (currentTotalNeedsPercentage > 50) {
            needsCategoryWarning = true;
        }
        
        return { ...prev, budgets: updatedBudgets };
    });
        
    requestAnimationFrame(() => {
        if (isUpdate) {
            toast({ title: "Budget Updated", description: `Budget for ${getCategoryById(finalBudgetData.category, categories)?.label ?? finalBudgetData.category} updated to ${finalBudgetData.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(finalBudgetData.limit)}).` });
        } else {
            toast({ title: "Budget Set", description: `Budget for ${getCategoryById(finalBudgetData.category, categories)?.label ?? finalBudgetData.category} set to ${finalBudgetData.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(finalBudgetData.limit)}).` });
        }
        if (needsCategoryWarning) {
            const needsPercentage = appData.budgets
                .filter(b => categories.find(c => c.id === b.category && (
                    c.label.toLowerCase().includes('housing') ||
                    c.label.toLowerCase().includes('groceries') ||
                    c.label.toLowerCase().includes('transport') ||
                    c.label.toLowerCase().includes('bill'))
                ) && b.month === currentMonth && b.percentage !== undefined)
                .reduce((sum, b) => sum + (b.percentage ?? 0), 0);

            toast({
                title: "Budget Reminder",
                description: `Your 'Needs' categories now represent ${needsPercentage.toFixed(1)}% of your income, exceeding the recommended 50%. Consider reviewing your allocations.`,
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

    const hasTransactions = transactions.some(t => t.category === budget.category && format(parseISO(t.date as unknown as string), 'yyyy-MM') === budget.month && t.type === 'expense');
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
       
    requestAnimationFrame(() => {
        toast({ title: "Income Updated", description: `Monthly budgeted income set to ${formatCurrency(incomeValue)}. Percentage-based budgets will update their monetary limits.` });
    });
  };

  const getCategoryById = React.useCallback((id: string, cats: Category[]): Category | undefined => {
    return cats.find(cat => cat.id === id);
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
    <div className="flex flex-col flex-1 bg-background">
      <Tabs defaultValue={initialTab} value={initialTab} className="flex-grow flex flex-col">
        <TabsContent value="home" className="flex-grow overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-primary">Home</h1>
            </div>

            {monthlyIncome === null || monthlyIncome === 0 ? (
              <Card className="border-primary border-2 animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Wallet className="text-accent h-6 w-6"/> Set Your Monthly Income</CardTitle>
                  <CardDescription>Enter your estimated total income for the month and select its primary source category. This forms the basis for your budget and can be updated later.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                            <Label htmlFor="monthly-income">Amount (₱)</Label>
                            <Input
                                id="monthly-income"
                                type="number"
                                placeholder="e.g., 25000"
                                value={tempIncome}
                                onChange={(e) => setTempIncome(e.target.value)}
                                className="rounded-lg"
                            />
                        </div>
                         <div className="space-y-1">
                             <Label htmlFor="income-category">Source Category</Label>
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
                        <p className="text-xs text-muted-foreground text-center">No income source categories found. Please add some in 'Profile' &gt; 'Manage Categories'.</p>
                   )}
                </CardContent>
              </Card>
            ) : null}

             {monthlyIncome !== null && monthlyIncome > 0 && (
                <>
                 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up">
                    <Card className="sm:col-span-2 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
                            <Wallet className="h-4 w-4 text-accent" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">{formatCurrency(monthlySummary.income)}</div>
                            <p className="text-xs text-muted-foreground">This month's budgeted total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Actual Balance</CardTitle>
                           <Scale className="h-4 w-4 text-accent" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">{formatCurrency(monthlySummary.balance)}</div>
                           <p className="text-xs text-muted-foreground">Budgeted income minus expenses this month.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expenses Logged</CardTitle>
                            <TrendingDown className="h-4 w-4 text-primary" />
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
                <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-accent"/>Recent Transactions</CardTitle>
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
                        <Button variant="link" size="sm" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'transactions' }))}>View All History</Button>
                     </div>
                )}
                </CardContent>
            </Card>
          )}
           {!hasExpenseBudgetsSet && monthlyIncome !== null && monthlyIncome > 0 && (
                <Card className="border-dashed border-muted-foreground animate-fade-in bg-secondary/30">
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <Target className="mx-auto h-8 w-8 mb-2 text-accent" />
                        <p className="font-semibold">Ready to Budget?</p>
                        <p className="text-sm">Head over to the 'Budgets' tab to allocate your income and start tracking your spending effectively.</p>
                         <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'budgets' }))}>
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
             <Card className="animate-slide-up">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-5 w-5 text-accent"/> Financial Planning Tips</CardTitle>
                     <CardDescription className="text-xs">Learn more about managing your money.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/learn/budgeting-guide">
                        <Button variant="link" className="p-0 h-auto text-base">How to Budget Guide</Button>
                    </Link>
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
                            <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'home' }))}>Go to Home</Button>
                        </CardContent>
                     </Card>
               )}
               {transactions.length === 0 && monthlyIncome !== null && !hasExpenseBudgetsSet && (
                    <Card className="border-dashed border-secondary/50 bg-secondary/30">
                         <CardContent className="p-6 text-center text-muted-foreground">
                            <Target className="mx-auto h-8 w-8 mb-2 text-primary" />
                             <p className="font-semibold">Set Budgets to Log Expenses</p>
                            <p className="text-sm">You can log income now. To log expenses, set budgets in the 'Budgets' tab.</p>
                            <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'budgets' }))}>Go to Budgets</Button>
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
                 <Button asChild variant="outline" size="sm">
                    <Link href="/saving-goals" className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4" /> Manage Goals
                    </Link>
                 </Button>
                 {monthlyIncome !== null && monthlyIncome > 0 && (
                    <Button size="sm" className="rounded-lg" onClick={() => { setEditingBudget(null); setIsAddBudgetDialogOpen(true); }}>
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
                    <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'home' }))}>
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
                           <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'home' }))}>
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
                          <Button size="sm" className="mt-3 rounded-lg" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'budgets' }))}>
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

      </Tabs>

      <AddTransactionSheet
        open={isAddTransactionSheetOpen}
        onOpenChange={(isOpen) => {
            setIsAddTransactionSheetOpen(isOpen);
            if (!isOpen) setEditingTransaction(null);
        }}
        onSaveTransaction={handleSaveTransaction}
        categoriesForSelect={categories}
        savingGoals={appData.savingGoals}
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
                        <br/>Category: {appData.savingGoals.find(sg => sg.id === transactionToDelete.category)?.name || getCategoryById(transactionToDelete.category, categories)?.label || transactionToDelete.category}
                        <br/>Date: {format(parseISO(transactionToDelete.date as unknown as string), "PPP")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
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
                    <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteBudget(budgetToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
