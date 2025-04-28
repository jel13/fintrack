

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string; // Corresponds to Category id (e.g., 'groceries', 'salary')
  date: Date;
  description?: string;
}

export interface Budget {
  id: string;
  category: string; // Corresponds to Category id (e.g., 'groceries', 'bills', 'savings')
  limit: number; // Monetary limit (calculated based on percentage or auto-calculated for savings)
  percentage?: number; // Percentage of *total monthly income* allocated to this budget category. Optional (undefined) only for the auto-calculated Savings budget.
  spent: number; // Total spent against this budget category for the month
  month: string; // e.g., "2024-07"
}

export interface Category {
  id: string; // Unique identifier (e.g., 'groceries', 'salary', 'cat-water-bill')
  label: string; // User-friendly display name (e.g., "Groceries", "Salary", "Water Bill")
  icon: string; // Name of the lucide-react icon (e.g., "ShoppingCart", "TrendingUp", "Droplet")
  parentId?: string | null; // ID of the parent category for sub-categories
  isDefault?: boolean; // Flag for predefined categories provided by the app
  isDeletable?: boolean; // Flag to prevent deleting essential/core categories
  isIncomeSource?: boolean; // Flag to identify categories specifically for income sources
}

export interface SavingGoal {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number; // Current amount saved towards the goal
    targetDate?: Date | null;
    // Percentage of the *monthly savings budget limit* allocated to this goal.
    percentageAllocation?: number;
    description?: string;
    icon?: string; // Icon name for the goal (optional)
}

export interface AppData {
  monthlyIncome: number | null; // User-defined total monthly income estimate
  transactions: Transaction[];
  budgets: Budget[]; // Budgets for expense categories AND the 'savings' category
  categories: Category[]; // All categories (income sources, expenses, parents)
  savingGoals: SavingGoal[]; // User-defined saving goals
}

