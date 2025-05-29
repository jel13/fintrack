
// Basic localStorage wrapper - consider a more robust solution for production
import type { AppData, SavingGoalCategory, Category } from '@/types';
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
  categories: defaultCategories.map(c => ({...c})), // Ensure defaults are new objects
  savingGoalCategories: defaultSavingGoalCategories.map(sgc => ({...sgc})), // Ensure defaults are new objects
  savingGoals: [],
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') {
    return { 
        ...defaultAppData,
        categories: defaultCategories.map(c => ({...c})),
        savingGoalCategories: defaultSavingGoalCategories.map(sgc => ({...sgc}))
    }; 
  }
  try {
    const storedData = localStorage.getItem(APP_DATA_KEY);
    if (storedData) {
      const parsedData: Partial<AppData> = JSON.parse(storedData); 
      const currentMonth = format(new Date(), 'yyyy-MM');

      // Ensure all AppData fields exist, merging with defaults
      const mergedData: AppData = {
        monthlyIncome: parsedData.monthlyIncome !== undefined ? parsedData.monthlyIncome : null,
        transactions: parsedData.transactions ? parsedData.transactions.map(t => ({ ...t, date: new Date(t.date) })) : [],
        budgets: parsedData.budgets ? parsedData.budgets.map(b => {
            const spent = (parsedData.transactions || [])
                .filter(t => t.type === 'expense' && t.category === b.category && format(new Date(t.date), 'yyyy-MM') === (b.month || currentMonth))
                .reduce((sum, t) => sum + t.amount, 0);
            return { ...b, month: b.month || currentMonth, spent: spent };
        }) : [],
        categories: parsedData.categories && parsedData.categories.length > 0 
            ? parsedData.categories 
            : defaultCategories.map(c => ({...c})),
        savingGoalCategories: parsedData.savingGoalCategories && parsedData.savingGoalCategories.length > 0 
            ? parsedData.savingGoalCategories 
            : defaultSavingGoalCategories.map(sgc => ({...sgc})),
        savingGoals: parsedData.savingGoals ? parsedData.savingGoals : [],
      };
      
      // Further ensure categories are well-formed and defaults are respected for non-deletable/non-income flags
      const finalCategories: Category[] = defaultCategories.map(defaultCat => {
        const storedCat = mergedData.categories.find(mc => mc.id === defaultCat.id);
        if (storedCat) {
            return {
                ...defaultCat, // Start with default to ensure flags like isDeletable, isIncomeSource are from default
                label: storedCat.label, // User's label
                icon: storedCat.icon,   // User's icon
                parentId: storedCat.parentId, // User's parent
                // isDefault is from defaultCat
                // isDeletable is from defaultCat
                // isIncomeSource is from defaultCat
            };
        }
        return {...defaultCat}; // If not found in stored, use the default as is
      });

      // Add any custom categories from storedData that are not in defaults
      mergedData.categories.forEach(storedCat => {
        if (!finalCategories.some(fc => fc.id === storedCat.id)) {
            finalCategories.push({
                ...storedCat, // Take all properties from stored custom category
                isDefault: storedCat.isDefault === undefined ? false : storedCat.isDefault, // Ensure these exist
                isDeletable: storedCat.isDeletable === undefined ? true : storedCat.isDeletable,
                isIncomeSource: storedCat.isIncomeSource === undefined ? false : storedCat.isIncomeSource,
            });
        }
      });
      mergedData.categories = finalCategories.filter(c => c.id !== 'income'); // Remove conceptual 'income' if it exists

      // Merge default saving goal categories with stored ones robustly
      const finalSavingGoalCategories: SavingGoalCategory[] = defaultSavingGoalCategories.map(defaultSgc => {
          const storedSgc = mergedData.savingGoalCategories.find(msgc => msgc.id === defaultSgc.id);
          return storedSgc ? { ...defaultSgc, label: storedSgc.label, icon: storedSgc.icon } : {...defaultSgc};
      });
      mergedData.savingGoalCategories.forEach(storedSgc => {
          if (!finalSavingGoalCategories.some(fsgc => fsgc.id === storedSgc.id)) {
              finalSavingGoalCategories.push(storedSgc);
          }
      });
      mergedData.savingGoalCategories = finalSavingGoalCategories;

      return mergedData; 
    }
  } catch (error) {
    console.error("Failed to load app data from localStorage:", error);
  }
  return { 
      ...defaultAppData, 
      categories: defaultCategories.map(c => ({...c})),
      savingGoalCategories: defaultSavingGoalCategories.map(sgc => ({...sgc})) 
  };
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
