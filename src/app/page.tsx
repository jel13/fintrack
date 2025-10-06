
"use client";

import * as React from "react";
import { Fragment } from 'react';
import { PlusCircle, List, Target, PiggyBank, Settings, BookOpen, AlertCircle, Wallet, BarChart3, Activity, UserCircle, Home as HomeIcon, Edit, Trash2, TrendingDown, Scale, FolderCog, Lightbulb, DollarSign, CreditCard, ChevronDown, Check } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { AddBudgetDialog } from "@/components/add-budget-dialog";
import BudgetCard from "@/components/budget-card";
import TransactionListItem from "@/components/transaction-list-item";
import { SpendingChart } from "@/components/spending-chart";
import type { Transaction, Budget, Category, AppData, SavingGoal, TransactionType } from "@/types";
import { format, isToday, isYesterday, startOfMonth, subMonths } from 'date-fns';
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
import { TransactionReceiptDialog } from "@/components/transaction-receipt-dialog";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTour, TourStep } from "@/hooks/use-tour";
import { GuidedTour } from "@/components/guided-tour";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


interface CategoryOrGoalDisplayForReceipt {
  label: string;
  icon: string;
  isSavingGoal?: boolean;
}

interface SelectedTransactionForReceipt {
  transaction: Transaction;
  displayInfo: CategoryOrGoalDisplayForReceipt;
}

const budgetTourSteps: TourStep[] = [
  {
    target: '#add-budget-button',
    title: 'Add a New Budget',
    content: 'Click here to set a spending limit for an expense category. You allocate a percentage of your monthly income.',
    placement: 'bottom',
  },
  {
    target: '.budget-card-tour-highlight',
    title: 'Your Budget Cards',
    content: 'Each card shows your spending progress for a category. You can edit or delete a budget from the menu on the right.',
    placement: 'bottom',
  },
];


