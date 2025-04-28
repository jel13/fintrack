// Basic localStorage wrapper - consider a more robust solution for production
import type { AppData } from '@/types';
import { format } from 'date-fns'; // Import format

const APP_DATA_KEY = 'finTrackMobileData';

// Default categories
const defaultCategories: AppData['categories'] = [
  // Income Sources (Marked with isIncomeSource: true)
  { id: 'salary', label: 'Salary', icon: 'Briefcase', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'allowance', label: 'Allowance', icon: 'Wallet', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'investment', label: 'Investment', icon: 'Landmark', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'other_income', label: 'Other Income', icon: 'TrendingUp', isDefault: true, isDeletable: true, isIncomeSource: true },

  // Core Non-Deletable Categories
  // 'income' category is conceptual for transaction type, not selectable as source/expense category
  // { id: 'income', label: 'Income', icon: 'TrendingUp', isDefault: true, isDeletable: false },
  { id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false }, // For budgeting savings allocation

  // Default Expense Categories (Top Level)
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart', isDefault: true, isDeletable: true },
  { id: 'housing', label: 'Housing', icon: 'Home', isDefault: true, isDeletable: true },
  { id: 'food', label: 'Food & Dining', icon: 'Utensils', isDefault: true, isDeletable: true },
  { id: 'transport', label: 'Transport', icon: 'Car', isDefault: true, isDeletable: true },
  { id: 'bills', label: 'Bills', icon: 'Receipt', isDefault: true, isDeletable: true }, // Parent Category
  { id: 'clothing', label: 'Clothing', icon: 'Shirt', isDefault: true, isDeletable: true },
  { id: 'gifts', label: 'Gifts', icon: 'Gift', isDefault: true, isDeletable: true },
  { id: 'health', label: 'Health', icon: 'HeartPulse', isDefault: true, isDeletable: true },
  { id: 'travel', label: 'Travel', icon: 'Plane', isDefault: true, isDeletable: true },
  { id: 'entertainment', label: 'Entertainment', icon: 'Gamepad2', isDefault: true, isDeletable: true },
  { id: 'personal_care', label: 'Personal Care', icon: 'Smile', isDefault: true, isDeletable: true },
  { id: 'education', label: 'Education', icon: 'BookOpen', isDefault: true, isDeletable: true },
  { id: 'other_expense', label: 'Other Expense', icon: 'HelpCircle', isDefault: true, isDeletable: true }, // Renamed icon

  // Default Expense Sub-Categories
  { id: 'water_bill', label: 'Water Bill', icon: 'Droplet', parentId: 'bills', isDefault: true, isDeletable: true },
  { id: 'electric_bill', label: 'Electric Bill', icon: 'Zap', parentId: 'bills', isDefault: true, isDeletable: true },
  { id: 'internet_bill', label: 'Internet Bill', icon: 'Wifi', parentId: 'bills', isDefault: true, isDeletable: true },
  { id: 'phone_bill', label: 'Phone Bill', icon: 'Smartphone', parentId: 'bills', isDefault: true, isDeletable: true },

  // Example sub-categories (add more as needed)
  { id: 'rent', label: 'Rent/Mortgage', icon: 'Home', parentId: 'housing', isDefault: true, isDeletable: true },
  { id: 'fuel', label: 'Fuel', icon: 'Fuel', parentId: 'transport', isDefault: true, isDeletable: true },
  { id: 'public_transport', label: 'Public Transport', icon: 'Train', parentId: 'transport', isDefault: true, isDeletable: true },
  { id: 'restaurants', label: 'Restaurants', icon: 'UtensilsCrossed', parentId: 'food', isDefault: true, isDeletable: true },

];


