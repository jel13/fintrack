export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string; // Corresponds to Category value/id
  date: Date;
  description?: string;
}

export interface Budget {
  id: string;
  category: string; // Corresponds to Category value/id
  limit: number; // Monetary limit
  percentage?: number; // Optional: Percentage limit (0-100)
  spent: number;
  month: string; // e.g., "2024-07"
}

export interface Category {
  id: string; // Use ID instead of value for potential persistence
  label: string;
  icon: string; // Store icon name (from lucide-react) or identifier
  parentId?: string | null; // For sub-categories
  isDefault?: boolean; // Flag for predefined categories
  isDeletable?: boolean; // Flag to prevent deleting core categories like 'Savings' or 'Income'
}

export interface SavingGoal {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    targetDate?: Date | null;
    percentageAllocation?: number; // Percentage of the 'Savings' budget allocated here
    description?: string;
    icon?: string; // Icon name
}

export interface AppData {
  monthlyIncome: number | null;
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  savingGoals: SavingGoal[];
}