export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'home';

  const [appData, setAppData] = React.useState<AppData>(defaultAppData);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);
  const [sheetInitialType, setSheetInitialType] = React.useState<TransactionType | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = React.useState(false);


  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = React.useState<Budget | null>(null);

  const [tempIncome, setTempIncome] = React.useState<string>('');
  const [selectedIncomeCategory, setSelectedIncomeCategory] = React.useState<string>('');
  const { toast } = useToast();

  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = React.useState(false);
  const [selectedTransactionForReceipt, setSelectedTransactionForReceipt] = React.useState<SelectedTransactionForReceipt | null>(null);

  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = React.useState(false); 
  const [historyDateFilter, setHistoryDateFilter] = React.useState('thisMonth');
  const [historyTypeFilter, setHistoryTypeFilter] = React.useState<'all' | 'income' | 'expense'>('all');

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
        if (!loadedData.hasSeenOnboarding) {
            setIsOnboardingDialogOpen(true);
        }
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

  const handleTourEnd = (tourId: string) => {
    setAppData(prev => ({
        ...prev,
        seenTours: [...(prev.seenTours || []), tourId],
    }));
  };

  const budgetTour = useTour({
    tourId: 'budgets-tour',
    steps: budgetTourSteps,
    seenTours: appData.seenTours || [],
    onTourEnd: handleTourEnd,
    condition: initialTab === 'budgets' && (appData.budgets || []).some(b => b.category !== 'savings'),
  });

  const { monthlyIncome, transactions, budgets, categories, savingGoals, savingGoalCategories, hasSeenOnboarding } = appData;

  const monthlySummary = React.useMemo(() => {
    if (!isLoaded) return { income: 0, expenses: 0, balance: 0 };

    const actualExpenses = transactions
        .filter(t =>
            t.type === 'expense' &&
            format(t.date, 'yyyy-MM') === currentMonth &&
            !savingGoals.some(sg => sg.id === t.category)
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const calculatedBalance = (monthlyIncome ?? 0) - actualExpenses;

    return {
        income: monthlyIncome ?? 0,
        expenses: actualExpenses,
        balance: calculatedBalance,
    };
  }, [transactions, monthlyIncome, currentMonth, isLoaded, savingGoals]);


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
                        format(t.date, 'yyyy-MM') === (budget.month || currentMonth)
                    )
                    .reduce((sum, t) => sum + t.amount, 0);
            } else {
                 spent = prevData.transactions
                    .filter(t => t.type === 'expense' && t.category === budget.category && format(t.date, 'yyyy-MM') === (budget.month || currentMonth))
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

        const totalSpentByOtherCategories = updatedBudgets
            .filter(b => b.category !== 'savings' && b.month === currentMonth)
            .reduce((sum, b) => sum + b.spent, 0); 

        const leftoverForSavings = Math.max(0, currentSetMonthlyIncome - totalSpentByOtherCategories);

        if (savingsBudgetIndex > -1) {
            const savingsSpent = updatedBudgets[savingsBudgetIndex].spent;

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
        } else { 
             const savingsSpent = prevData.transactions
                .filter(t =>
                    t.type === 'expense' &&
                    (t.category === 'savings' || prevData.savingGoals.some(sg => sg.id === t.category)) &&
                    format(t.date, 'yyyy-MM') === currentMonth
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
    let originalTransactionIfUpdate: Transaction | undefined = undefined;
    let updatedSavingGoals: SavingGoal[] | undefined = undefined;

    setAppData(prev => {
        const existingIndex = prev.transactions.findIndex(t => t.id === transactionData.id);
        isUpdate = existingIndex > -1;

        if (isUpdate) {
            originalTransactionIfUpdate = prev.transactions[existingIndex];
        }

        const targetSavingGoal = prev.savingGoals.find(sg => sg.id === transactionData.category);

        if (transactionData.type === 'expense' && !targetSavingGoal) {
            const categoryBudget = prev.budgets.find(b => b.category === transactionData.category && b.month === (format(transactionData.date, 'yyyy-MM')));
            if (!categoryBudget && transactionData.category !== 'savings') {
                toastTitle = "Budget Required";
                toastMessageDescription = `Please set a budget for '${getCategoryById(transactionData.category, prev.categories)?.label ?? transactionData.category}' for ${format(transactionData.date, 'MMMM yyyy')} before adding expenses.`;
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
        updatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

        let newMonthlyIncome = prev.monthlyIncome ?? 0;
        if (transactionData.type === 'income') {
            if (isUpdate && originalTransactionIfUpdate?.type === 'income') {
                 newMonthlyIncome = (prev.monthlyIncome ?? 0) - (originalTransactionIfUpdate?.amount ?? 0) + transactionData.amount;
            } else if (isUpdate && originalTransactionIfUpdate?.type === 'expense') {
                 newMonthlyIncome = (prev.monthlyIncome ?? 0) + transactionData.amount;
            } else if (!isUpdate) {
                 newMonthlyIncome = (prev.monthlyIncome ?? 0) + transactionData.amount;
            }
        } else if (isUpdate && originalTransactionIfUpdate?.type === 'income' && transactionData.type === 'expense') {
            newMonthlyIncome = (prev.monthlyIncome ?? 0) - (originalTransactionIfUpdate?.amount ?? 0);
        }

        if (targetSavingGoal && transactionData.type === 'expense') {
            let amountChange = transactionData.amount;
            if (isUpdate && originalTransactionIfUpdate?.category === targetSavingGoal.id && originalTransactionIfUpdate.type === 'expense') {
                amountChange -= (originalTransactionIfUpdate.amount ?? 0);
            } else if (isUpdate && originalTransactionIfUpdate?.category !== targetSavingGoal.id && originalTransactionIfUpdate?.type === 'expense') {

            } else if (isUpdate && originalTransactionIfUpdate?.type === 'income') {

            }


            updatedSavingGoals = prev.savingGoals.map(sg =>
                sg.id === targetSavingGoal.id
                ? { ...sg, savedAmount: sg.savedAmount + amountChange }
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
            toast({ title: "Transaction Added", description: `${transactionData.type === 'income' ? 'Income' : (targetSavingGoal ? 'Allocation to' : 'Expense')} of ${formatCurrency(transactionData.amount)} logged for ${targetSavingGoal ? targetSavingGoal.name : (getCategoryById(transactionData.category, categories)?.label ?? transactionData.category)}.` });
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
        }

        if (targetSavingGoal && transaction.type === 'expense') {
            updatedSavingGoalsData = prev.savingGoals.map(sg =>
                sg.id === targetSavingGoal.id
                ? { ...sg, savedAmount: Math.max(0, sg.savedAmount - transaction.amount) }
                : sg
            );
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
          setSheetInitialType(null); // Clear initial type when editing
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
            .filter(t => t.type === 'expense' && t.category === budgetData.category && format(t.date, 'yyyy-MM') === (budgetData.month || currentMonth))
            .reduce((sum, t) => sum + t.amount, 0),
        month: budgetData.month || currentMonth,
    };

    let needsCategoryWarning = false;
    let toastTitle = "";
    let toastMessageDescription = "";

    setAppData(prev => {
        let updatedBudgets;
        const existingBudgetIndex = prev.budgets.findIndex(b => b.id === finalBudgetData.id);

        if (existingBudgetIndex > -1) {
            updatedBudgets = [...prev.budgets];
            updatedBudgets[existingBudgetIndex] = finalBudgetData;
            toastTitle = "Budget Updated";
            toastMessageDescription = `Budget for ${getCategoryById(finalBudgetData.category, prev.categories)?.label ?? finalBudgetData.category} updated to ${finalBudgetData.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(finalBudgetData.limit)}).`;

        } else {
            updatedBudgets = [...prev.budgets, finalBudgetData];
            toastTitle = "Budget Set";
            toastMessageDescription = `Budget for ${getCategoryById(finalBudgetData.category, prev.categories)?.label ?? finalBudgetData.category} set to ${finalBudgetData.percentage?.toFixed(1) ?? '-'}% (${formatCurrency(finalBudgetData.limit)}).`;
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
        toast({ title: toastTitle, description: toastMessageDescription });

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

    const hasTransactions = transactions.some(t => t.category === budget.category && format(t.date, 'yyyy-MM') === budget.month && t.type === 'expense');
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

  const handleOpenReceiptDialog = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    let displayInfo: CategoryOrGoalDisplayForReceipt;
    const savingGoal = savingGoals.find(sg => sg.id === transaction.category);

    if (savingGoal) {
      const goalCategoryDetails = savingGoalCategories.find(sgc => sgc.id === savingGoal.goalCategoryId);
      displayInfo = {
        label: savingGoal.name,
        icon: goalCategoryDetails?.icon || 'PiggyBank',
        isSavingGoal: true,
      };
    } else {
      const categoryDetails = categories.find(c => c.id === transaction.category);
      displayInfo = {
        label: categoryDetails?.label || transaction.category,
        icon: categoryDetails?.icon || 'HelpCircle',
        isSavingGoal: false,
      };
    }
    setSelectedTransactionForReceipt({ transaction, displayInfo });
    setIsReceiptDialogOpen(true);
  };

  const handleDismissOnboarding = () => {
    setAppData(prev => ({ ...prev, hasSeenOnboarding: true }));
    setIsOnboardingDialogOpen(false); 
  };

  const openAddTransactionSheetForIncome = () => {
    setEditingTransaction(null);
    setSheetInitialType('income');
    setIsAddTransactionSheetOpen(true);
    setIsAddMenuOpen(false);
  };

  const openAddTransactionSheetForExpense = () => {
    setEditingTransaction(null);
    setSheetInitialType('expense');
    setIsAddTransactionSheetOpen(true);
    setIsAddMenuOpen(false);
  };

  const filteredTransactions = React.useMemo(() => {
    let filtered = [...transactions];

    // Filter by type
    if (historyTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === historyTypeFilter);
    }

    // Filter by date
    const now = new Date();
    if (historyDateFilter === 'thisMonth') {
      const startOfThisMonth = startOfMonth(now);
      filtered = filtered.filter(t => t.date >= startOfThisMonth);
    } else if (historyDateFilter === 'lastMonth') {
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = startOfMonth(now);
      filtered = filtered.filter(t => t.date >= startOfLastMonth && t.date < endOfLastMonth);
    } else if (historyDateFilter === 'last3Months') {
      const startOf3MonthsAgo = startOfMonth(subMonths(now, 3));
      filtered = filtered.filter(t => t.date >= startOf3MonthsAgo);
    }

    return filtered;
  }, [transactions, historyDateFilter, historyTypeFilter]);

  const groupedTransactions = React.useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const dateStr = format(t.date, 'yyyy-MM-dd');
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  const getGroupTitle = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const totalFilteredAmount = React.useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount;
        if (t.type === 'expense') return sum - t.amount;
        return sum;
    }, 0);
  }, [filteredTransactions]);


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
      {isLoaded && (
        <OnboardingDialog
            open={isOnboardingDialogOpen}
            onDismiss={handleDismissOnboarding}
            isIncomeSet={!!monthlyIncome && monthlyIncome > 0}
        />
      )}
      <GuidedTour
        steps={budgetTour.steps}
        isRunning={budgetTour.isRunning}
        currentStep={budgetTour.currentStep}
        onNext={budgetTour.nextStep}
        onPrev={budgetTour.prevStep}
        onFinish={budgetTour.endTour}
      />
      <Tabs defaultValue={initialTab} value={initialTab} className="flex-grow flex flex-col">
        <TabsContent value="home" className="flex-grow overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-primary">Home</h1>
            </div>

            {/* Unified Main Dashboard Card */}
            <Card className="w-full animate-slide-up bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-primary-foreground/80">
                      {monthlyIncome !== null && monthlyIncome > 0 ? "Actual Balance" : "Set Monthly Income"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {monthlyIncome !== null && monthlyIncome > 0 ? (
                        <>
                            <p className="text-4xl font-bold tracking-tight">{formatCurrency(monthlySummary.balance)}</p>
                            <div className="mt-4 flex justify-between text-sm text-primary-foreground/80">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4"/>
                                    <span>Income: {formatCurrency(monthlySummary.income)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4"/>
                                    <span>Expenses: {formatCurrency(monthlySummary.expenses)}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                      <div className="space-y-3 text-primary-foreground">
                          <p className="text-sm opacity-90">Enter your estimated income for this month to start budgeting.</p>
                           <div className="space-y-1">
                                <Label htmlFor="monthly-income" className="text-xs opacity-80">Amount (₱)</Label>
                                <Input
                                    id="monthly-income"
                                    type="number"
                                    placeholder="e.g., 30000"
                                    value={tempIncome}
                                    onChange={(e) => setTempIncome(e.target.value)}
                                    className="bg-white/20 text-white placeholder:text-primary-foreground/60 border-primary-foreground/30 focus-visible:ring-offset-primary"
                                />
                            </div>
                             <div className="space-y-1">
                                 <Label htmlFor="income-category" className="text-xs opacity-80">Source Category</Label>
                                 <Select value={selectedIncomeCategory} onValueChange={setSelectedIncomeCategory}>
                                    <SelectTrigger id="income-category" className="truncate bg-white/20 text-white placeholder:text-primary-foreground/60 border-primary-foreground/30 focus-visible:ring-offset-primary">
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
                           <Button onClick={handleSetIncome} className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 mt-2">Set Monthly Income</Button>
                           {incomeCategories.length === 0 && (
                                <p className="text-xs opacity-80 text-center pt-1">Add an income source in 'Profile' &gt; 'Manage Categories'.</p>
                           )}
                      </div>
                    )}
                </CardContent>
            </Card>


          {monthlyIncome !== null && monthlyIncome > 0 && hasExpenseBudgetsSet && (
             <div className="animate-slide-up" style={{animationDelay: "0.2s"}}>
                 <SpendingChart transactions={transactions} month={currentMonth} categories={categories} />
             </div>
           )}

          {monthlyIncome !== null && monthlyIncome > 0 && (
            <Card className="animate-slide-up" style={{animationDelay: "0.3s"}}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary"/>Recent Transactions</CardTitle>
                  <CardDescription>Your latest financial activity.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    {transactions.slice(0, 5).map((t) => (
                        <TransactionListItem
                            key={t.id}
                            transaction={t}
                            categories={categories}
                            savingGoals={savingGoals}
                            onViewReceipt={handleOpenReceiptDialog}
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
                </CardContent>
                <CardFooter className="p-2 text-center border-t flex-col gap-2">
                     {transactions.length > 5 && (
                         <Button variant="link" size="sm" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'transactions' }))}>View All History</Button>
                     )}
                     <Link href="/learn/budgeting-guide" className="w-full">
                        <Button variant="outline" className="w-full text-primary">
                           <BookOpen className="mr-2 h-4 w-4"/> How to Budget Guide
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
          )}

           {!hasExpenseBudgetsSet && monthlyIncome !== null && monthlyIncome > 0 && (
                <Alert variant="default" className="animate-fade-in bg-secondary/50">
                    <Target className="h-5 w-5 text-primary" />
                    <AlertTitle>Ready to Budget?</AlertTitle>
                    <AlertDescription>
                        Head to the 'Budgets' tab to allocate your income and start tracking spending.
                        <Button size="sm" className="w-full mt-3" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'budgets' }))}>
                             Go to Budgets
                        </Button>
                    </AlertDescription>
                </Alert>
           )}
           {(monthlyIncome === null || monthlyIncome === 0) && isLoaded && (!hasSeenOnboarding || hasSeenOnboarding === undefined) && (
                 <Alert variant="destructive" className="animate-fade-in">
                    <AlertCircle className="h-5 w-5"/>
                    <AlertTitle>Set Your Income</AlertTitle>
                    <AlertDescription>
                        Please set your estimated monthly income above to unlock budgeting and tracking features.
                    </AlertDescription>
                </Alert>
           )}
        </TabsContent>

        <TabsContent value="transactions" className="flex-grow flex flex-col p-0">
          <div className="sticky top-0 bg-background z-10 p-4 border-b">
            <h1 className="text-xl font-semibold">History</h1>
            <div className="flex items-center gap-2 mt-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-between">
                            <span>
                                {historyDateFilter === 'thisMonth' && 'This Month'}
                                {historyDateFilter === 'lastMonth' && 'Last Month'}
                                {historyDateFilter === 'last3Months' && 'Last 3 Months'}
                                {historyDateFilter === 'allTime' && 'All Time'}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onSelect={() => setHistoryDateFilter('thisMonth')}>This Month</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setHistoryDateFilter('lastMonth')}>Last Month</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setHistoryDateFilter('last3Months')}>Last 3 Months</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setHistoryDateFilter('allTime')}>All Time</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant={historyTypeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('all')}>All</Button>
                <Button variant={historyTypeFilter === 'income' ? 'secondary' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('income')}>Income</Button>
                <Button variant={historyTypeFilter === 'expense' ? 'secondary' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('expense')}>Expense</Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
                Viewing {filteredTransactions.length} transaction(s) with a net total of <span className={cn("font-semibold", totalFilteredAmount >= 0 ? "text-accent" : "text-destructive")}>{formatCurrency(totalFilteredAmount)}</span>.
            </div>
          </div>
          <ScrollArea className="flex-grow">
             <div className="p-4 pt-2 space-y-2">
               {Object.keys(groupedTransactions).length > 0 ? (
                    Object.keys(groupedTransactions).map(dateStr => (
                        <div key={dateStr}>
                            <h3 className="text-sm font-semibold text-muted-foreground py-2 sticky top-0 bg-background/80 backdrop-blur-sm -mx-4 px-4">{getGroupTitle(dateStr)}</h3>
                            {groupedTransactions[dateStr].map(t => (
                                 <TransactionListItem
                                    key={t.id}
                                    transaction={t}
                                    categories={categories}
                                    savingGoals={savingGoals}
                                    onViewReceipt={handleOpenReceiptDialog}
                                    onEdit={() => openEditTransactionSheet(t.id)}
                                    onDelete={() => setTransactionToDelete(t)}
                                />
                            ))}
                        </div>
                    ))
               ) : (
                    <Card className="border-dashed mt-4">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <List className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-semibold">No transactions found</p>
                            <p className="text-sm">No transactions match your current filters.</p>
                        </CardContent>
                    </Card>
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
                    <Button size="sm" className="shadow-sm" id="add-budget-button" onClick={() => { setEditingBudget(null); setIsAddBudgetDialogOpen(true); }}>
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
                    <Button size="sm" className="mt-3" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'home' }))}>
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
                    <div key={budget.id} className={cn("animate-slide-up", index === 0 && "budget-card-tour-highlight")} style={{animationDelay: `${index * 0.05}s`}}>
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
                           <Button size="sm" className="mt-3" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'home' }))}>
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
                          <Button size="sm" className="mt-3" onClick={() => document.dispatchEvent(new CustomEvent('navigateToTab', { detail: 'budgets' }))}>
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
                <Popover open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            size="icon"
                            className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 active:scale-95 transition-transform"
                            aria-label="Add Transaction Menu"
                        >
                            <PlusCircle className="h-6 w-6" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 rounded-xl shadow-xl" side="top" align="end" sideOffset={10}>
                        <div className="grid gap-1">
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10 rounded-md text-sm"
                                onClick={openAddTransactionSheetForIncome}
                            >
                                <DollarSign className="mr-2 h-4 w-4 text-accent" />
                                Add Income
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10 rounded-md text-sm"
                                onClick={openAddTransactionSheetForExpense}
                                disabled={!hasExpenseBudgetsSet}
                            >
                                <CreditCard className="mr-2 h-4 w-4 text-primary" />
                                Add Expense
                            </Button>
                             {!hasExpenseBudgetsSet && (
                                <p className="text-xs text-muted-foreground p-2 text-center">Set expense budgets first to log expenses.</p>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
             </div>
        )}

      </Tabs>

      <AddTransactionSheet
        open={isAddTransactionSheetOpen}
        onOpenChange={(isOpen) => {
            setIsAddTransactionSheetOpen(isOpen);
            if (!isOpen) {
                setEditingTransaction(null);
                setSheetInitialType(null); // Reset initial type when sheet closes
            }
        }}
        onSaveTransaction={handleSaveTransaction}
        categoriesForSelect={categories}
        savingGoals={appData.savingGoals}
        budgets={appData.budgets}
        canAddExpense={hasExpenseBudgetsSet || (!!editingTransaction && editingTransaction.type ==='expense')}
        currentMonthBudgetCategoryIds={currentMonthBudgets.filter(b => b.category !== 'savings').map(b => b.category)}
        existingTransaction={editingTransaction}
        initialType={sheetInitialType}
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

      <TransactionReceiptDialog
        open={isReceiptDialogOpen}
        onOpenChange={setIsReceiptDialogOpen}
        transaction={selectedTransactionForReceipt?.transaction ?? null}
        categoryOrGoalDisplay={selectedTransactionForReceipt?.displayInfo ?? null}
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
                        <br/>Date: {transactionToDelete.date ? format(transactionToDelete.date, "PPP") : "N/A"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteTransaction(transactionToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
                    <AlertDialogAction onClick={() => handleDeleteBudget(budgetToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
