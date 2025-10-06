
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string; // Corresponds to Category id (e.g., 'groceries', 'salary') OR SavingGoal id
  date: Date; // Should be stored as ISO string in localStorage, but Date object in runtime state
  description?: string;
  receiptDataUrl?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  percentage?: number;
  spent: number;
  month: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  parentId?: string | null;
  isDefault?: boolean;
  isDeletable?: boolean;
  isIncomeSource?: boolean;
}

export interface SavingGoalCategory {
  id: string;
  label: string;
  icon: string;
}

export interface SavingGoal {
    id: string;
    name: string; // User-defined name for their specific goal, e.g., "Trip to Japan"
    goalCategoryId: string; // Links to a SavingGoalCategory like "travel" or "emergency-fund"
    targetAmount: number; // New field: The total amount to save for this goal
    savedAmount: number; // Total amount accumulated for this specific goal
    percentageAllocation?: number; // Percentage of *total monthly savings budget limit* allocated to this goal
    description?: string;
}

export interface MonthlyReport {
  month: string; // "YYYY-MM"
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  expenseBreakdown: Array<{
    categoryId: string;
    categoryLabel: string;
    amount: number;
  }>;
  // Future fields can be added here, like budget adherence, etc.
}

export interface AppData {
  monthlyIncome: number | null;
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  savingGoalCategories: SavingGoalCategory[];
  savingGoals: SavingGoal[];
  hasSeenOnboarding?: boolean;
  seenTours?: string[]; // To track completed guided tours
  monthlyReports: MonthlyReport[];
}
