
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import type { Transaction, Category, SavingGoal } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { getCategoryIconComponent } from '@/components/category-icon';
import { TrendingUp, Paperclip, Edit, Trash2, MoreVertical } from 'lucide-react'; 
import { Button } from "@/components/ui/button"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; 


interface TransactionListItemProps {
  transaction: Transaction;
  categories: Category[];
  savingGoals: SavingGoal[];
  onViewReceipt: (transactionId: string) => void;
  onEdit: (transactionId: string) => void;
  onDelete: (transactionId: string) => void;
}

const TransactionListItem: FC<TransactionListItemProps> = ({ transaction, categories, savingGoals, onViewReceipt, onEdit, onDelete }) => {
  const isIncome = transaction.type === 'income';
  
  let itemLabel = transaction.category;
  let itemIconName = 'HelpCircle';
  let isSavingGoalContribution = false;

  const savingGoal = savingGoals.find(sg => sg.id === transaction.category);
  if (savingGoal) {
    itemLabel = savingGoal.name;
    const savingGoalCategoryDetails = categories.find(c => c.id === savingGoal.goalCategoryId); // Assuming saving goal categories are within main categories for icon
    itemIconName = savingGoalCategoryDetails?.icon || 'PiggyBank';
    isSavingGoalContribution = true;
  } else {
    const categoryInfo = categories.find(cat => cat.id === transaction.category);
    if (categoryInfo) {
        itemLabel = categoryInfo.label;
        itemIconName = categoryInfo.icon;
    }
  }

  const IconComponent = isIncome ? TrendingUp : getCategoryIconComponent(itemIconName);
  const iconBgColor = isIncome || isSavingGoalContribution ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary';


  return (
    <div className="group flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-secondary/50 transition-colors">
      <div 
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => onViewReceipt(transaction.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onViewReceipt(transaction.id); }}
        aria-label={`View details for transaction: ${itemLabel}`}
      >
         <div className={cn(
            "rounded-full p-1.5 flex-shrink-0 flex items-center justify-center h-8 w-8",
            iconBgColor
            )}>
            <IconComponent className="h-4 w-4" />
         </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium capitalize truncate">
                    {itemLabel}
                </p>
                {transaction.receiptDataUrl && <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" titleAccess="Receipt attached" />}
            </div>
           {transaction.description && (
                <p className="text-xs text-muted-foreground truncate">
                    {transaction.description}
                </p>
           )}
        </div>
      </div>
      <div className="text-right pl-2 flex-shrink-0 flex items-center gap-1">
        <div 
          className="cursor-pointer"
          onClick={() => onViewReceipt(transaction.id)}
          role="button"
          tabIndex={-1} // Avoid double tabbing
        >
            <p className={cn(
                "text-sm font-semibold",
                isIncome || isSavingGoalContribution ? "text-accent" : "text-foreground" // Use accent for savings goal contributions too
            )}>
            {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
            </p>
            <p className="text-xs text-muted-foreground">{format(transaction.date, 'MMM d')}</p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-full" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onEdit(transaction.id)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TransactionListItem;
