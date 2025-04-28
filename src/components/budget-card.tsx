
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Budget, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils'; // Import formatCurrency
import CategoryIcon, { getCategoryIconComponent } from '@/components/category-icon';

interface BudgetCardProps {
  budget: Budget;
  categories: Category[];
  monthlyIncome: number | null;
}

const BudgetCard: FC<BudgetCardProps> = ({ budget, categories, monthlyIncome }) => {
  const categoryInfo = categories.find(cat => cat.id === budget.category);
  const IconComponent = getCategoryIconComponent(categoryInfo?.icon);

  // Calculate progress based on percentage spent vs percentage allocated
  let progressPercent = 0;
  if (budget.percentage !== undefined && budget.percentage > 0 && monthlyIncome && monthlyIncome > 0) {
      const spentPercentageOfIncome = (budget.spent / monthlyIncome) * 100;
      progressPercent = Math.min((spentPercentageOfIncome / budget.percentage) * 100, 100);
  } else if (budget.limit > 0) {
      // Fallback for 'Savings' or if percentage somehow missing
      progressPercent = Math.min((budget.spent / budget.limit) * 100, 100);
  }


  const remaining = budget.limit - budget.spent;
  const isOverBudget = remaining < 0;

  const displayPercentage = budget.percentage !== undefined ? `${budget.percentage.toFixed(1)}%` : '-';
  const displayLimit = formatCurrency(budget.limit);
  const displaySpent = formatCurrency(budget.spent);
  const displayRemaining = formatCurrency(remaining);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <IconComponent className="text-muted-foreground h-5 w-5 mt-1" />
          <div>
              <CardTitle className="text-base font-medium">{categoryInfo?.label ?? budget.category}</CardTitle>
               {/* Show percentage first */}
               <CardDescription className="text-xs">
                    Budget: {displayPercentage} ({displayLimit})
               </CardDescription>
          </div>
        </div>
         <div className="text-right">
            {/* Show monetary spent */}
            <p className="text-sm font-semibold">{displaySpent} Spent</p>
             <p className={cn(
                "text-xs mt-1",
                isOverBudget ? "text-destructive" : "text-muted-foreground"
                )}>
                {isOverBudget
                    ? `${formatCurrency(Math.abs(remaining))} Over`
                    : `${displayRemaining} Left`}
            </p>
         </div>

      </CardHeader>
      <CardContent className="pt-2">
         {/* Progress bar shows percentage completion */}
        <Progress value={progressPercent} aria-label={`${progressPercent.toFixed(0)}% spent`} className={cn("h-2", isOverBudget ? "bg-destructive [&>*]:bg-destructive" : "[&>*]:bg-primary")} />
         <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercent.toFixed(1)}% of budget used</p>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;
