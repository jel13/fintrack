"use client";

import * as React from "react";
import { TrendingDown } from "lucide-react";
import { Label, Pie, PieChart, Cell, Sector } from "recharts";
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Transaction, Category } from "@/types";
import { getCategoryIconComponent } from "@/components/category-icon";


// Define a consistent color mapping (can be expanded or made dynamic)
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))", // Added more colors
  "hsl(var(--accent))",
];

interface SpendingChartProps {
  transactions: Transaction[];
  month: string; // e.g., "2024-07"
  categories: Category[]; // Pass categories for label lookup
}

export function SpendingChart({ transactions, month, categories }: SpendingChartProps) {
   const monthlyExpenses = React.useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'expense' &&
        format(t.date, 'yyyy-MM') === month
    );
  }, [transactions, month]);

   const getCategoryLabel = (categoryId: string) => {
       const category = categories.find(c => c.id === categoryId);
       return category?.label ?? categoryId; // Fallback to ID if label not found
   }

   const getCategoryIcon = (categoryId: string) => {
       const category = categories.find(c => c.id === categoryId);
       return category?.icon; // Return icon name string
   }

  const spendingByCategory = React.useMemo(() => {
    const categoryMap: Record<string, number> = {};
    monthlyExpenses.forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryMap)
      .map(([categoryId, amount], index) => ({
        name: getCategoryLabel(categoryId), // Use label for display name
        value: amount,
        fill: CHART_COLORS[index % CHART_COLORS.length], // Cycle through defined colors
        categoryId: categoryId, // Store original ID
      }))
      .sort((a, b) => b.value - a.value); // Sort descending by amount
  }, [monthlyExpenses, categories]); // Add categories dependency


  const totalMonthlySpending = React.useMemo(
    () => spendingByCategory.reduce((sum, item) => sum + item.value, 0),
    [spendingByCategory]
  );

  const chartConfig = React.useMemo(() => {
    const config: any = {};
    spendingByCategory.forEach((item) => {
        const iconName = getCategoryIcon(item.categoryId);
        config[item.name] = { // Use display name as key for config
            label: item.name,
            color: item.fill,
            icon: iconName ? getCategoryIconComponent(iconName) : undefined, // Get component dynamically
        };
    });
    return config;
   }, [spendingByCategory, categories]); // Add categories dependency


    // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Calculate previous month string
  const previousMonthDate = new Date(month + '-01');
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = format(previousMonthDate, 'yyyy-MM');

  // Calculate previous month total spending
  const previousMonthTotalSpending = React.useMemo(() => {
     return transactions
       .filter(t => t.type === 'expense' && format(t.date, 'yyyy-MM') === previousMonth)
       .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, previousMonth]);

  const spendingChange = totalMonthlySpending - previousMonthTotalSpending;
  const spendingChangePercentage = previousMonthTotalSpending > 0
    ? ((spendingChange / previousMonthTotalSpending) * 100)
    : (totalMonthlySpending > 0 ? 100 : 0); // Handle division by zero

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Spending Analysis</CardTitle>
        <CardDescription>{format(new Date(month + '-01'), 'MMMM yyyy')} - Expenses by Category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {spendingByCategory.length > 0 ? (
         <ChartContainer
           config={chartConfig}
           className="mx-auto aspect-square max-h-[250px]"
         >
           <PieChart>
             <ChartTooltip
               cursor={false}
               content={<ChartTooltipContent hideLabel indicator="dot"/>}
             />
             <Pie
               data={spendingByCategory}
               dataKey="value"
               nameKey="name"
               innerRadius={60}
               strokeWidth={5}
             >
               {spendingByCategory.map((entry) => (
                   <Cell key={`cell-${entry.name}`} fill={entry.fill} />
               ))}
               <Label
                 content={({ viewBox }) => {
                   if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                     return (
                       <text
                         x={viewBox.cx}
                         y={viewBox.cy}
                         textAnchor="middle"
                         dominantBaseline="middle"
                       >
                         <tspan
                           x={viewBox.cx}
                           y={viewBox.cy}
                           className="fill-foreground text-3xl font-bold"
                         >
                           {formatCurrency(totalMonthlySpending)}
                         </tspan>
                         <tspan
                           x={viewBox.cx}
                           y={(viewBox.cy || 0) + 24}
                           className="fill-muted-foreground text-sm"
                         >
                           Total Spent
                         </tspan>
                       </text>
                     )
                   }
                 }}
               />
             </Pie>
           </PieChart>
         </ChartContainer>
         ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
               <TrendingDown className="h-12 w-12 mb-2" />
               <p>No expense data for this month.</p>
            </div>
        )}
      </CardContent>
       <CardFooter className="flex-col gap-2 text-sm pt-4">
        {/* Comparison with previous month */}
        <div className="flex items-center gap-2 font-medium leading-none">
          {previousMonthTotalSpending > 0 ? (
             <>
                Spending is {spendingChange >= 0 ? 'up' : 'down'} <span className={cn(spendingChange >= 0 ? 'text-destructive' : 'text-accent')}>{formatCurrency(Math.abs(spendingChange))} ({spendingChangePercentage.toFixed(1)}%)</span> vs last month.
             </>
          ) : (
             totalMonthlySpending > 0 ? 'First month with spending data.' : 'No spending data available.'
          )}
        </div>

        {/* Top categories list */}
        {spendingByCategory.length > 0 && (
          <div className="leading-none text-muted-foreground w-full max-w-xs mx-auto mt-2">
            <p className="text-center font-medium mb-1">Top Spending Categories:</p>
            {spendingByCategory.slice(0, 3).map((item) => (
              <div key={item.categoryId} className="flex justify-between text-xs py-1 border-b last:border-0">
                <span>{item.name}</span>
                <span>{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
