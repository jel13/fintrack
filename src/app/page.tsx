"use client";

import * as React from "react";
import { PlusCircle, LayoutDashboard, List, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { AddBudgetDialog } from "@/components/add-budget-dialog";
import BudgetCard from "@/components/budget-card";
import TransactionListItem from "@/components/transaction-list-item";
import { SpendingChart } from "@/components/spending-chart";
import type { Transaction, Budget } from "@/types";
import { format } from 'date-fns';


// Mock Data (replace with actual data fetching/state management later)
const initialTransactions: Transaction[] = [
  { id: '1', type: 'expense', amount: 55.60, category: 'groceries', date: new Date(2024, 6, 15, 10, 30), description: 'Weekly shopping' },
  { id: '2', type: 'income', amount: 2500, category: 'income', date: new Date(2024, 6, 1, 9, 0), description: 'Salary' },
  { id: '3', type: 'expense', amount: 1200, category: 'housing', date: new Date(2024, 6, 5, 8, 0), description: 'Rent' },
  { id: '4', type: 'expense', amount: 45.00, category: 'food', date: new Date(2024, 6, 16, 12, 45), description: 'Lunch with colleagues' },
  { id: '5', type: 'expense', amount: 80.00, category: 'transport', date: new Date(2024, 6, 10, 18, 15), description: 'Gasoline' },
  { id: '6', type: 'expense', amount: 25.00, category: 'food', date: new Date(2024, 6, 18, 19, 30), description: 'Dinner' },
];

const initialBudgets: Budget[] = [
  { id: 'b1', category: 'groceries', limit: 300, spent: 55.60, month: '2024-07' },
  { id: 'b2', category: 'food', limit: 200, spent: 70.00, month: '2024-07' },
  { id: 'b3', category: 'transport', limit: 150, spent: 80.00, month: '2024-07' },
];


export default function Home() {
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);
  const [budgets, setBudgets] = React.useState<Budget[]>(initialBudgets);
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = React.useState(false);
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = React.useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM'); // Get current month in YYYY-MM format

  // Calculate summaries for the current month
  const monthlySummary = React.useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth);
    const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;
    return { income, expenses, balance };
  }, [transactions, currentMonth]);

  // Filter budgets for the current month
  const currentMonthBudgets = React.useMemo(() => {
      return budgets.filter(b => b.month === currentMonth);
  }, [budgets, currentMonth]);

  // Update budget spending whenever transactions change
  React.useEffect(() => {
     setBudgets(prevBudgets => {
         return prevBudgets.map(budget => {
             if (budget.month === currentMonth) {
                 const spent = transactions
                     .filter(t => t.type === 'expense' && t.category === budget.category && format(t.date, 'yyyy-MM') === currentMonth)
                     .reduce((sum, t) => sum + t.amount, 0);
                 return { ...budget, spent };
             }
             return budget;
         });
     });
  }, [transactions, currentMonth]);


  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    const transactionWithId: Transaction = {
      ...newTransaction,
      id: Date.now().toString(), // Simple unique ID generation
    };
    setTransactions((prev) => [transactionWithId, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime())); // Add and sort by date desc
  };

  const handleAddBudget = (newBudget: Omit<Budget, 'id' | 'spent' | 'month'>) => {
     const budgetWithDetails: Budget = {
        ...newBudget,
        id: `b-${Date.now().toString()}`, // Simple unique ID
        spent: transactions // Calculate initial spent amount
            .filter(t => t.type === 'expense' && t.category === newBudget.category && format(t.date, 'yyyy-MM') === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0),
        month: currentMonth,
    };
    setBudgets((prev) => [...prev, budgetWithDetails]);
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    // Basic formatting, consider using Intl.NumberFormat for robustness
    return `${sign}$${absAmount.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col h-screen">
       {/* Header can be added here if needed */}

      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <TabsContent value="dashboard" className="flex-grow overflow-y-auto p-4 space-y-4">
            {/* Monthly Summary Cards */}
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

          {/* Spending Chart */}
          <SpendingChart transactions={transactions} month={currentMonth} />

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[200px]">
                 {transactions.slice(0, 5).map((t) => ( // Show latest 5
                   <TransactionListItem key={t.id} transaction={t} />
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
                    <TransactionListItem key={t.id} transaction={t} />
                   ))
                ) : (
                   <p className="text-center text-muted-foreground pt-10">No transactions recorded.</p>
                )}
             </div>
           </ScrollArea>
        </TabsContent>

        <TabsContent value="budgets" className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-semibold">Monthly Budgets</h2>
             <Button size="sm" onClick={() => setIsAddBudgetDialogOpen(true)}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
             </Button>
          </div>
          {currentMonthBudgets.length > 0 ? (
             currentMonthBudgets.map((budget) => (
                <BudgetCard key={budget.id} budget={budget} />
              ))
           ) : (
             <p className="text-center text-muted-foreground pt-10">No budgets set for this month.</p>
           )}
        </TabsContent>

        {/* Floating Action Button */}
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


        {/* Bottom Navigation */}
        <TabsList className="grid w-full grid-cols-3 h-16 rounded-none sticky bottom-0 bg-background border-t">
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
        </TabsList>
      </Tabs>

      {/* Modals/Sheets */}
      <AddTransactionSheet
        open={isAddTransactionSheetOpen}
        onOpenChange={setIsAddTransactionSheetOpen}
        onAddTransaction={handleAddTransaction}
      />
       <AddBudgetDialog
        open={isAddBudgetDialogOpen}
        onOpenChange={setIsAddBudgetDialogOpen}
        onAddBudget={handleAddBudget}
        existingCategories={currentMonthBudgets.map(b => b.category)} // Pass existing categories for the month
      />
    </div>
  );
}
