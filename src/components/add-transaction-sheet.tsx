
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Paperclip, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
import type { Transaction, Category } from "@/types";
import { getCategoryIconComponent } from '@/components/category-icon';

const formSchema = z.object({
  id: z.string().optional(), // ID is optional, present if editing
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
  onSaveTransaction: (transaction: Transaction) => void; // Changed prop name and type
  categoriesForSelect: Category[];
  canAddExpense: boolean;
  currentMonthBudgetCategoryIds: string[];
  existingTransaction?: Transaction | null; // To pre-fill form for editing
}

export function AddTransactionSheet({
    open,
    onOpenChange,
    onSaveTransaction,
    categoriesForSelect,
    canAddExpense,
    currentMonthBudgetCategoryIds,
    existingTransaction,
}: AddTransactionSheetProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    // Default values set by useEffect below
  });

  const [receiptPreview, setReceiptPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
     if (open) {
         if (existingTransaction) {
             form.reset({
                 id: existingTransaction.id,
                 type: existingTransaction.type,
                 amount: existingTransaction.amount,
                 category: existingTransaction.category,
                 date: new Date(existingTransaction.date), // Ensure it's a Date object
                 description: existingTransaction.description || "",
                 receiptDataUrl: existingTransaction.receiptDataUrl || undefined,
             });
             setReceiptPreview(existingTransaction.receiptDataUrl || null);
         } else {
             form.reset({
                 id: undefined,
                 type: canAddExpense ? "expense" : "income",
                 amount: undefined,
                 category: "",
                 date: new Date(),
                 description: "",
                 receiptDataUrl: undefined,
             });
             setReceiptPreview(null);
         }
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
         }
     }
  }, [open, existingTransaction, canAddExpense, form]);


  const transactionType = form.watch("type");

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
        id: values.id || `tx-${Date.now().toString()}`, // Use existing ID or generate new
        amount: values.amount, // Ensure amount is a number
        description: values.description || undefined,
        receiptDataUrl: values.receiptDataUrl || undefined,
    };
    onSaveTransaction(transactionData);
    onOpenChange(false);
  };

  const filteredCategories = React.useMemo(() => {
    return categoriesForSelect.filter(cat => {
        if (transactionType === 'income') {
            return cat.isIncomeSource === true;
        } else {
            return cat.isIncomeSource !== true && cat.id !== 'savings' && (existingTransaction?.category === cat.id || currentMonthBudgetCategoryIds.includes(cat.id));
        }
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [transactionType, categoriesForSelect, currentMonthBudgetCategoryIds, existingTransaction]);

  React.useEffect(() => {
     const currentCategory = form.getValues('category');
     if (!currentCategory && !existingTransaction) return;


     if (existingTransaction && existingTransaction.type !== transactionType) {
         form.setValue('category', '');
     } else {
        const isValidForType = filteredCategories.some(cat => cat.id === currentCategory);
        if (!isValidForType && !existingTransaction) { // Only reset if not editing and current category is invalid
            form.setValue('category', '');
        }
     }
  }, [transactionType, filteredCategories, form, existingTransaction]);


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg p-0 h-[90vh] flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>{existingTransaction ? "Edit Transaction" : "Add Transaction"}</SheetTitle>
          <SheetDescription>
            {existingTransaction ? "Update the details of this transaction." : "Log a new income or expense. Description and receipt are optional."}
          </SheetDescription>
        </SheetHeader>
         <ScrollArea className="flex-grow overflow-y-auto">
          <Form {...form}>
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
                            if (value === 'expense' && !canAddExpense && !existingTransaction) { // Allow changing type if editing
                                return;
                            }
                            field.onChange(value);
                        }}
                        value={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="expense" id="expense" disabled={!canAddExpense && !existingTransaction} />
                          </FormControl>
                          <FormLabel htmlFor="expense" className={cn("font-normal cursor-pointer", !canAddExpense && !existingTransaction && "text-muted-foreground/50 cursor-not-allowed")}>Expense</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="income" id="income" />
                          </FormControl>
                          <FormLabel htmlFor="income" className="font-normal cursor-pointer">Income</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                     {!canAddExpense && transactionType === 'expense' && !existingTransaction && <FormDescription className="text-xs text-destructive">Set expense budgets first to enable logging expenses for budgeted categories.</FormDescription>}
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
                        <SelectTrigger disabled={transactionType === 'expense' && filteredCategories.length === 0 && !existingTransaction}>
                          <SelectValue placeholder={transactionType === 'expense' && filteredCategories.length === 0 && !existingTransaction ? 'No budgeted categories' : `Select ${transactionType} category`} />
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
                              <SelectItem value="no-cat" disabled>
                                {transactionType === 'expense' ? 'No categories with active budgets' : `No ${transactionType} categories available`}
                              </SelectItem>
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
                          onSelect={(date) => field.onChange(date ?? new Date())}
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
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-primary/20"
                                />
                            </FormControl>
                            {receiptPreview && (
                                <div className="mt-2 relative w-24 h-24 border rounded-md overflow-hidden shadow-sm">
                                    <img src={receiptPreview} alt="Receipt preview" className="object-cover w-full h-full" />
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
                            <FormDescription className="text-xs">Max file size: 5MB. Accepted formats: JPG, PNG, GIF.</FormDescription>
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
