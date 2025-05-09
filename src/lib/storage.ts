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
  { id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false, isIncomeSource: false }, // For budgeting savings allocation

  // Default Expense Categories (Top Level)
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'housing', label: 'Housing', icon: 'Home', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'food', label: 'Food & Dining', icon: 'Utensils', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'transport', label: 'Transport', icon: 'Car', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'bills', label: 'Bills & Utilities', icon: 'Receipt', isDefault: true, isDeletable: true, isIncomeSource: false }, // Parent Category
  { id: 'clothing', label: 'Clothing', icon: 'Shirt', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'gifts', label: 'Gifts', icon: 'Gift', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'health', label: 'Health & Wellness', icon: 'HeartPulse', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'travel', label: 'Travel', icon: 'Plane', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'entertainment', label: 'Entertainment', icon: 'Gamepad2', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'personal_care', label: 'Personal Care', icon: 'Smile', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'education', label: 'Education', icon: 'BookOpen', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'other_expense', label: 'Other Expense', icon: 'Archive', isDefault: true, isDeletable: true, isIncomeSource: false },

  // Default Expense Sub-Categories
  { id: 'rent_mortgage', label: 'Rent/Mortgage', icon: 'Home', parentId: 'housing', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'fuel_car', label: 'Fuel/Car Maintenance', icon: 'Fuel', parentId: 'transport', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'public_transit', label: 'Public Transit', icon: 'Train', parentId: 'transport', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'restaurants_dining', label: 'Restaurants/Dining Out', icon: 'UtensilsCrossed', parentId: 'food', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'water_bill', label: 'Water Bill', icon: 'Droplet', parentId: 'bills', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'electric_bill', label: 'Electric Bill', icon: 'Zap', parentId: 'bills', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'internet_bill', label: 'Internet Bill', icon: 'Wifi', parentId: 'bills', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'phone_bill', label: 'Phone Bill', icon: 'Smartphone', parentId: 'bills', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'subscriptions_bills', label: 'Subscriptions', icon: 'Youtube', parentId: 'bills', isDefault: true, isDeletable: true, isIncomeSource: false },
];


export const defaultAppData: AppData = { 
  monthlyIncome: null,
  transactions: [],
  budgets: [],
  categories: defaultCategories,
  savingGoals: [],
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') {
    return { ...defaultAppData }; 
  }
  try {
    const storedData = localStorage.getItem(APP_DATA_KEY);
    if (storedData) {
      const parsedData: AppData = JSON.parse(storedData);
      const currentMonth = format(new Date(), 'yyyy-MM');

      parsedData.transactions = parsedData.transactions.map(t => ({
        ...t,
        date: new Date(t.date),
      }));
       parsedData.savingGoals = parsedData.savingGoals.map(g => ({
        ...g,
        targetDate: g.targetDate ? new Date(g.targetDate) : null,
      }));

      parsedData.budgets = parsedData.budgets.map(b => {
           const spent = parsedData.transactions
              .filter(t => t.type === 'expense' && t.category === b.category && format(t.date, 'yyyy-MM') === (b.month || currentMonth))
              .reduce((sum, t) => sum + t.amount, 0);
          return {
            ...b,
            month: b.month || currentMonth, 
            spent: spent, 
          };
      });

       const finalCategories = [...defaultCategories.map(c => ({...c}))]; // Deep copy defaults

       if (parsedData.categories && Array.isArray(parsedData.categories)) {
           parsedData.categories.forEach(storedCat => {
                const existingIndex = finalCategories.findIndex(fc => fc.id === storedCat.id);
                if (existingIndex > -1) {
                    // Update existing default category, preserving certain flags
                     finalCategories[existingIndex] = {
                        ...finalCategories[existingIndex], // Start with default properties
                        label: storedCat.label, // Update mutable properties
                        icon: storedCat.icon,
                        parentId: storedCat.parentId,
                        // isDefault, isDeletable, isIncomeSource are preserved from default
                     };
                } else {
                    // Add custom category from storage
                     finalCategories.push({
                         ...storedCat,
                         isDefault: storedCat.isDefault === undefined ? false : storedCat.isDefault,
                         isDeletable: storedCat.isDeletable === undefined ? true : storedCat.isDeletable,
                         isIncomeSource: storedCat.isIncomeSource === undefined ? false : storedCat.isIncomeSource,
                     });
                }
           });
       }


       let savingsCategoryIndex = finalCategories.findIndex(c => c.id === 'savings');
       if (savingsCategoryIndex === -1) {
           finalCategories.push({ id: 'savings', label: 'Savings', icon: 'PiggyBank', isDefault: true, isDeletable: false, isIncomeSource: false });
       } else {
           finalCategories[savingsCategoryIndex] = {
               ...finalCategories[savingsCategoryIndex],
               label: finalCategories[savingsCategoryIndex].label || 'Savings',
               icon: finalCategories[savingsCategoryIndex].icon || 'PiggyBank',
               isDefault: true,
               isDeletable: false, 
               isIncomeSource: false 
           };
       }
        const categoriesToReturn = finalCategories.filter(c => c.id !== 'income'); // Remove conceptual 'income' if it exists

        return { ...defaultAppData, ...parsedData, categories: categoriesToReturn }; 
    }
  } catch (error) {
    console.error("Failed to load app data from localStorage:", error);
  }
  return { ...defaultAppData, categories: [...defaultAppData.categories.map(c => ({...c}))] }; // Return a deep copy of defaults on error
};

export const saveAppData = (data: AppData) => {
   if (typeof window === 'undefined') return;
  try {
    const dataToStore = {
      ...data,
      transactions: data.transactions.map(t => ({
        ...t,
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

export const clearAppData = () => {
   if (typeof window === 'undefined') return;
  localStorage.removeItem(APP_DATA_KEY);
  window.location.reload(); 
};