export const defaultAppData: AppData = { // Export the default data
  monthlyIncome: null,
  transactions: [],
  budgets: [],
  categories: defaultCategories,
  savingGoals: [],
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') {
    return { ...defaultAppData }; // Return a copy of default if on server-side
  }
  try {
    const storedData = localStorage.getItem(APP_DATA_KEY);
    if (storedData) {
      const parsedData: AppData = JSON.parse(storedData);
      const currentMonth = format(new Date(), 'yyyy-MM');

      // Ensure dates are parsed correctly
      parsedData.transactions = parsedData.transactions.map(t => ({
        ...t,
        date: new Date(t.date),
      }));
       parsedData.savingGoals = parsedData.savingGoals.map(g => ({
        ...g,
        targetDate: g.targetDate ? new Date(g.targetDate) : null,
      }));

      // Ensure budgets have month and spent initialized if missing
      parsedData.budgets = parsedData.budgets.map(b => {
          // Recalculate spent based on current transactions for accuracy
           const spent = parsedData.transactions
              .filter(t => t.type === 'expense' && t.category === b.category && format(t.date, 'yyyy-MM') === (b.month || currentMonth))
              .reduce((sum, t) => sum + t.amount, 0);
          return {
            ...b,
            month: b.month || currentMonth, // Default to current month if missing
            spent: spent, // Always recalculate spent on load for accuracy
            // limit will be recalculated based on income and percentage later if needed
          };
      });

       // Merge categories: Start with defaults, then update/add from storage
       const finalCategories = [...defaultCategories]; // Start with defaults
       const defaultIds = new Set(defaultCategories.map(c => c.id));

       parsedData.categories.forEach(storedCat => {
            const existingIndex = finalCategories.findIndex(fc => fc.id === storedCat.id);
            if (existingIndex > -1) {
                // Update existing default category, but preserve non-editable flags and income source flag
                 finalCategories[existingIndex] = {
                    ...storedCat, // Use stored label, icon, parentId
                    isDefault: finalCategories[existingIndex].isDefault, // Keep original default flag
                    isDeletable: finalCategories[existingIndex].isDeletable, // Keep original deletable flag
                    isIncomeSource: finalCategories[existingIndex].isIncomeSource, // Keep original income source flag
                 };
            } else {
                // Add custom category from storage
                 finalCategories.push({
                     ...storedCat,
                     isDefault: false, // Custom categories are not default
                     isDeletable: true, // Custom categories are deletable by default
                     isIncomeSource: storedCat.isIncomeSource ?? false, // Assume false if missing
                 });
            }
       });


       // Ensure 'Savings' category exists, is non-deletable, and NOT an income source
       let savingsCategoryIndex = finalCategories.findIndex(c => c.id === 'savings');
       if (savingsCategoryIndex === -1) {
           finalCategories.push({ id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false, isIncomeSource: false });
       } else {
           finalCategories[savingsCategoryIndex] = {
               ...finalCategories[savingsCategoryIndex],
               isDeletable: false, // Force non-deletable
               isIncomeSource: false // Ensure not an income source
           };
       }

       // Ensure 'income' id is NOT used for selectable categories
        parsedData.categories = finalCategories.filter(c => c.id !== 'income');


      return { ...parsedData, categories: finalCategories }; // Use the merged categories
    }
  } catch (error) {
    console.error("Failed to load app data from localStorage:", error);
  }
  return { ...defaultAppData }; // Return a copy on error
};

export const saveAppData = (data: AppData) => {
   if (typeof window === 'undefined') return;
  try {
    // Ensure dates are stored in a serializable format (ISO string)
    const dataToStore = {
      ...data,
      transactions: data.transactions.map(t => ({
        ...t,
        // Check if date is already a string (might happen during rapid updates)
        date: typeof t.date === 'string' ? t.date : t.date.toISOString(),
      })),
      savingGoals: data.savingGoals.map(g => ({
        ...g,
        targetDate: g.targetDate ? (typeof g.targetDate === 'string' ? g.targetDate : g.targetDate.toISOString()) : null,
      })),
    };
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error("Failed to save app data to localStorage:", error);
  }
};

// Clear data function (useful for debugging or reset)
export const clearAppData = () => {
   if (typeof window === 'undefined') return;
  localStorage.removeItem(APP_DATA_KEY);
  window.location.reload(); // Reload to apply default state
};
