
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Paperclip, XCircle, PiggyBank as GoalIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Transaction, Category, SavingGoal, Budget, TransactionType } from "@/types";
import { getCategoryIconComponent } from '@/components/category-icon';

const formSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number", required_error: "Amount is required" })
    .positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  date: z.date(),
  description: z.string().max(100, "Description max 100 chars").optional(),
  receiptDataUrl: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveTransaction: (transaction: Transaction) => void;
  categoriesForSelect: Category[];
  savingGoals: SavingGoal[];
  budgets: Budget[];
  canAddExpense: boolean;
  currentMonthBudgetCategoryIds: string[];
  existingTransaction?: Transaction | null;
  initialType?: TransactionType | null; // New prop
}

interface BudgetHint {
    text: string;
    color: string;
}

export function AddTransactionSheet({
    open,
    onOpenChange,
    onSaveTransaction,
    categoriesForSelect,
    savingGoals,
    budgets,
    canAddExpense,
    currentMonthBudgetCategoryIds,
    existingTransaction,
    initialType, // Destructure new prop
}: AddTransactionSheetProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
  });

  const [receiptPreview, setReceiptPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [budgetHint, setBudgetHint] = React.useState<BudgetHint | null>(null);

  const watchedAmount = form.watch("amount");
  const watchedCategory = form.watch("category");
  const watchedDate = form.watch("date");
  const watchedType = form.watch("type");


  React.useEffect(() => {
     if (open) {
         if (existingTransaction) {
             form.reset({
                 id: existingTransaction.id,
                 type: existingTransaction.type,
                 amount: existingTransaction.amount,
                 category: existingTransaction.category,
                 date: existingTransaction.date instanceof Date ? existingTransaction.date : parseISO(existingTransaction.date as unknown as string),
                 description: existingTransaction.description || "",
                 receiptDataUrl: existingTransaction.receiptDataUrl || undefined,
             });
             setReceiptPreview(existingTransaction.receiptDataUrl || null);
         } else {
             form.reset({
                 id: undefined,
                 type: initialType || (canAddExpense ? "expense" : "income"), // Use initialType here
                 amount: undefined,
                 category: "",
                 date: new Date(),
                 description: "",
                 receiptDataUrl: undefined,
             });
             setReceiptPreview(null);
         }
         setBudgetHint(null);
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
         }
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingTransaction, canAddExpense, form.reset, initialType]);


  React.useEffect(() => {
    if (
      watchedType === 'expense' &&
      watchedAmount > 0 &&
      watchedCategory &&
      !savingGoals.some(sg => sg.id === watchedCategory) &&
      !existingTransaction
    ) {
      const transactionMonth = format(watchedDate || new Date(), 'yyyy-MM');
      const budgetForCategory = budgets.find(
        (b) => b.category === watchedCategory && b.month === transactionMonth
      );

      if (budgetForCategory) {
        const { limit, spent } = budgetForCategory;
        const remainingBudget = limit - spent;

        if (watchedAmount < remainingBudget) {
          setBudgetHint({
            text: `You'll have ${formatCurrency(remainingBudget - watchedAmount)} left in this budget.`,
            color: 'text-amber-600',
          });
        } else if (watchedAmount === remainingBudget) {
          setBudgetHint({
            text: 'This will use up your remaining budget exactly.',
            color: 'text-emerald-600',
          });
        } else {
          if (remainingBudget >= 0) {
            setBudgetHint({
              text: `This exceeds your budget by ${formatCurrency(watchedAmount - remainingBudget)}.`,
              color: 'text-destructive',
            });
          } else {
             setBudgetHint({
              text: `This category is already over budget. This adds ${formatCurrency(watchedAmount)} more.`,
              color: 'text-destructive',
            });
          }
        }
      } else {
        setBudgetHint(null);
      }
    } else {
      setBudgetHint(null);
    }
  }, [watchedAmount, watchedCategory, watchedDate, watchedType, budgets, savingGoals, existingTransaction]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            form.setError("receiptDataUrl", { message: "File size should not exceed 5MB." });
            setReceiptPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            form.setValue('receiptDataUrl', reader.result as string);
            setReceiptPreview(reader.result as string);
        };
        reader.onerror = () => {
            form.setError("receiptDataUrl", { message: "Failed to read file." });
            setReceiptPreview(null);
        }
        reader.readAsDataURL(file);
    } else {
        form.setValue('receiptDataUrl', undefined);
        setReceiptPreview(null);
    }
  };

  const onSubmit = (values: TransactionFormValues) => {
    const transactionData: Transaction = {
        ...values,
        id: values.id || `tx-${Date.now().toString()}`,
        amount: values.amount,
        description: values.description || undefined,
        receiptDataUrl: values.receiptDataUrl || undefined,
    };
    onSaveTransaction(transactionData);
    onOpenChange(false);
  };

  const incomeCategories = React.useMemo(() => {
    return categoriesForSelect.filter(cat => cat.isIncomeSource === true)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoriesForSelect]);

  const regularExpenseCategories = React.useMemo(() => {
    return categoriesForSelect.filter(cat =>
        cat.isIncomeSource !== true &&
        cat.id !== 'savings' &&
        (existingTransaction?.category === cat.id || currentMonthBudgetCategoryIds.includes(cat.id))
      )
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoriesForSelect, currentMonthBudgetCategoryIds, existingTransaction]);

  const userSavingGoals = React.useMemo(() => {
    return (savingGoals || []).map(goal => {
      const goalCatInfo = categoriesForSelect.find(c => c.id === goal.goalCategoryId);
      return {
        id: goal.id,
        label: goal.name,
        icon: goalCatInfo?.icon || 'PiggyBank',
      };
    }).sort((a,b) => a.label.localeCompare(b.label));
  }, [savingGoals, categoriesForSelect]);


  React.useEffect(() => {
     const currentCategoryValue = form.getValues('category');
     if (!currentCategoryValue && !existingTransaction) {
        setBudgetHint(null);
        return;
     }

     // If type changes during an edit, or if initialType forces a type different from existing, reset category
     if ( (existingTransaction && existingTransaction.type !== watchedType) ||
          (initialType && !existingTransaction && initialType !== form.getValues('type')) ) {
         form.setValue('category', '');
         setBudgetHint(null);
     } else {
        let isValidForType = false;
        if (watchedType === 'income') {
            isValidForType = incomeCategories.some(cat => cat.id === currentCategoryValue);
        } else {
            isValidForType = regularExpenseCategories.some(cat => cat.id === currentCategoryValue) ||
                             userSavingGoals.some(goal => goal.id === currentCategoryValue);
        }
        // Only reset if category is not valid for the current type AND we are not editing
        // OR if an initialType is set and the current category doesn't fit that initial type.
        if ((!isValidForType && !existingTransaction) || (initialType && !existingTransaction && !isValidForType) ){
            form.setValue('category', '');
            setBudgetHint(null);
        }
     }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [watchedType, initialType]);


  const showTypeSelector = !existingTransaction && !initialType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg p-0 h-[90vh] flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>
            {existingTransaction ? "Edit Transaction" :
             initialType ? `Add ${initialType.charAt(0).toUpperCase() + initialType.slice(1)}` : "Add Transaction"}
          </SheetTitle>
          <SheetDescription>
            {existingTransaction ? "Update the details of this transaction." : "Log a new income or expense. Description and receipt are optional."}
          </SheetDescription>
        </SheetHeader>
         <ScrollArea className="flex-grow overflow-y-auto">
          <Form {...form}>
            <form id="add-transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
              {showTypeSelector && (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                              if (value === 'expense' && !canAddExpense && !existingTransaction) {
                                  return;
                              }
                              field.onChange(value);
                              setBudgetHint(null);
                          }}
                          value={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="expense" id="expense" disabled={!canAddExpense && !existingTransaction && !(existingTransaction?.type === 'expense')} />
                            </FormControl>
                            <FormLabel htmlFor="expense" className={cn("font-normal cursor-pointer", !canAddExpense && !existingTransaction && !(existingTransaction?.type === 'expense') && "text-muted-foreground/50 cursor-not-allowed")}>Expense</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="income" id="income" />
                            </FormControl>
                            <FormLabel htmlFor="income" className="font-normal cursor-pointer">Income</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      {!canAddExpense && watchedType === 'expense' && !existingTransaction && <FormDescription className="text-xs text-destructive">Set expense budgets first to enable logging expenses for budgeted categories.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                         onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        step="0.01"
                        min="0.01"
                        />
                    </FormControl>
                    <FormMessage />
                    {budgetHint && (
                        <p className={cn("text-xs mt-1 font-medium", budgetHint.color)}>
                            {budgetHint.text}
                        </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                     <Select onValueChange={
                        (value) => {
                            field.onChange(value);
                            setBudgetHint(null);
                        }
                     } value={field.value} >
                      <FormControl>
                        <SelectTrigger disabled={
                            (watchedType === 'income' && incomeCategories.length === 0) ||
                            (watchedType === 'expense' && regularExpenseCategories.length === 0 && userSavingGoals.length === 0 && !existingTransaction)
                        }>
                          <SelectValue placeholder={
                            watchedType === 'income' && incomeCategories.length === 0 ? 'No income categories' :
                            (watchedType === 'expense' && regularExpenseCategories.length === 0 && userSavingGoals.length === 0 && !existingTransaction) ? 'No budgeted categories or goals' :
                            `Select ${watchedType} category`
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <ScrollArea className="max-h-[250px]">
                            {watchedType === 'income' && incomeCategories.length > 0 && (
                                incomeCategories.map((category) => {
                                   const Icon = getCategoryIconComponent(category.icon);
                                   return (
                                     <SelectItem key={category.id} value={category.id}>
                                       <div className="flex items-center gap-2">
                                         <Icon className="h-4 w-4 text-muted-foreground" />
                                         <span>{category.label}</span>
                                       </div>
                                     </SelectItem>
                                   );
                                 })
                             )}
                             {watchedType === 'expense' && (
                                <>
                                  {regularExpenseCategories.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel>Expense Categories</SelectLabel>
                                      {regularExpenseCategories.map((category) => {
                                        const Icon = getCategoryIconComponent(category.icon);
                                        return (
                                          <SelectItem key={category.id} value={category.id}>
                                            <div className="flex items-center gap-2">
                                              <Icon className="h-4 w-4 text-muted-foreground" />
                                              <span>{category.label}</span>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectGroup>
                                  )}
                                  {userSavingGoals.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel>Allocate to Saving Goal (as Expense)</SelectLabel>
                                      {userSavingGoals.map((goal) => {
                                         const GoalCatIcon = getCategoryIconComponent(goal.icon);
                                        return (
                                          <SelectItem key={goal.id} value={goal.id}>
                                            <div className="flex items-center gap-2">
                                              <GoalCatIcon className="h-4 w-4 text-accent" />
                                              <span>{goal.label}</span>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectGroup>
                                  )}
                                </>
                             )}
                             {((watchedType === 'income' && incomeCategories.length === 0) ||
                               (watchedType === 'expense' && regularExpenseCategories.length === 0 && userSavingGoals.length === 0)
                             ) && (
                                  <SelectItem value="no-cat" disabled>
                                    {watchedType === 'expense' ? 'No categories with active budgets or saving goals' : `No ${watchedType} categories available`}
                                  </SelectItem>
                             )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{watchedType === 'income' ? 'Date of Income' : 'Date of Expense'}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date ?? new Date());
                            setBudgetHint(null);
                          }}
                          initialFocus
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                            placeholder="Add a note (e.g., Lunch with colleagues)"
                            {...field}
                            rows={2}
                            className="resize-none"
                         />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="receiptDataUrl"
                    render={() => (
                        <FormItem>
                            <FormLabel>Receipt (Optional)</FormLabel>
                            <FormControl>
                                <Input
                                    ref={fileInputRef}
                                    id="receipt-file-input"
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-primary/20"
                                />
                            </FormControl>
                            {receiptPreview && (
                                <div className="mt-2 relative w-24 h-24 border rounded-md overflow-hidden shadow-sm">
                                    {receiptPreview.startsWith('data:image') ? (
                                      <img src={receiptPreview} alt="Receipt preview" className="object-cover w-full h-full" data-ai-hint="receipt image" />
                                    ) : receiptPreview.startsWith('data:application/pdf') ? (
                                      <div className="flex flex-col items-center justify-center w-full h-full bg-muted text-muted-foreground text-xs p-1">
                                        <Paperclip className="h-6 w-6 mb-1"/> PDF Attached
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground text-xs">Invalid file</div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0.5 right-0.5 h-6 w-6 bg-destructive/80 text-destructive-foreground hover:bg-destructive rounded-full"
                                        onClick={() => {
                                            form.setValue('receiptDataUrl', undefined);
                                            setReceiptPreview(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <FormDescription className="text-xs">Max file size: 5MB. Accepted formats: JPG, PNG, GIF, PDF.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
          </Form>
         </ScrollArea>
        <SheetFooter className="mt-auto p-4 pt-2 border-t bg-background sticky bottom-0">
            <SheetClose asChild>
                <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }}>Cancel</Button>
            </SheetClose>
            <Button type="submit" form="add-transaction-form">{existingTransaction ? "Save Changes" : "Add Transaction"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    