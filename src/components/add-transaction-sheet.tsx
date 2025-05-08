

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

import { cn } from "@/lib/utils";
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
import type { Transaction, TransactionType, Category } from "@/types";
import { getCategoryIconComponent } from '@/components/category-icon'; // Use new CategoryIcon logic

const formSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number", required_error: "Amount is required" })
    .positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"), // Category ID (e.g., 'groceries', 'salary')
  date: z.date(),
  description: z.string().max(100, "Description max 100 chars").optional(), // Optional description
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  // Pass categories suitable for selection (includes income sources and spendable expense categories)
  categoriesForSelect: Category[];
  canAddExpense: boolean; // Flag to determine if expense option should be enabled
}

export function AddTransactionSheet({
    open,
    onOpenChange,
    onAddTransaction,
    categoriesForSelect,
    canAddExpense
}: AddTransactionSheetProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: canAddExpense ? "expense" : "income", // Default based on whether expenses are allowed
      amount: undefined, // Use undefined for number coercion
      category: "",
      date: new Date(),
      description: "",
    },
  });

  // Reset form when opening or when canAddExpense changes
  React.useEffect(() => {
     if (open) {
         form.reset({
             type: canAddExpense ? "expense" : "income",
             amount: undefined,
             category: "",
             date: new Date(),
             description: "",
         });
     }
  }, [open, canAddExpense, form]);


  const transactionType = form.watch("type");

  const onSubmit = (values: TransactionFormValues) => {
    onAddTransaction({
        ...values,
        category: values.category, // Category is now directly from selection based on type
        amount: values.amount, // Already validated as positive number
        date: values.date,
        description: values.description,
        type: values.type,
    });
    onOpenChange(false); // Close sheet after submission
  };

  // Filter categories based on selected transaction type
  const filteredCategories = React.useMemo(() => {
    return categoriesForSelect.filter(cat => {
        if (transactionType === 'income') {
            return cat.isIncomeSource === true;
        } else { // expense
             // Exclude income sources and the main 'savings' category (if present)
            return cat.isIncomeSource !== true && cat.id !== 'savings';
        }
    }).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
  }, [transactionType, categoriesForSelect]);

  // Reset category if type changes and current category is not valid for the new type
  React.useEffect(() => {
     const currentCategory = form.getValues('category');
     if (!currentCategory) return; // Don't reset if empty

     const isValidForType = filteredCategories.some(cat => cat.id === currentCategory);
     if (!isValidForType) {
         form.setValue('category', ''); // Reset category selection
     }
  }, [transactionType, filteredCategories, form]);


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg p-0 h-[90vh] flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>Add Transaction</SheetTitle>
          <SheetDescription>
            Log a new income or expense. Description is optional.
          </SheetDescription>
        </SheetHeader>
         <ScrollArea className="flex-grow overflow-y-auto"> {/* Wrap form content */}
          <Form {...form}>
            {/* Use ID add-transaction-form for the submit button */}
            <form id="add-transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                            // Only allow changing to 'expense' if canAddExpense is true
                            if (value === 'expense' && !canAddExpense) {
                                // Optionally show a toast or message here
                                return; // Prevent selection
                            }
                            field.onChange(value);
                        }}
                        value={field.value} // Use controlled value
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                             {/* Disable expense option if canAddExpense is false */}
                            <RadioGroupItem value="expense" id="expense" disabled={!canAddExpense} />
                          </FormControl>
                          <FormLabel htmlFor="expense" className={cn("font-normal cursor-pointer", !canAddExpense && "text-muted-foreground/50 cursor-not-allowed")}>Expense</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="income" id="income" />
                          </FormControl>
                          <FormLabel htmlFor="income" className="font-normal cursor-pointer">Income</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                     {!canAddExpense && <FormDescription className="text-xs text-destructive">Set expense budgets first to enable logging expenses.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                            // Allow empty string or parse as number
                            field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        step="0.01"
                        min="0.01"
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${transactionType} category`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => {
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
                         ) : (
                              <SelectItem value="no-cat" disabled>No {transactionType} categories available</SelectItem>
                         )}
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
                    <FormLabel>Date</FormLabel>
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
                              format(field.value, "PPP") // More readable date format
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
                          onSelect={(date) => field.onChange(date ?? new Date())} // Default to today if cleared
                          initialFocus
                          disabled={(date) => date > new Date()} // Disable future dates
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
                            rows={2} // Smaller text area
                            className="resize-none" // Prevent resizing
                         />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            </form>
          </Form>
         </ScrollArea> {/* End ScrollArea */}
        <SheetFooter className="mt-auto p-4 pt-2 border-t bg-background sticky bottom-0">
            <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            {/* Button triggers the form submission */}
            <Button type="submit" form="add-transaction-form">Save Transaction</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
