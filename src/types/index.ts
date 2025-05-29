
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
    name: string; 
    goalCategoryId: string; 
    savedAmount: number; 
    percentageAllocation?: number; // Percentage of *total monthly savings budget limit* allocated to this goal
    description?: string;
}

export interface AppData {
  monthlyIncome: number | null; 
  transactions: Transaction[];
  budgets: Budget[]; 
  categories: Category[]; 
  savingGoalCategories: SavingGoalCategory[]; 
  savingGoals: SavingGoal[]; 
}
