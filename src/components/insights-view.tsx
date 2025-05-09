"use client";

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import type { Transaction, Budget, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Scale, PiggyBank, Info, BarChartHorizontalBig, PieChart as PieIcon } from 'lucide-react'; // More specific icons
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"; // Use ShadCN Chart components

interface InsightsViewProps {
    currentMonth: string; // "yyyy-MM"
    previousMonth: string; // "yyyy-MM"
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
    monthlyIncome: number | null;
}

// Consistent colors for charts from globals.css
const chartColors = {
    income: "hsl(var(--chart-2))", // Greenish for income/savings
    expenses: "hsl(var(--chart-5))", // Reddish for expenses
    savings: "hsl(var(--chart-3))", // Yellowish/other for savings
    budgeted: "hsl(var(--chart-4))", // Orangish for budgeted
    spent: "hsl(var(--chart-1))", // Blue for spent
};

// Define chart configs for legends and tooltips
const comparisonChartConfig = {
  Income: { label: "Income", color: chartColors.income },
  Expenses: { label: "Expenses", color: chartColors.expenses },
  Savings: { label: "Net Savings", color: chartColors.savings },
} satisfies ChartConfig;

const budgetVsActualChartConfig = {
  Budgeted: { label: "Budgeted", color: chartColors.budgeted },
  Spent: { label: "Spent", color: chartColors.spent },
} satisfies ChartConfig;

