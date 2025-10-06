
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Budget, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { getCategoryIconComponent } from '@/components/category-icon';
import { AlertTriangle, CheckCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface BudgetCardProps {
  budget: Budget;
  categories: Category[];
  onEdit: (budgetId: string) => void;
  onDelete: (budgetId: string) => void;
}

const BudgetCard: FC<BudgetCardProps> = ({ budget, categories, onEdit, onDelete }) => {
  const categoryInfo = categories.find(cat => cat.id === budget.category);
  const IconComponent = getCategoryIconComponent(categoryInfo?.icon ?? 'HelpCircle');

  const progressPercent = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  const remaining = budget.limit - budget.spent;
  const isOverBudget = remaining < 0;
  const isSavings = budget.category === 'savings';

  const displayPercentage = isSavings ? 'Auto' : (budget.percentage !== undefined ? `${budget.percentage.toFixed(1)}%` : '-');
  const displayLimit = formatCurrency(budget.limit);
  const displaySpent = formatCurrency(budget.spent);
  const displayRemaining = formatCurrency(remaining);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow border-l-4 rounded-lg"
          style={{ borderLeftColor: isOverBudget ? 'hsl(var(--destructive))' : (isSavings ? 'hsl(var(--accent))' : 'hsl(var(--primary))') }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <IconComponent className={cn("h-6 w-6 mt-1 flex-shrink-0", isSavings ? "text-accent" : "text-primary")} />
          <div className="min-w-0">
              <CardTitle className="text-base font-medium truncate">{categoryInfo?.label ?? budget.category}</CardTitle>
              <CardDescription className={cn("text-sm font-semibold", isSavings ? "text-accent" : "text-primary")}>
                 {displayPercentage}
                 {!isSavings && budget.percentage !== undefined && ` of Income`}
                 {isSavings && ` (Leftover)`}
              </CardDescription>
          </div>
        </div>

        <div className="flex-shrink-0">
          {!isSavings ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Budget Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(budget.id)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Budget
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(budget.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Budget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : <div className="h-8 w-8"></div>}
        </div>
      </CardHeader>
      <CardContent className="pt-2 px-4 pb-3">
         <div className="text-right mb-1">
            <p className="text-sm font-semibold">{displaySpent} / {displayLimit}</p>
          </div>
        <Progress
            value={progressPercent}
            aria-label={`${progressPercent.toFixed(1)}% of budget used`}
            className={cn(
                "h-2 [&>div]:rounded-full",
                isOverBudget ? "[&>div]:bg-destructive" : (isSavings ? "[&>div]:bg-accent" : "[&>div]:bg-primary")
            )}
        />
        <div className="flex justify-between items-center mt-1">
             <p className="text-xs text-muted-foreground">{progressPercent.toFixed(1)}% Used</p>
             <p className={cn(
                "text-xs font-medium flex items-center gap-1",
                isOverBudget ? "text-destructive" : (isSavings ? "text-accent" : "text-emerald-600")
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
