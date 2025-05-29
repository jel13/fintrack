
// Basic localStorage wrapper - consider a more robust solution for production
import type { AppData, SavingGoalCategory } from '@/types';
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

const defaultSavingGoalCategories: SavingGoalCategory[] = [
  { id: 'emergency-fund', label: 'Emergency Fund', icon: 'ShieldAlert' },
  { id: 'travel', label: 'Travel', icon: 'PlaneTakeoff' },
  { id: 'health', label: 'Health & Wellness', icon: 'HeartHandshake' },
  { id: 'gadgets', label: 'Gadgets/Electronics', icon: 'Laptop2' },
  { id: 'education', label: 'Education', icon: 'GraduationCap' },
  { id: 'home-improvement', label: 'Home Improvement', icon: 'PaintRoller' },
  { id: 'investment-sg', label: 'Investment', icon: 'TrendingUp' }, // Suffix to avoid clash with main category
  { id: 'debt-repayment', label: 'Debt Repayment', icon: 'CreditCardOff' },
  { id: 'other-savings', label: 'Other Savings', icon: 'Landmark' },
];


export const defaultAppData: AppData = { 
  monthlyIncome: null,
  transactions: [],
  budgets: [],
  categories: defaultCategories,
  savingGoalCategories: defaultSavingGoalCategories,
  savingGoals: [],
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') {
    return { ...defaultAppData }; 
  }
  try {
    const storedData = localStorage.getItem(APP_DATA_KEY);
    if (storedData) {
      const parsedData: Partial<AppData> = JSON.parse(storedData); // Parse as Partial initially
      const currentMonth = format(new Date(), 'yyyy-MM');

      // Ensure all AppData fields exist, merging with defaults
      const mergedData: AppData = {
        ...defaultAppData, // Start with all default fields
        ...parsedData, // Override with stored data
        categories: parsedData.categories ? [...parsedData.categories] : [...defaultCategories.map(c => ({...c}))],
        savingGoalCategories: parsedData.savingGoalCategories ? [...parsedData.savingGoalCategories] : [...defaultSavingGoalCategories.map(sgc => ({...sgc}))],
        savingGoals: parsedData.savingGoals ? [...parsedData.savingGoals] : [],
        transactions: parsedData.transactions ? [...parsedData.transactions] : [],
        budgets: parsedData.budgets ? [...parsedData.budgets] : [],
      };


      mergedData.transactions = mergedData.transactions.map(t => ({
        ...t,
        date: new Date(t.date), // Ensure date is a Date object
      }));
      
      // For saving goals, targetDate is removed, so no need to parse it.
      // If other date fields were present, they'd be parsed here.
      mergedData.savingGoals = mergedData.savingGoals.map(g => ({
        ...g,
        // targetDate: g.targetDate ? new Date(g.targetDate) : null, // REMOVED
      }));


      mergedData.budgets = mergedData.budgets.map(b => {
           const spent = mergedData.transactions
              .filter(t => t.type === 'expense' && t.category === b.category && format(new Date(t.date), 'yyyy-MM') === (b.month || currentMonth))
              .reduce((sum, t) => sum + t.amount, 0);
          return {
            ...b,
            month: b.month || currentMonth, 
            spent: spent, 
          };
      });

       const finalCategories = [...defaultCategories.map(c => ({...c}))]; 

       if (mergedData.categories && Array.isArray(mergedData.categories)) {
           mergedData.categories.forEach(storedCat => {
                const existingIndex = finalCategories.findIndex(fc => fc.id === storedCat.id);
                if (existingIndex > -1) {
                     finalCategories[existingIndex] = {
                        ...finalCategories[existingIndex], 
                        label: storedCat.label, 
                        icon: storedCat.icon,
                        parentId: storedCat.parentId,
                     };
                } else {
                     finalCategories.push({
                         ...storedCat,
                         isDefault: storedCat.isDefault === undefined ? false : storedCat.isDefault,
                         isDeletable: storedCat.isDeletable === undefined ? true : storedCat.isDeletable,
                         isIncomeSource: storedCat.isIncomeSource === undefined ? false : storedCat.isIncomeSource,
                     });
                }
           });
       }
       // Ensure 'savings' category exists and has correct properties
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
       mergedData.categories = finalCategories.filter(c => c.id !== 'income'); // Remove conceptual 'income' if it exists

        // Merge default saving goal categories with stored ones
        const finalSavingGoalCategories = [...defaultSavingGoalCategories.map(sgc => ({...sgc}))];
        if (mergedData.savingGoalCategories && Array.isArray(mergedData.savingGoalCategories)) {
            mergedData.savingGoalCategories.forEach(storedSgc => {
                const existingSgcIndex = finalSavingGoalCategories.findIndex(fsgc => fsgc.id === storedSgc.id);
                if (existingSgcIndex > -1) {
                    finalSavingGoalCategories[existingSgcIndex] = {
                        ...finalSavingGoalCategories[existingSgcIndex],
                        label: storedSgc.label,
                        icon: storedSgc.icon,
                    };
                } else {
                    finalSavingGoalCategories.push(storedSgc);
                }
            });
        }
        mergedData.savingGoalCategories = finalSavingGoalCategories;

        return mergedData; 
    }
  } catch (error) {
    console.error("Failed to load app data from localStorage:", error);
  }
  return { 
      ...defaultAppData, 
      categories: [...defaultAppData.categories.map(c => ({...c}))],
      savingGoalCategories: [...defaultAppData.savingGoalCategories.map(sgc => ({...sgc}))] 
  }; // Return a deep copy of defaults on error
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
      // Saving goals no longer have targetDate
      savingGoals: data.savingGoals.map(g => ({
        ...g,
        // targetDate: g.targetDate ? (typeof g.targetDate === 'string' ? g.targetDate : g.targetDate.toISOString()) : null, // REMOVED
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

