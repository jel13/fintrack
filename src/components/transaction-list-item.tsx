
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import type { Transaction, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils'; // Import formatCurrency
import { getCategoryIconComponent } from '@/components/category-icon'; // Use new icon getter
import { TrendingUp, TrendingDown } from 'lucide-react';


interface TransactionListItemProps {
  transaction: Transaction;
  categories: Category[]; // Pass categories for lookup
}

const TransactionListItem: FC<TransactionListItemProps> = ({ transaction, categories }) => {
  const isIncome = transaction.type === 'income';
  const categoryInfo = categories.find(cat => cat.id === transaction.category);

  // Determine which icon component to use
  let IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  if (isIncome) {
    IconComponent = TrendingUp;
  } else {
    // Get icon dynamically based on category info
    const iconName = categoryInfo?.icon;
    IconComponent = getCategoryIconComponent(iconName ?? 'HelpCircle'); // Default to HelpCircle for expense if no specific icon
  }


  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-secondary/30 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 flex-1 min-w-0">
         <div className={cn(
            "rounded-full p-1.5 flex-shrink-0 flex items-center justify-center h-8 w-8", // Fixed size circle
             isIncome ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
            )}>
            <IconComponent className="h-4 w-4" />
         </div>

        <div className="flex-1 min-w-0"> {/* Allow text to truncate */}
          <p className="text-sm font-medium capitalize truncate">
            {categoryInfo?.label || transaction.category} {/* Fallback to ID */}
          </p>
           {transaction.description && (
                <p className="text-xs text-muted-foreground truncate">
                    {transaction.description}
                </p>
           )}
        </div>
      </div>
      <div className="text-right pl-2 flex-shrink-0"> {/* Prevent amount shrinking */}
         <p className={cn(
            "text-sm font-semibold",
            isIncome ? "text-accent" : "text-foreground"
         )}>
           {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
         </p>
          {/* Always show the date */}
          <p className="text-xs text-muted-foreground">{format(transaction.date, 'MMM d, yyyy')}</p>
      </div>
    </div>
  );
};

export default TransactionListItem;
