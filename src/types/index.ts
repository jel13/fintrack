export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: Date;
  description?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number; // Add spent amount for progress calculation
  month: string; // e.g., "2024-07"
}

export interface Category {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
