"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Budget, Category } from '@/types';
import { cn } from '@/lib/utils';
import CategoryIcon, { getCategoryIconComponent } from '@/components/category-icon'; // Use new CategoryIcon logic

interface BudgetCardProps {
  budget: Budget;
  categories: Category[];
  monthlyIncome: number | null;
}

const BudgetCard: FC<BudgetCardProps> = ({ budget, categories, monthlyIncome }) => {
  const categoryInfo = categories.find(cat => cat.id === budget.category);
  const IconComponent = getCategoryIconComponent(categoryInfo?.icon);

  // Calculate progress based on percentage if available and valid, otherwise fallback to monetary limit
  let progress = 0;
  if (budget.percentage !== undefined && monthlyIncome && monthlyIncome > 0) {
      // Calculate spent percentage relative to the income allocated by budget percentage
      const allocatedAmount = (budget.percentage / 100) * monthlyIncome;
      progress = allocatedAmount > 0 ? Math.min((budget.spent / allocatedAmount) * 100, 100) : 0;
  } else if (budget.limit > 0) {
      // Fallback to monetary progress if percentage is not usable
      progress = Math.min((budget.spent / budget.limit) * 100, 100);
  }

  const remaining = budget.limit - budget.spent;
  const isOverBudget = remaining < 0;

  // Format currency (replace with a more robust solution if needed)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const displayPercentage = budget.percentage !== undefined ? `${budget.percentage.toFixed(1)}%` : '-';
  const displayLimit = formatCurrency(budget.limit);
  const displaySpent = formatCurrency(budget.spent);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <IconComponent className="text-muted-foreground h-5 w-5 mt-1" />
          <div>
              <CardTitle className="text-base font-medium">{categoryInfo?.label ?? budget.category}</CardTitle>
              {budget.category !== 'savings' && ( // Don't show percentage for savings
                   <CardDescription className="text-xs">
                        Budget: {displayPercentage} ({displayLimit})
                   </CardDescription>
               )}
                {budget.category === 'savings' && ( // Show only limit for savings
                   <CardDescription className="text-xs">
                        Budget: {displayLimit}
                   </CardDescription>
               )}

          </div>
        </div>
         <div className="text-right">
            <p className="text-sm font-semibold">{displaySpent}</p>
             <p className={cn(
                "text-xs mt-1",
                isOverBudget ? "text-destructive" : "text-muted-foreground"
                )}>
                {isOverBudget
                    ? `${formatCurrency(Math.abs(remaining))} Over`
                    : `${formatCurrency(remaining)} Left`}
            </p>
         </div>

      </CardHeader>
      <CardContent className="pt-2">
        <Progress value={progress} aria-label={`${progress.toFixed(0)}% spent`} className={cn("h-2", isOverBudget ? "bg-destructive [&>*]:bg-destructive" : "[&>*]:bg-primary")} />
         <p className="text-xs text-muted-foreground mt-1 text-right">{progress.toFixed(1)}% of budget spent</p>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;
