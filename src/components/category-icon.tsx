"use client";

import type { FC } from 'react';
import { ShoppingCart, Home, Utensils, Car, Shirt, Gift, HeartPulse, Plane, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryIconProps {
  categoryValue: string;
  className?: string;
}

export const categories: Category[] = [
  { value: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { value: 'housing', label: 'Housing', icon: Home },
  { value: 'food', label: 'Food & Dining', icon: Utensils },
  { value: 'transport', label: 'Transport', icon: Car },
  { value: 'clothing', label: 'Clothing', icon: Shirt },
  { value: 'gifts', label: 'Gifts', icon: Gift },
  { value: 'health', label: 'Health', icon: HeartPulse },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'income', label: 'Income', icon: TrendingUp }, // For income type
  { value: 'other_expense', label: 'Other Expense', icon: TrendingDown }, // Default expense
  { value: 'other', label: 'Other', icon: HelpCircle },
];

export const getCategoryByValue = (value: string): Category | undefined => {
  return categories.find(cat => cat.value === value);
}

export const getCategoryIcon = (categoryValue: string): React.ComponentType<{ className?: string }> => {
  const category = getCategoryByValue(categoryValue);
  return category ? category.icon : HelpCircle; // Default icon
};

const CategoryIcon: FC<CategoryIconProps> = ({ categoryValue, className }) => {
  const IconComponent = getCategoryIcon(categoryValue);
  return <IconComponent className={cn("h-5 w-5", className)} />;
};

export default CategoryIcon;

// Helper function for cn if not globally available
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
