

"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Budget, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils'; // Import formatCurrency
import { getCategoryIconComponent } from '@/components/category-icon';

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

  // Determine display percentage (use '-' if undefined, especially for Savings)
  const displayPercentage = budget.percentage !== undefined ? `${budget.percentage.toFixed(1)}%` : 'Auto';
  const displayLimit = formatCurrency(budget.limit);
  const displaySpent = formatCurrency(budget.spent);
  const displayRemaining = formatCurrency(remaining);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        {/* Left side: Icon, Title, Percentage */}
        <div className="flex items-center gap-3">
          <IconComponent className="text-primary h-6 w-6 mt-1" />
          <div>
              <CardTitle className="text-base font-medium">{categoryInfo?.label ?? budget.category}</CardTitle>
              <CardDescription className="text-sm font-semibold text-primary">
                  {displayPercentage}
                  {budget.percentage !== undefined && ` of Income`}
              </CardDescription>
          </div>
        </div>
         {/* Right side: Monetary values */}
         <div className="text-right flex flex-col items-end">
            <p className="text-sm font-semibold">{displaySpent} Spent</p>
             <p className="text-xs text-muted-foreground">Limit: {displayLimit}</p>
             <p className={cn(
                "text-xs mt-1 font-medium",
                isOverBudget ? "text-destructive" : "text-accent" // Green for remaining
                )}>
                {isOverBudget
                    ? `${formatCurrency(Math.abs(remaining))} Over`
                    : `${displayRemaining} Left`}
            </p>
         </div>

      </CardHeader>
      <CardContent className="pt-2">
         {/* Progress bar shows percentage completion */}
        <Progress
            value={progressPercent}
            aria-label={`${progressPercent.toFixed(1)}% of budget used`}
            className={cn(
                "h-2",
                isOverBudget ? "[&>*]:bg-destructive" : "[&>*]:bg-primary" // Destructive color if over budget
            )}
        />
         <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercent.toFixed(1)}% Used</p>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;

