"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Budget } from '@/types';
import { cn } from '@/lib/utils';
import CategoryIcon, { getCategoryByValue } from '@/components/category-icon';

interface BudgetCardProps {
  budget: Budget;
}

const BudgetCard: FC<BudgetCardProps> = ({ budget }) => {
  const progress = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  const remaining = budget.limit - budget.spent;
  const isOverBudget = remaining < 0;
  const categoryInfo = getCategoryByValue(budget.category);

  // Format currency (replace with a more robust solution if needed)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {categoryInfo && <CategoryIcon categoryValue={categoryInfo.value} className="text-muted-foreground" />}
          <CardTitle className="text-sm font-medium">{categoryInfo?.label ?? budget.category}</CardTitle>
        </div>
        <CardDescription className="text-xs">
          {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className={cn("h-2", isOverBudget ? "bg-destructive [&>*]:bg-destructive" : "[&>*]:bg-primary")} />
        <p className={cn(
          "text-xs mt-2",
          isOverBudget ? "text-destructive" : "text-muted-foreground"
        )}>
          {isOverBudget
            ? `${formatCurrency(Math.abs(remaining))} Over Budget`
            : `${formatCurrency(remaining)} Remaining`}
        </p>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;
