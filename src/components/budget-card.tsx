

"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Budget, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils'; // Import formatCurrency
import { getCategoryIconComponent } from '@/components/category-icon';
import { AlertTriangle, CheckCircle } from 'lucide-react'; // Icons for status

interface BudgetCardProps {
  budget: Budget;
  categories: Category[];
  monthlyIncome: number | null;
}

const BudgetCard: FC<BudgetCardProps> = ({ budget, categories, monthlyIncome }) => {
  const categoryInfo = categories.find(cat => cat.id === budget.category);
  const IconComponent = getCategoryIconComponent(categoryInfo?.icon ?? 'HelpCircle'); // Provide fallback icon

  // Calculate progress based on percentage spent vs limit
  const progressPercent = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  const remaining = budget.limit - budget.spent;
  const isOverBudget = remaining < 0;
  const isSavings = budget.category === 'savings';

  // Determine display percentage (use 'Auto' for Savings)
  const displayPercentage = isSavings ? 'Auto' : (budget.percentage !== undefined ? `${budget.percentage.toFixed(1)}%` : '-');
  const displayLimit = formatCurrency(budget.limit);
  const displaySpent = formatCurrency(budget.spent);
  const displayRemaining = formatCurrency(remaining);

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow border-l-4"
          style={{ borderLeftColor: isOverBudget ? 'hsl(var(--destructive))' : (isSavings ? 'hsl(var(--accent))' : 'hsl(var(--primary))') }}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-3 px-4">
        {/* Left side: Icon, Title, Percentage */}
        <div className="flex items-center gap-3">
          <IconComponent className={cn("h-6 w-6 mt-1", isSavings ? "text-accent" : "text-primary")} />
          <div>
              <CardTitle className="text-base font-medium">{categoryInfo?.label ?? budget.category}</CardTitle>
               {/* Display percentage clearly */}
              <CardDescription className={cn("text-sm font-semibold", isSavings ? "text-accent" : "text-primary")}>
                 {displayPercentage}
                 {!isSavings && budget.percentage !== undefined && ` of Income`}
                 {isSavings && ` (Leftover)`}
              </CardDescription>
          </div>
        </div>
         {/* Right side: Monetary values */}
         <div className="text-right flex flex-col items-end flex-shrink-0 pl-2">
            <p className="text-sm font-semibold">{displaySpent} Spent</p>
             <p className="text-xs text-muted-foreground">Limit: {displayLimit}</p>
         </div>
      </CardHeader>
      <CardContent className="pt-2 px-4 pb-3">
         {/* Progress bar shows percentage completion */}
        <Progress
            value={progressPercent}
            aria-label={`${progressPercent.toFixed(1)}% of budget used`}
            className={cn(
                "h-2 [&>div]:rounded-full", // Use div for indicator styling if needed
                isOverBudget ? "[&>div]:bg-destructive" : (isSavings ? "[&>div]:bg-accent" : "[&>div]:bg-primary")
            )}
        />
         {/* Percentage Used + Remaining Amount/Overspent */}
        <div className="flex justify-between items-center mt-1">
             <p className="text-xs text-muted-foreground">{progressPercent.toFixed(1)}% Used</p>
             <p className={cn(
                "text-xs font-medium flex items-center gap-1",
                isOverBudget ? "text-destructive" : (isSavings ? "text-accent" : "text-accent") // Green for remaining/savings
                )}>
                 {isOverBudget ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                {isOverBudget
                    ? `${formatCurrency(Math.abs(remaining))} Over`
                    : `${displayRemaining} Left`}
            </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;
```

