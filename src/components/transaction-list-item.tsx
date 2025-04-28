"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import type { Transaction, Category } from '@/types';
import { cn } from '@/lib/utils';
import { getCategoryIconComponent } from '@/components/category-icon'; // Use new icon getter
import { TrendingUp, TrendingDown } from 'lucide-react';


interface TransactionListItemProps {
  transaction: Transaction;
  categories: Category[]; // Pass categories for lookup
}

const TransactionListItem: FC<TransactionListItemProps> = ({ transaction, categories }) => {
  const isIncome = transaction.type === 'income';
  const categoryInfo = categories.find(cat => cat.id === transaction.category);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Determine which icon component to use
  let IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  if (isIncome) {
    IconComponent = TrendingUp;
  } else {
    // Get icon dynamically based on category info
    const iconName = categoryInfo?.icon;
    IconComponent = getCategoryIconComponent(iconName ?? 'TrendingDown'); // Default to TrendingDown for expense if no specific icon
  }


  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
         <div className={cn(
            "rounded-full p-2 flex-shrink-0", // Prevent icon shrinking
             isIncome ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
            )}>
            <IconComponent className="h-5 w-5" />
         </div>

        <div className="flex-1 min-w-0"> {/* Allow text to truncate */}
          <p className="text-sm font-medium capitalize truncate">
            {categoryInfo?.label || transaction.category} {/* Fallback to ID */}
          </p>
          <p className="text-xs text-muted-foreground truncate">
             {/* Show description if available, otherwise date */}
             {transaction.description || format(transaction.date, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="text-right pl-2"> {/* Add padding to prevent overlap */}
         <p className={cn(
            "text-sm font-semibold",
            isIncome ? "text-accent" : "text-foreground"
         )}>
           {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
         </p>
         {/* Show time only if description is also present, otherwise date was shown above */}
          {transaction.description && (
             <p className="text-xs text-muted-foreground">{format(transaction.date, 'p')}</p>
          )}
           {!transaction.description && ( // Show date here if no description
             <p className="text-xs text-muted-foreground">{format(transaction.date, 'MMM d')}</p>
          )}
      </div>
    </div>
  );
};

export default TransactionListItem;
