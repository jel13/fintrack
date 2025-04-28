"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react"; // Import TrendingDown
import { Label, Pie, PieChart, Cell } from "recharts";

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
import type { Transaction } from "@/types";
import { getCategoryByValue } from "@/components/category-icon";


// Define a consistent color mapping (can be expanded)
const CATEGORY_COLORS: Record<string, string> = {
  groceries: "hsl(var(--chart-1))",
  housing: "hsl(var(--chart-2))",
  food: "hsl(var(--chart-3))",
  transport: "hsl(var(--chart-4))",
  clothing: "hsl(var(--chart-5))",
  gifts: "hsl(var(--chart-1))", // Re-use colors or add more chart vars
  health: "hsl(var(--chart-2))",
  travel: "hsl(var(--chart-3))",
  other_expense: "hsl(var(--chart-4))",
  other: "hsl(var(--chart-5))",
  // Add more as needed
};

interface SpendingChartProps {
  transactions: Transaction[];
  month: string; // e.g., "2024-07"
}

export function SpendingChart({ transactions, month }: SpendingChartProps) {
   const monthlyExpenses = React.useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'expense' &&
        format(t.date, 'yyyy-MM') === month
    );
  }, [transactions, month]);


  const spendingByCategory = React.useMemo(() => {
    const categoryMap: Record<string, number> = {};
    monthlyExpenses.forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({
        name: getCategoryByValue(category)?.label || category.replace('_', ' '), // Use label if available
        value: amount,
        fill: CATEGORY_COLORS[category] || "hsl(var(--muted))", // Fallback color
        categoryKey: category, // Store original key
      }))
      .sort((a, b) => b.value - a.value); // Sort descending by amount
  }, [monthlyExpenses]);


  const totalMonthlySpending = React.useMemo(
    () => spendingByCategory.reduce((sum, item) => sum + item.value, 0),
    [spendingByCategory]
  );

  const chartConfig = React.useMemo(() => {
    const config: any = {};
    spendingByCategory.forEach((item) => {
        const categoryInfo = getCategoryByValue(item.categoryKey);
        config[item.name] = {
            label: item.name,
            color: item.fill,
            icon: categoryInfo?.icon,
        };
    });
    return config;
   }, [spendingByCategory]);


    // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };


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
               activeIndex={0} // Optional: highlight the largest slice
               // activeShape={({ outerRadius = 0, ...props }) => ( // Custom active shape if needed
               //   <g>
               //     <Sector {...props} outerRadius={outerRadius + 10} />
               //     <Sector {...props} outerRadius={outerRadius} />
               //   </g>
               // )}
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
        <div className="flex items-center gap-2 font-medium leading-none">
          Review your spending habits for {format(new Date(month + '-01'), 'MMMM')}.
        </div>
        {spendingByCategory.length > 0 && (
          <div className="leading-none text-muted-foreground w-full max-w-xs mx-auto">
            {/* Optionally list top 3 categories */}
            {spendingByCategory.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-xs py-1 border-b last:border-0">
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

// Helper imports if not globally available
import { format } from 'date-fns';
import { Sector } from 'recharts'; // Needed if using activeShape
