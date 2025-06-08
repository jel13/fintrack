
// Basic localStorage wrapper - consider a more robust solution for production
import type { AppData, SavingGoalCategory, Category } from '@/types';
import { format, parseISO } from 'date-fns';

const APP_DATA_KEY = 'finTrackMobileData';

// Default categories
const defaultCategories: AppData['categories'] = [
  // Income Sources (Marked with isIncomeSource: true)
  { id: 'salary', label: 'Salary', icon: 'Briefcase', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'freelance', label: 'Side hustle / sideline', icon: 'Laptop', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'allowance', label: 'Allowance', icon: 'Wallet', isDefault: true, isDeletable: true, isIncomeSource: true },
  { id: 'investment_income', label: 'Investment Income', icon: 'Landmark', isDefault: true, isDeletable: true, isIncomeSource: true }, // Renamed to avoid clash with saving goal category
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
  { id: 'health_wellness_expense', label: 'Health & Wellness', icon: 'HeartPulse', isDefault: true, isDeletable: true, isIncomeSource: false }, // Renamed for clarity
  { id: 'travel_expense', label: 'Travel (Expenses)', icon: 'Plane', isDefault: true, isDeletable: true, isIncomeSource: false }, // Renamed for clarity
  { id: 'entertainment', label: 'Entertainment', icon: 'Gamepad2', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'personal_care', label: 'Personal Care', icon: 'Smile', isDefault: true, isDeletable: true, isIncomeSource: false },
  { id: 'education_expense', label: 'Education (Expenses)', icon: 'BookOpen', isDefault: true, isDeletable: true, isIncomeSource: false }, // Renamed for clarity
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
  { id: 'travel-sg', label: 'Travel', icon: 'PlaneTakeoff' },
  { id: 'health-sg', label: 'Health & Wellness', icon: 'HeartHandshake' },
  { id: 'gadgets-sg', label: 'Gadgets/Electronics', icon: 'Laptop2' },
  { id: 'education-sg', label: 'Education', icon: 'GraduationCap' },
  { id: 'home-improvement-sg', label: 'Home Improvement', icon: 'PaintRoller' },
  { id: 'investment-sg', label: 'Investment', icon: 'TrendingUp' }, // Note: "Investment Income" is a separate income category
  { id: 'debt-repayment-sg', label: 'Debt Repayment', icon: 'CreditCardOff' },
  { id: 'celebration-event-sg', label: 'Celebration/Event', icon: 'PartyPopper' },
  { id: 'charity-donation-sg', label: 'Charity/Donation', icon: 'HelpingHand' },
  { id: 'new-car-sg', label: 'New Car', icon: 'Car'},
  { id: 'down-payment-house-sg', label: 'House Down Payment', icon: 'Home'},
  { id: 'large-purchase-sg', label: 'Large Purchase (Other)', icon: 'Package'},
  { id: 'other-savings-sg', label: 'Other Savings', icon: 'Landmark' }, // General fallback
];


export const defaultAppData: AppData = {
  monthlyIncome: null,
  transactions: [],
  budgets: [],
  categories: defaultCategories.map(c => ({...c})), // Ensure defaults are new objects
  savingGoalCategories: defaultSavingGoalCategories.map(sgc => ({...sgc})), // Ensure defaults are new objects
  savingGoals: [],
  hasSeenOnboarding: false,
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
      const parsedData: Partial<AppData> & { transactions?: Array<Transaction & { date: string }>} = JSON.parse(storedData);
      const currentMonth = format(new Date(), 'yyyy-MM');

      // Ensure all AppData fields exist, merging with defaults
      const mergedData: AppData = {
        monthlyIncome: parsedData.monthlyIncome !== undefined ? parsedData.monthlyIncome : null,
        transactions: parsedData.transactions ? parsedData.transactions.map(t => ({ ...t, date: parseISO(t.date) })) : [],
        budgets: parsedData.budgets ? parsedData.budgets.map(b => {
            const spent = (parsedData.transactions || [])
                .filter(t => t.type === 'expense' && t.category === b.category && format(parseISO(t.date), 'yyyy-MM') === (b.month || currentMonth))
                .reduce((sum, t) => sum + t.amount, 0);
            return { ...b, month: b.month || currentMonth, spent: spent };
        }) : [],
        categories: parsedData.categories && parsedData.categories.length > 0
            ? parsedData.categories
            : defaultCategories.map(c => ({...c})),
        savingGoalCategories: parsedData.savingGoalCategories && parsedData.savingGoalCategories.length > 0
            ? parsedData.savingGoalCategories
            : defaultSavingGoalCategories.map(sgc => ({...sgc})),
        savingGoals: parsedData.savingGoals ? parsedData.savingGoals.map(sg => ({ // Ensure old goals without percentageAllocation get a default
            ...sg,
            percentageAllocation: sg.percentageAllocation ?? 0,
        })) : [],
        hasSeenOnboarding: parsedData.hasSeenOnboarding === undefined ? false : parsedData.hasSeenOnboarding,
      };

      // Further ensure categories are well-formed and defaults are respected for non-deletable/non-income flags
      const finalCategories: Category[] = defaultCategories.map(defaultCat => {
        const storedCat = mergedData.categories.find(mc => mc.id === defaultCat.id);
        if (storedCat) {
            let labelToUse = storedCat.label;
            // Specifically update the label for the 'freelance' ID if its stored label is the old default "Freelance"
            if (defaultCat.id === 'freelance' && storedCat.label === 'Freelance') {
                labelToUse = defaultCat.label; // Use the new default label ("Side hustle / sideline")
            }
            return {
                ...defaultCat, // Start with default to ensure flags like isDeletable, isIncomeSource are from default
                label: labelToUse, // User's label (or updated default)
                icon: storedCat.icon,   // User's icon
                parentId: storedCat.parentId, // User's parent
            };
        }
        return {...defaultCat}; // If not found in stored, use the default as is
      });

      // Add any custom categories from storedData that are not in defaults
      mergedData.categories.forEach(storedCat => {
        if (!finalCategories.some(fc => fc.id === storedCat.id)) {
            finalCategories.push({
                ...storedCat, 
                isDefault: storedCat.isDefault === undefined ? false : storedCat.isDefault, 
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
      savingGoals: data.savingGoals.map(g => ({ // Ensure only valid fields are saved
        id: g.id,
        name: g.name,
        goalCategoryId: g.goalCategoryId,
        savedAmount: g.savedAmount,
        percentageAllocation: g.percentageAllocation,
        description: g.description,
      })),
      hasSeenOnboarding: data.hasSeenOnboarding,
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

