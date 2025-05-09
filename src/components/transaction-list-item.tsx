

"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import type { Transaction, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils'; 
import { getCategoryIconComponent } from '@/components/category-icon'; 
import { TrendingUp, TrendingDown, Paperclip } from 'lucide-react'; // Added Paperclip


interface TransactionListItemProps {
  transaction: Transaction;
  categories: Category[]; 
}

const TransactionListItem: FC<TransactionListItemProps> = ({ transaction, categories }) => {
  const isIncome = transaction.type === 'income';
  const categoryInfo = categories.find(cat => cat.id === transaction.category);

  let IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  if (isIncome) {
    IconComponent = TrendingUp;
  } else {
    const iconName = categoryInfo?.icon;
    IconComponent = getCategoryIconComponent(iconName ?? 'HelpCircle'); 
  }


  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-secondary/30 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 flex-1 min-w-0">
         <div className={cn(
            "rounded-full p-1.5 flex-shrink-0 flex items-center justify-center h-8 w-8", 
             isIncome ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
            )}>
            <IconComponent className="h-4 w-4" />
         </div>

        <div className="flex-1 min-w-0"> 
            <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium capitalize truncate">
                    {categoryInfo?.label || transaction.category} 
                </p>
                {transaction.receiptDataUrl && <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
            </div>
           {transaction.description && (
                <p className="text-xs text-muted-foreground truncate">
                    {transaction.description}
                </p>
           )}
        </div>
      </div>
      <div className="text-right pl-2 flex-shrink-0"> 
         <p className={cn(
            "text-sm font-semibold",
            isIncome ? "text-accent" : "text-foreground"
         )}>
           {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
         </p>
          <p className="text-xs text-muted-foreground">{format(transaction.date, 'MMM d, yyyy')}</p>
      </div>
    </div>
  );
};

export default TransactionListItem;

