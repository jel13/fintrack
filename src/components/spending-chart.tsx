

"use client";

import * as React from "react";
import { TrendingDown, PieChart as PieIcon } from "lucide-react"; // Use PieIcon
import { Label, Pie, PieChart, Cell } from "recharts";
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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import type { Transaction, Category } from "@/types";
import { getCategoryIconComponent } from "@/components/category-icon";
import { formatCurrency, cn } from "@/lib/utils"; // Import formatCurrency and cn


// Define a consistent color mapping using CSS variables from globals.css
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface SpendingChartProps {
  transactions: Transaction[];
  month: string; // e.g., "2024-07"
  categories: Category[]; // Pass relevant expense categories (excluding parents initially)
}

export function SpendingChart({ transactions, month, categories }: SpendingChartProps) {
   const monthlyExpenses = React.useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'expense' &&
        format(t.date, 'yyyy-MM') === month
    );
  }, [transactions, month]);

   // Helper to find top-level parent category for aggregation
   const findTopLevelCategory = (categoryId: string, allCategories: Category[]): Category | undefined => {
       let current = allCategories.find(c => c.id === categoryId);
       if (!current) return undefined;
       while (current.parentId) {
           const parent = allCategories.find(c => c.id === current?.parentId);
           if (!parent) break; // Should not happen if data is consistent
           current = parent;
       }
       return current;
   };

  const spendingByCategory = React.useMemo(() => {
    const categoryMap: Record<string, { total: number; label: string; icon?: string }> = {};
    monthlyExpenses.forEach((t) => {
      const topLevelCat = findTopLevelCategory(t.category, categories);
      const categoryId = topLevelCat?.id ?? t.category; // Use top-level ID or original if not found/already top
      const categoryLabel = topLevelCat?.label ?? categoryId; // Use label or ID as fallback
      const categoryIcon = topLevelCat?.icon;

      if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = { total: 0, label: categoryLabel, icon: categoryIcon };
      }
      categoryMap[categoryId].total += t.amount;
    });

     // Sort, assign colors, prepare for Recharts and ShadCN config
    const sortedData = Object.entries(categoryMap)
      .map(([categoryId, data], index) => ({
        name: data.label, // Use label for display name
        value: data.total,
        fill: CHART_COLORS[index % CHART_COLORS.length], // Cycle through defined colors
        iconName: data.icon, // Pass icon name for config
        category: categoryId, // Store original ID for potential lookup
      }))
      .sort((a, b) => b.value - a.value); // Sort descending by amount

     // Generate config dynamically
    const chartConfig: ChartConfig = sortedData.reduce((config, item) => {
        config[item.name] = { // Use display name as key
            label: item.name,
            color: item.fill,
            icon: item.iconName ? getCategoryIconComponent(item.iconName) : undefined,
        };
        return config;
     }, {} as ChartConfig);


    return { data: sortedData, config: chartConfig };

  }, [monthlyExpenses, categories]);


  const totalMonthlySpending = React.useMemo(
    () => spendingByCategory.data.reduce((sum, item) => sum + item.value, 0),
    [spendingByCategory]
  );

  // Calculate previous month string
  const previousMonthDate = new Date(month + '-01T00:00:00'); // Ensure time part for correct month calculation
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
    : (totalMonthlySpending > 0 ? Infinity : 0); // Use Infinity for percentage if previous was 0 but current > 0

  const displaySpendingChangePercentage = () => {
     if (spendingChangePercentage === Infinity) return "(vs $0)";
     if (isNaN(spendingChangePercentage) || !isFinite(spendingChangePercentage)) return "(N/A)"; // Check for NaN and Infinity
     return `(${spendingChangePercentage >= 0 ? '+' : ''}${spendingChangePercentage.toFixed(1)}%)`;
  }


  return (
    <Card className="flex flex-col shadow-sm">
      <CardHeader className="items-center pb-0">
        <CardTitle className="flex items-center gap-2"><PieIcon className="h-5 w-5 text-primary" /> Spending Analysis</CardTitle>
        <CardDescription>{format(new Date(month + '-01T00:00:00'), 'MMMM yyyy')} - Expenses by Top-Level Category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {spendingByCategory.data.length > 0 ? (
         <ChartContainer
           config={spendingByCategory.config}
           className="mx-auto aspect-square max-h-[250px]"
         >
           <PieChart>
             <ChartTooltip
               cursor={false}
               content={<ChartTooltipContent hideLabel indicator="dot" nameKey="name" formatter={(value) => formatCurrency(value as number)}/>}
             />
             <Pie
               data={spendingByCategory.data}
               dataKey="value"
               nameKey="name" // Use display name for lookup in config
               innerRadius={60}
               outerRadius={80}
               strokeWidth={2}
               activeIndex={0} // Example: Highlight first slice initially
                // Removed activeShape for simplicity, can be added back if complex interaction needed
             >
               {spendingByCategory.data.map((entry) => (
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
                           y={viewBox.cy - 8} // Adjusted y position
                           className="fill-foreground text-2xl font-bold"
                         >
                           {formatCurrency(totalMonthlySpending)}
                         </tspan>
                         <tspan
                           x={viewBox.cx}
                           y={viewBox.cy + 12} // Adjusted y position
                           className="fill-muted-foreground text-xs"
                         >
                           Total Spent
                         </tspan>
                       </text>
                     )
                   }
                 }}
               />
             </Pie>
             {/* Add Legend */}
                <ChartLegend
                    content={<ChartLegendContent nameKey="name" className="text-xs flex-wrap justify-center"/>}
                    wrapperStyle={{ marginTop: '10px' }}
                 />
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
        {(totalMonthlySpending > 0 || previousMonthTotalSpending > 0) && (
            <div className="flex items-center justify-center gap-1 font-medium leading-none text-center text-xs border-t pt-2 w-full">
                Spending is {spendingChange === 0 ? 'unchanged' : (spendingChange > 0 ? 'up' : 'down')}
                <span className={cn(spendingChange === 0 ? 'text-muted-foreground' : (spendingChange > 0 ? 'text-destructive' : 'text-accent'))}>
                    {formatCurrency(Math.abs(spendingChange))} {displaySpendingChangePercentage()}
                </span>
                vs last month ({format(previousMonthDate, 'MMM')}).
            </div>
        )}

      </CardFooter>
    </Card>
  );
}

```

