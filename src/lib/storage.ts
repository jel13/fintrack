// Basic localStorage wrapper - consider a more robust solution for production
import type { AppData } from '@/types';

const APP_DATA_KEY = 'finTrackMobileData';

// Default categories (ensure Savings exists and is not deletable)
const defaultCategories: AppData['categories'] = [
  { id: 'income', label: 'Income', icon: 'TrendingUp', isDefault: true, isDeletable: false },
  { id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false },
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart', isDefault: true, isDeletable: true },
  { id: 'housing', label: 'Housing', icon: 'Home', isDefault: true, isDeletable: true },
  { id: 'food', label: 'Food & Dining', icon: 'Utensils', isDefault: true, isDeletable: true },
  { id: 'transport', label: 'Transport', icon: 'Car', isDefault: true, isDeletable: true },
  { id: 'bills', label: 'Bills', icon: 'Receipt', isDefault: true, isDeletable: true },
  { id: 'water_bill', label: 'Water Bill', icon: 'Droplet', parentId: 'bills', isDefault: true, isDeletable: true },
  { id: 'electric_bill', label: 'Electric Bill', icon: 'Zap', parentId: 'bills', isDefault: true, isDeletable: true },
  { id: 'clothing', label: 'Clothing', icon: 'Shirt', isDefault: true, isDeletable: true },
  { id: 'gifts', label: 'Gifts', icon: 'Gift', isDefault: true, isDeletable: true },
  { id: 'health', label: 'Health', icon: 'HeartPulse', isDefault: true, isDeletable: true },
  { id: 'travel', label: 'Travel', icon: 'Plane', isDefault: true, isDeletable: true },
  { id: 'other_expense', label: 'Other Expense', icon: 'TrendingDown', isDefault: true, isDeletable: true },
];


const defaultAppData: AppData = {
  monthlyIncome: null,
  transactions: [],
  budgets: [],
  categories: defaultCategories,
  savingGoals: [],
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') {
    return defaultAppData; // Return default if on server-side
  }
  try {
    const storedData = localStorage.getItem(APP_DATA_KEY);
    if (storedData) {
      const parsedData: AppData = JSON.parse(storedData);
      // Ensure dates are parsed correctly
      parsedData.transactions = parsedData.transactions.map(t => ({
        ...t,
        date: new Date(t.date),
      }));
       parsedData.savingGoals = parsedData.savingGoals.map(g => ({
        ...g,
        targetDate: g.targetDate ? new Date(g.targetDate) : null,
      }));
      // Merge default categories with stored ones if missing (e.g., after an update)
      const mergedCategories = [...defaultCategories];
      const storedCategoryIds = new Set(parsedData.categories.map(c => c.id));
      defaultCategories.forEach(defaultCat => {
        if (!storedCategoryIds.has(defaultCat.id)) {
          mergedCategories.push(defaultCat);
        } else {
          // Ensure non-deletable flags are preserved from defaults
           const storedCatIndex = parsedData.categories.findIndex(c => c.id === defaultCat.id);
            if (storedCatIndex > -1 && defaultCat.isDeletable === false) {
                parsedData.categories[storedCatIndex].isDeletable = false;
            }
        }
      });
      // Ensure 'Savings' exists and is not deletable in the final list
       let savingsCategory = mergedCategories.find(c => c.id === 'savings');
       if (!savingsCategory) {
         mergedCategories.push({ id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false });
       } else if (savingsCategory.isDeletable !== false) {
         savingsCategory.isDeletable = false; // Force non-deletable
       }

      parsedData.categories = mergedCategories;


      return parsedData;
    }
  } catch (error) {
    console.error("Failed to load app data from localStorage:", error);
  }
  return defaultAppData;
};

export const saveAppData = (data: AppData) => {
   if (typeof window === 'undefined') return;
  try {
    // Ensure dates are stored in a serializable format (ISO string)
    const dataToStore = {
      ...data,
      transactions: data.transactions.map(t => ({
        ...t,
        date: t.date.toISOString(),
      })),
      savingGoals: data.savingGoals.map(g => ({
        ...g,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
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
