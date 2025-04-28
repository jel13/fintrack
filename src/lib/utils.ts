import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency helper
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return "$0.00"; // Or return empty string, or '-'
  }
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  // Using Intl.NumberFormat for better localization and formatting
  return `${sign}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(absAmount)}`;
};