// Predefined ShadCN chart colors
const CHART_COLORS_SHADCN = [
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

     // Find previous month's income. Needs a reliable source.
     // Option 1: Assume income transactions accurately reflect total income (might not be true)
     // const previousMonthIncome = previousMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
     // Option 2: Find a specific 'income' budget if stored that way (less likely with current setup)
     // Option 3: Assume income is stable or use current as fallback (simplest for now)
     const previousMonthIncome = monthlyIncome; // Using current as fallback - Needs review based on how income changes are handled


    // Calculate totals for each month
    const currentMonthTotals = React.useMemo(() => {
        const income = monthlyIncome ?? 0; // Use set income
        const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        // Net Savings = Income - Expenses
        const actualSavings = income - expenses; 
        return { income, expenses, actualSavings };
    }, [monthlyIncome, currentMonthTransactions]);

    const previousMonthTotals = React.useMemo(() => {
        const income = previousMonthIncome ?? 0;
        const expenses = previousMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const actualSavings = income - expenses;
        return { income, expenses, actualSavings };
    }, [previousMonthIncome, previousMonthTransactions]);


    // --- Chart Data Preparation ---

    // Income vs Expense vs Savings Chart Data
    const comparisonData = React.useMemo(() => [
        { name: format(new Date(previousMonth + '-01T00:00:00'), 'MMM yyyy'), Income: previousMonthTotals.income, Expenses: previousMonthTotals.expenses, Savings: previousMonthTotals.actualSavings },
        { name: format(new Date(currentMonth + '-01T00:00:00'), 'MMM yyyy'), Income: currentMonthTotals.income, Expenses: currentMonthTotals.expenses, Savings: currentMonthTotals.actualSavings },
    ].filter(d => d.Income > 0 || d.Expenses > 0 || d.Savings !== 0) // Filter out months with no data or zero savings for clarity
    , [currentMonth, previousMonth, currentMonthTotals, previousMonthTotals]);

    // Spending by Category (Current Month) - Use top-level categories
    const spendingByCategory = React.useMemo(() => {
        const categoryMap: Record<string, { total: number; parentLabel: string, parentId: string }> = {};
        currentMonthTransactions
            .filter(t => t.type === 'expense')
            .forEach((t) => {
                const categoryInfo = categories.find(c => c.id === t.category);
                const parentId = categoryInfo?.parentId || t.category; // Use parent or self if top-level
                const parentLabel = categories.find(c => c.id === parentId)?.label ?? parentId;

                if (!categoryMap[parentId]) {
                    categoryMap[parentId] = { total: 0, parentLabel: parentLabel, parentId: parentId };
                }
                categoryMap[parentId].total += t.amount;
            });

        // Sort, assign colors, prepare for Recharts and ShadCN config
         const sortedData = Object.values(categoryMap)
            .map(({ total, parentLabel, parentId }, index) => ({
                name: parentLabel, // Use label for display
                value: total,
                fill: CHART_COLORS_SHADCN[index % CHART_COLORS_SHADCN.length], // Use predefined ShadCN colors
                category: parentId, // Keep track of original ID for config lookup if needed
            }))
            .sort((a, b) => b.value - a.value); // Sort descending by amount

        // Generate config dynamically
        const pieChartConfig: ChartConfig = sortedData.reduce((config, item) => {
            config[item.name] = { label: item.name, color: item.fill };
            return config;
        }, {} as ChartConfig);

        return { data: sortedData, config: pieChartConfig };

    }, [currentMonthTransactions, categories]);

     // Budget vs Actual Spending Data
    const budgetVsActualData = React.useMemo(() => {
        return currentMonthBudgets
            .filter(b => b.category !== 'savings' && (b.limit > 0 || b.spent > 0)) // Exclude savings & zero budgets/spending
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
     // Avoid division by zero or misleading percentages if previous savings were zero or negative
    const savingsChangePercent = previousMonthTotals.actualSavings !== 0 ? (savingsChange / previousMonthTotals.actualSavings) * 100 : (currentMonthTotals.actualSavings !== 0 ? Infinity : 0);


    const formatPercentage = (value: number): string => {
        if (!isFinite(value)) return "(vs ₱0)"; // Handle Infinity
        if (isNaN(value)) return "(N/A)";
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
                            {isFinite(expenseChangePercent) || currentMonthTotals.expenses > 0 ? (
                                <>
                                    {expenseChange >= 0 ? '+' : ''}{formatCurrency(expenseChange)} {formatPercentage(expenseChangePercent)} vs last month
                                </>
                             ) : (
                                 "No change or data unavailable"
                             )}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(currentMonthTotals.actualSavings)}</div>
                         <p className={`text-xs ${savingsChange >= 0 ? 'text-accent' : 'text-destructive'}`}>
                            {isFinite(savingsChangePercent) || currentMonthTotals.actualSavings !== 0 ? (
                                <>
                                    {savingsChange >= 0 ? '+' : ''}{formatCurrency(savingsChange)} {formatPercentage(savingsChangePercent)} vs last month
                                </>
                             ) : (
                                 "No change or data unavailable"
                             )}
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
                        <p className="text-xs text-muted-foreground truncate">
                           Income: {formatCurrency(currentMonthTotals.income)} | Expenses: {formatCurrency(currentMonthTotals.expenses)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Income vs Expense Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Overview Trend</CardTitle>
                    <CardDescription>Income vs Expenses vs Net Savings compared to last month.</CardDescription>
                </CardHeader>
                <CardContent>
                    {comparisonData.length > 0 ? (
                        <ChartContainer config={comparisonChartConfig} className="aspect-video max-h-[300px]">
                            <BarChart data={comparisonData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} fontSize={12} />
                                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" />}
                                    formatter={(value) => formatCurrency(value as number)}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="Income" fill={chartColors.income} radius={4} />
                                <Bar dataKey="Expenses" fill={chartColors.expenses} radius={4} />
                                <Bar dataKey="Savings" name="Net Savings" fill={chartColors.savings} radius={4} />
                            </BarChart>
                        </ChartContainer>
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">Not enough data for comparison.</p>
                    )}
                </CardContent>
            </Card>

              {/* Budget vs Actual Spending */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="h-5 w-5 text-primary"/> Budget vs Actual Spending</CardTitle>
                    <CardDescription>Comparison of budgeted amounts and actual expenses for {format(new Date(currentMonth + '-01T00:00:00'), 'MMMM yyyy')}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {budgetVsActualData.length > 0 ? (
                         <ChartContainer config={budgetVsActualChartConfig} className="aspect-video max-h-[300px]">
                            <BarChart data={budgetVsActualData} layout="vertical" barSize={15} margin={{ right: 20 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={80} interval={0} />
                                <ChartTooltip
                                     cursor={false}
                                     content={<ChartTooltipContent hideLabel />}
                                     formatter={(value) => formatCurrency(value as number)}
                                 />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="Budgeted" fill={chartColors.budgeted} radius={4} />
                                <Bar dataKey="Spent" fill={chartColors.spent} radius={4}/>
                            </BarChart>
                        </ChartContainer>
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">No budgets set to compare for this month.</p>
                    )}
                </CardContent>
            </Card>

             {/* Spending by Category Pie Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieIcon className="h-5 w-5 text-primary"/> Expense Breakdown</CardTitle>
                    <CardDescription>Spending by top-level category for {format(new Date(currentMonth + '-01T00:00:00'), 'MMMM yyyy')}.</CardDescription>
                </CardHeader>
                <CardContent>
                     {spendingByCategory.data.length > 0 ? (
                         <ChartContainer config={spendingByCategory.config} className="aspect-square max-h-[300px]">
                             <PieChart>
                                <ChartTooltip
                                     cursor={false}
                                     content={<ChartTooltipContent hideLabel indicator="dot" />}
                                     formatter={(value) => formatCurrency(value as number)}
                                 />
                                 <Pie
                                     data={spendingByCategory.data}
                                     dataKey="value"
                                     nameKey="name"
                                     cx="50%"
                                     cy="50%"
                                     outerRadius={80}
                                     innerRadius={50} // Make it a donut chart
                                     strokeWidth={2}
                                     labelLine={false}
                                     label={({ percent }) => `${(percent * 100).toFixed(0)}%`} // Simple percentage label
                                 >
                                      {spendingByCategory.data.map((entry) => (
                                         <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                     ))}
                                 </Pie>
                                 <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
                             </PieChart>
                         </ChartContainer>
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

