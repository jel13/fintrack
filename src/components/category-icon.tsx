"use client";

import type { FC } from 'react';
import * as LucideIcons from 'lucide-react';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  categoryValue?: string; // Now expects category ID or icon name string
  className?: string;
  iconName?: string; // Allow passing icon name directly
  fallbackIcon?: keyof typeof LucideIcons; // Specify a fallback icon name
}

// Function to get the Lucide icon component dynamically
export const getCategoryIconComponent = (iconName?: string): React.ComponentType<LucideIcons.LucideProps> => {
    if (!iconName || !(iconName in LucideIcons)) {
        return LucideIcons.HelpCircle; // Default fallback
    }
    // Type assertion needed here because TypeScript can't guarantee the string maps to a valid key
    return LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<LucideIcons.LucideProps>;
};

// This function is likely less useful now if categories are managed dynamically
// export const getCategoryByValue = (value: string, categories: Category[]): Category | undefined => {
//   return categories.find(cat => cat.id === value);
// }

// Helper to get icon name from category ID (requires passing categories array)
export const getIconNameFromCategoryId = (categoryId: string, categories: Category[]): string | undefined => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon;
}

const CategoryIcon: FC<CategoryIconProps> = ({ categoryValue, iconName: directIconName, className, fallbackIcon = 'HelpCircle' }) => {
  const iconNameToUse = directIconName ?? categoryValue; // Use direct name if provided, else assume categoryValue is icon name
  const IconComponent = getCategoryIconComponent(iconNameToUse ?? fallbackIcon);
  return <IconComponent className={cn("h-5 w-5", className)} />;
};

export default CategoryIcon;

// // Old categories definition - remove or keep for reference
// export const categories_old: Category[] = [
//   { value: 'groceries', label: 'Groceries', icon: LucideIcons.ShoppingCart },
//   // ... other categories
// ];
