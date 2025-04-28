"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
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
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"), // Category ID
  date: z.date(),
  description: z.string().max(100, "Description max 100 chars").optional(), // Optional description
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[]; // Pass full categories list
}

export function AddTransactionSheet({ open, onOpenChange, onAddTransaction, categories }: AddTransactionSheetProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      category: "",
      date: new Date(),
      description: "",
    },
  });

  const transactionType = form.watch("type");

  const onSubmit = (values: TransactionFormValues) => {
    // Ensure category is 'income' if type is income
    const finalCategory = values.type === 'income' ? 'income' : values.category;
    onAddTransaction({
        ...values,
        category: finalCategory,
    });
    form.reset(); // Reset form after submission
    onOpenChange(false); // Close sheet after submission
  };

  // Filter categories based on selected transaction type
  const filteredCategories = React.useMemo(() => {
    if (transactionType === 'income') {
      return categories.filter(cat => cat.id === 'income');
    }
    // Exclude 'income' category for expenses and exclude parent categories
    return categories.filter(cat => cat.id !== 'income' && !categories.some(c => c.parentId === cat.id));
  }, [transactionType, categories]);

  // Reset category if type changes and current category is not valid
  React.useEffect(() => {
    if (transactionType === 'income' && form.getValues('category') !== 'income') {
      form.setValue('category', 'income');
    } else if (transactionType === 'expense' && form.getValues('category') === 'income') {
      form.setValue('category', ''); // Reset or set to a default expense category like 'other_expense'
    }
  }, [transactionType, form]);


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg p-4 h-[90vh] flex flex-col">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>Add Transaction</SheetTitle>
          <SheetDescription>
            Log a new income or expense item. Description is optional.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          {/* Use ID add-transaction-form for the submit button */}
          <form id="add-transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" id="expense" />
                        </FormControl>
                        <FormLabel htmlFor="expense" className="font-normal">Expense</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" id="income" />
                        </FormControl>
                        <FormLabel htmlFor="income" className="font-normal">Income</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
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
                    <Input type="number" placeholder="0.00" {...field} step="0.01" />
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
                   <Select onValueChange={field.onChange} value={field.value} disabled={transactionType === 'income'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => {
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
                        {transactionType === 'expense' && filteredCategories.length === 0 && (
                            <SelectItem value="no-cat" disabled>No expense categories available</SelectItem>
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
                        onSelect={field.onChange}
                        initialFocus
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
                      <Textarea placeholder="Add a note (e.g., Lunch with colleagues)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          </form>
        </Form>
        <SheetFooter className="mt-auto pt-4 border-t">
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
