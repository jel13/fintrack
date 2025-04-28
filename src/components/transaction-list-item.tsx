"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';
import CategoryIcon, { getCategoryByValue } from '@/components/category-icon';
import { TrendingUp, TrendingDown } from 'lucide-react'; // Import specific icons


interface TransactionListItemProps {
  transaction: Transaction;
}

const TransactionListItem: FC<TransactionListItemProps> = ({ transaction }) => {
  const isIncome = transaction.type === 'income';
  const categoryInfo = getCategoryByValue(transaction.category);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Determine which icon component to use
  const IconComponent = isIncome ? TrendingUp : (categoryInfo?.icon || TrendingDown); // Default to TrendingDown for expense if no specific icon

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
         <div className={cn(
            "rounded-full p-2",
             isIncome ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
            )}>
            <IconComponent className="h-5 w-5" />
         </div>

        <div>
          <p className="text-sm font-medium capitalize">
            {categoryInfo?.label || transaction.category.replace('_', ' ')}
          </p>
          <p className="text-xs text-muted-foreground">
             {transaction.description || format(transaction.date, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="text-right">
         <p className={cn(
            "text-sm font-semibold",
            isIncome ? "text-accent" : "text-foreground"
         )}>
           {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
         </p>
          {transaction.description && (
             <p className="text-xs text-muted-foreground">{format(transaction.date, 'p')}</p>
          )}
      </div>
    </div>
  );
};

export default TransactionListItem;
