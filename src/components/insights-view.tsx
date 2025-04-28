
"use client";

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import type { Transaction, Budget, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Scale, PiggyBank, Info } from 'lucide-react';

interface InsightsViewProps {
    currentMonth: string; // "yyyy-MM"
    previousMonth: string; // "yyyy-MM"
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
    monthlyIncome: number | null;
}

// Consistent colors for charts
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const InsightsView: React.FC<InsightsViewProps> = ({
    currentMonth,
    previousMonth,
    transactions,
    budgets,
    categories,
    monthlyIncome
}) => {

    // --- Data Processing ---

    // Filter data for current and previous months
    const currentMonthTransactions = React.useMemo(() => transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth), [transactions, currentMonth]);
    const previousMonthTransactions = React.useMemo(() => transactions.filter(t => format(t.date, 'yyyy-MM') === previousMonth), [transactions, previousMonth]);
    const currentMonthBudgets = React.useMemo(() => budgets.filter(b => b.month === currentMonth), [budgets, currentMonth]);
    const previousMonthBudgets = React.useMemo(() => budgets.filter(b => b.month === previousMonth), [budgets, previousMonth]);
    // Find previous month's income (might be needed if income changed)
    const previousMonthIncomeBudget = budgets.find(b => b.month === previousMonth && b.category === 'income_tracker'); // Assuming a tracker budget/record if income can change monthly
    const previousMonthIncome = previousMonthIncomeBudget?.limit ?? monthlyIncome; // Fallback to current if not tracked


    // Calculate totals for each month
    const currentMonthTotals = React.useMemo(() => {
        const income = monthlyIncome ?? 0; // Use set income
        const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const savingsBudget = currentMonthBudgets.find(b => b.category === 'savings')?.limit ?? 0;
        // Actual savings could be calculated by income - expenses, or based on transactions to a savings category if tracked that way
        const actualSavings = income - expenses;
        return { income, expenses, savingsBudget, actualSavings };
    }, [monthlyIncome, currentMonthTransactions, currentMonthBudgets]);

    const previousMonthTotals = React.useMemo(() => {
        const income = previousMonthIncome ?? 0;
        const expenses = previousMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const savingsBudget = previousMonthBudgets.find(b => b.category === 'savings')?.limit ?? 0;
        const actualSavings = income - expenses;
        return { income, expenses, savingsBudget, actualSavings };
    }, [previousMonthIncome, previousMonthTransactions, previousMonthBudgets]);


    // --- Chart Data Preparation ---

    // Income vs Expense vs Savings Chart Data
    const comparisonData = React.useMemo(() => [
        { name: format(new Date(previousMonth + '-01T00:00:00'), 'MMM yyyy'), Income: previousMonthTotals.income, Expenses: previousMonthTotals.expenses, Savings: previousMonthTotals.actualSavings },
        { name: format(new Date(currentMonth + '-01T00:00:00'), 'MMM yyyy'), Income: currentMonthTotals.income, Expenses: currentMonthTotals.expenses, Savings: currentMonthTotals.actualSavings },
    ], [currentMonth, previousMonth, currentMonthTotals, previousMonthTotals]);

    // Spending by Category (Current Month)
    const spendingByCategory = React.useMemo(() => {
        const categoryMap: Record<string, number> = {};
        currentMonthTransactions
            .filter(t => t.type === 'expense')
            .forEach((t) => {
                const category = categories.find(c => c.id === t.category);
                const topLevelCategoryId = category?.parentId || t.category;
                const categoryLabel = categories.find(c => c.id === topLevelCategoryId)?.label ?? topLevelCategoryId;
                categoryMap[categoryLabel] = (categoryMap[categoryLabel] || 0) + t.amount;
            });

        return Object.entries(categoryMap)
            .map(([name, value], index) => ({
                name,
                value,
                fill: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);
    }, [currentMonthTransactions, categories]);

     // Budget vs Actual Spending Data
    const budgetVsActualData = React.useMemo(() => {
        return currentMonthBudgets
            .filter(b => b.category !== 'savings') // Exclude savings budget
            .map(budget => {
                 const categoryInfo = categories.find(c => c.id === budget.category);
                 return {
                    name: categoryInfo?.label ?? budget.category,
                    Budgeted: budget.limit,
                    Spent: budget.spent,
                 };
            })
            .sort((a, b) => b.Budgeted - a.Budgeted); // Sort by budgeted amount
    }, [currentMonthBudgets, categories]);


    // --- Comparison Calculations ---
    const expenseChange = currentMonthTotals.expenses - previousMonthTotals.expenses;
    const expenseChangePercent = previousMonthTotals.expenses > 0 ? (expenseChange / previousMonthTotals.expenses) * 100 : (currentMonthTotals.expenses > 0 ? Infinity : 0);
    const savingsChange = currentMonthTotals.actualSavings - previousMonthTotals.actualSavings;
    const savingsChangePercent = previousMonthTotals.actualSavings !== 0 ? (savingsChange / previousMonthTotals.actualSavings) * 100 : (currentMonthTotals.actualSavings > 0 ? Infinity : 0);

    const formatPercentage = (value: number): string => {
        if (value === Infinity) return "(vs $0)";
        if (isNaN(value) || Math.abs(value) === Infinity) return "(N/A)";
        return `(${value >= 0 ? '+' : ''}${value.toFixed(1)}%)`;
    };


    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(currentMonthTotals.expenses)}</div>
                        <p className={`text-xs ${expenseChange >= 0 ? 'text-destructive' : 'text-accent'}`}>
                            {expenseChange >= 0 ? '+' : ''}{formatCurrency(expenseChange)} {formatPercentage(expenseChangePercent)} vs last month
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(currentMonthTotals.actualSavings)}</div>
                         <p className={`text-xs ${savingsChange >= 0 ? 'text-accent' : 'text-destructive'}`}>
                            {savingsChange >= 0 ? '+' : ''}{formatCurrency(savingsChange)} {formatPercentage(savingsChangePercent)} vs last month
                         </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
                        <Scale className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">{formatCurrency(currentMonthTotals.income - currentMonthTotals.expenses)}</div>
                        <p className="text-xs text-muted-foreground">
                           Income: {formatCurrency(currentMonthTotals.income)} | Expenses: {formatCurrency(currentMonthTotals.expenses)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Income vs Expense Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Overview Trend</CardTitle>
                    <CardDescription>Income vs Expenses vs Savings over the last 2 months.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value)}`}/>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}} />
                            <Bar dataKey="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Savings" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

              {/* Budget vs Actual Spending */}
            <Card>
                <CardHeader>
                    <CardTitle>Budget vs Actual Spending</CardTitle>
                    <CardDescription>Comparison of budgeted amounts and actual expenses for {format(new Date(currentMonth + '-01T00:00:00'), 'MMMM yyyy')}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {budgetVsActualData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={budgetVsActualData} layout="vertical" barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                                <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={80} interval={0} />
                                <Tooltip formatter={(value: number, name: string) => [`${formatCurrency(value)}`, name]}/>
                                <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}} />
                                <Bar dataKey="Budgeted" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} background={{ fill: 'hsl(var(--muted)/0.5)', radius: 4 }} />
                                <Bar dataKey="Spent" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">No budget data to compare for this month.</p>
                    )}
                </CardContent>
            </Card>

             {/* Spending by Category Pie Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                    <CardDescription>Spending by category for {format(new Date(currentMonth + '-01T00:00:00'), 'MMMM yyyy')}.</CardDescription>
                </CardHeader>
                <CardContent>
                     {spendingByCategory.length > 0 ? (
                         <ResponsiveContainer width="100%" height={300}>
                             <PieChart>
                                 <Pie
                                     data={spendingByCategory}
                                     cx="50%"
                                     cy="50%"
                                     labelLine={false}
                                     // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                     outerRadius={80}
                                     fill="#8884d8"
                                     dataKey="value"
                                     nameKey="name"
                                     stroke="hsl(var(--border))"
                                 >
                                     {spendingByCategory.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.fill} />
                                     ))}
                                 </Pie>
                                 <Tooltip formatter={(value: number) => formatCurrency(value)}/>
                                  <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                             </PieChart>
                         </ResponsiveContainer>
                     ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No expense data available for this month.</p>
                     )}
                </CardContent>
            </Card>

             {/* Add more insight components as needed */}
             {/* e.g., Savings Rate Trend, Debt Progress (if applicable) */}

        </div>
    );
};
