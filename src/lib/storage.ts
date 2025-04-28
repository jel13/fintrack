// Basic localStorage wrapper - consider a more robust solution for production
import type { AppData } from '@/types';
import { format } from 'date-fns'; // Import format

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
          const spent = parsedData.transactions
              .filter(t => t.type === 'expense' && t.category === b.category && format(t.date, 'yyyy-MM') === (b.month || currentMonth))
              .reduce((sum, t) => sum + t.amount, 0);
          return {
            ...b,
            month: b.month || currentMonth, // Default to current month if missing
            spent: b.spent !== undefined ? b.spent : spent, // Initialize spent if missing
          };
      });

      // Merge default categories with stored ones if missing (e.g., after an update)
      const mergedCategories = [...defaultCategories];
      const storedCategoryIds = new Set(parsedData.categories.map(c => c.id));

      parsedData.categories.forEach(storedCat => {
        const defaultMatch = defaultCategories.find(dc => dc.id === storedCat.id);
        if (defaultMatch) {
          // Update the default category entry with stored data, but keep default flags
          const index = mergedCategories.findIndex(mc => mc.id === storedCat.id);
          if (index > -1) {
            mergedCategories[index] = {
              ...storedCat, // Take stored label, icon, parentId
              isDefault: defaultMatch.isDefault, // Keep default status
              isDeletable: defaultMatch.isDeletable, // Keep default deletable status
            };
          }
        } else if (!storedCategoryIds.has(storedCat.id)) {
           // This condition seems wrong - should be adding stored *custom* categories
           // Let's re-evaluate logic: We start with defaults, then add custom ones
           // Correct approach: Start with defaults, then add/update based on stored data
        }
      });

       // Corrected Merge Logic:
       const finalCategories = [...defaultCategories]; // Start with defaults
       const defaultIds = new Set(defaultCategories.map(c => c.id));

       parsedData.categories.forEach(storedCat => {
            const existingIndex = finalCategories.findIndex(fc => fc.id === storedCat.id);
            if (existingIndex > -1) {
                // Update existing default category, but preserve non-editable flags
                 finalCategories[existingIndex] = {
                    ...storedCat, // Use stored label, icon, parentId
                    isDefault: finalCategories[existingIndex].isDefault, // Keep original default flag
                    isDeletable: finalCategories[existingIndex].isDeletable, // Keep original deletable flag
                 };
            } else {
                // Add custom category from storage
                 finalCategories.push({
                     ...storedCat,
                     isDefault: false, // Custom categories are not default
                     isDeletable: true, // Custom categories are deletable by default
                 });
            }
       });


      // Ensure 'Savings' exists and is not deletable in the final list
       let savingsCategory = finalCategories.find(c => c.id === 'savings');
       if (!savingsCategory) {
         finalCategories.push({ id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false });
       } else if (savingsCategory.isDeletable !== false) {
         savingsCategory.isDeletable = false; // Force non-deletable
       }
        // Ensure 'Income' exists and is not deletable
       let incomeCategory = finalCategories.find(c => c.id === 'income');
        if (!incomeCategory) {
         finalCategories.push({ id: 'income', label: 'Income', icon: 'TrendingUp', isDefault: true, isDeletable: false });
       } else if (incomeCategory.isDeletable !== false) {
         incomeCategory.isDeletable = false; // Force non-deletable
       }


      parsedData.categories = finalCategories;


      return parsedData;
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
