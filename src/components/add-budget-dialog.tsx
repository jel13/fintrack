
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Budget, Category } from "@/types";
import { getCategoryIconComponent } from '@/components/category-icon';
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils"; // Use util function


// Schema focuses on percentage input
const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  percentage: z.coerce.number()
    .gte(0, "Percentage must be >= 0")
    .lte(100, "Percentage must be <= 100")
    .refine(val => val !== undefined && val > 0, "Percentage must be greater than 0"), // Ensure percentage is provided and > 0
});


type BudgetFormValues = z.infer<typeof formSchema>;

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBudget: (budget: Omit<Budget, 'id' | 'spent' | 'month' | 'limit'>) => void; // Limit calculated later
  existingCategories: string[]; // Pass IDs of categories that already have budgets
  categories: Category[]; // Pass available spending categories
  monthlyIncome: number | null; // Pass income for calculations
  totalAllocatedPercentage: number; // Pass current allocation total
}

export function AddBudgetDialog({ open, onOpenChange, onAddBudget, existingCategories, categories: availableCategories, monthlyIncome, totalAllocatedPercentage }: AddBudgetDialogProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      percentage: undefined,
    },
  });

  const { watch, setValue } = form;
  const percentageValue = watch('percentage');
  const selectedCategory = watch('category');

  // Calculate available percentage
  const availablePercentage = Math.max(0, 100 - totalAllocatedPercentage);

  // Calculate monetary value based on percentage and income
  const calculatedLimit = React.useMemo(() => {
      if (monthlyIncome && monthlyIncome > 0 && percentageValue !== undefined) {
          return parseFloat(((percentageValue / 100) * monthlyIncome).toFixed(2));
      }
      return 0;
  }, [percentageValue, monthlyIncome]);


  const onSubmit = (values: BudgetFormValues) => {
    // Validate against available percentage
    if (values.percentage > availablePercentage) {
         form.setError("percentage", { message: `Allocation exceeds 100%. Max available: ${availablePercentage.toFixed(1)}%` });
         return;
    }

    const finalValues = {
        category: values.category,
        percentage: values.percentage,
    };
    onAddBudget(finalValues);
    form.reset();
    onOpenChange(false);
  };

  // Filter out categories that already have a budget set for the current period
  const categoriesForSelect = React.useMemo(() => {
    return availableCategories.filter(cat => !existingCategories.includes(cat.id) && cat.id !== 'savings'); // Exclude savings
  }, [availableCategories, existingCategories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Budget</DialogTitle>
          <DialogDescription>
             Define a spending limit by allocating a percentage of your income ({formatCurrency(monthlyIncome)}).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="add-budget-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriesForSelect.length > 0 ? (
                        categoriesForSelect.map((category) => {
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
                        <SelectItem value="no-categories" disabled>
                          All categories have budgets or no categories available
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
                name="percentage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Percentage (%)</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder={`e.g., 15 (Max ${availablePercentage.toFixed(1)}% available)`}
                            {...field}
                            step="0.1"
                            max={availablePercentage} // Set max based on availability
                            min={0}
                            value={field.value ?? ''}
                            disabled={!monthlyIncome || monthlyIncome <= 0} />
                    </FormControl>
                    {monthlyIncome && monthlyIncome > 0 && percentageValue !== undefined && (
                        <FormDescription>
                        Equivalent Amount: {formatCurrency(calculatedLimit)}
                        </FormDescription>
                    )}
                    {!monthlyIncome || monthlyIncome <= 0 && (
                        <FormDescription className="text-destructive">
                            Set income first to allocate percentages.
                        </FormDescription>
                    )}
                     <FormMessage />
                     {field.value !== undefined && field.value > availablePercentage && (
                          <p className="text-sm font-medium text-destructive">
                            Exceeds available percentage ({availablePercentage.toFixed(1)}%).
                          </p>
                      )}
                    </FormItem>
                )}
                />

            {/* Display calculated monetary value */}
             <FormItem>
                <Label className="text-muted-foreground">Calculated Amount ($)</Label>
                <Input type="text" value={formatCurrency(calculatedLimit)} readOnly disabled className="bg-muted/50" />
                 <FormDescription>This amount is automatically calculated based on the percentage.</FormDescription>
             </FormItem>


          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { form.reset(); onOpenChange(false); }}>Cancel</Button>
          <Button type="submit" form="add-budget-form">Save Budget</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

