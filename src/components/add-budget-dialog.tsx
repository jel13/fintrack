

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


// Schema focuses solely on percentage input
const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  percentage: z.coerce.number({ invalid_type_error: "Percentage must be a number", required_error: "Percentage is required" })
    .gte(0.1, "Percentage must be at least 0.1%") // Minimum percentage
    .lte(100, "Percentage cannot exceed 100%")
    .multipleOf(0.1, { message: "Percentage can have max 1 decimal place" }), // Allow one decimal place
});


type BudgetFormValues = z.infer<typeof formSchema>;

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Callback provides the selected category and the *percentage* allocated
  onAddBudget: (budget: Omit<Budget, 'id' | 'spent' | 'month' | 'limit'>) => void;
  existingBudgetCategoryIds: string[]; // Pass IDs of categories that *already* have budgets this month (excluding savings)
  availableSpendingCategories: Category[]; // Pass available spending categories (excluding parents and savings)
  monthlyIncome: number | null; // Pass income for calculations
  totalAllocatedPercentage: number; // Pass current percentage allocated to *other* expense categories
}

export function AddBudgetDialog({
    open,
    onOpenChange,
    onAddBudget,
    existingBudgetCategoryIds,
    availableSpendingCategories,
    monthlyIncome,
    totalAllocatedPercentage
}: AddBudgetDialogProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      percentage: undefined, // Start with no preset percentage
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
     if (open) {
         form.reset({ category: "", percentage: undefined });
     }
  }, [open, form]);


  const { watch, setError } = form;
  const percentageValue = watch('percentage');

  // Calculate available percentage (remaining from 100% after allocating to other expense categories)
  const availablePercentage = React.useMemo(() => {
      // Ensure precision and handle potential floating point issues
      return Math.max(0, parseFloat((100 - totalAllocatedPercentage).toFixed(1)));
  }, [totalAllocatedPercentage]);

  // Calculate monetary value based on percentage and income
  const calculatedLimit = React.useMemo(() => {
      if (monthlyIncome && monthlyIncome > 0 && percentageValue !== undefined && percentageValue > 0) {
          return parseFloat(((percentageValue / 100) * monthlyIncome).toFixed(2));
      }
      return 0;
  }, [percentageValue, monthlyIncome]);


  const onSubmit = (values: BudgetFormValues) => {
    // Validate against available percentage dynamically
    if (values.percentage > availablePercentage) {
         setError("percentage", { message: `Allocation exceeds 100% of income. Max available: ${availablePercentage.toFixed(1)}%` });
         return;
    }

    const finalValues = {
        category: values.category,
        percentage: values.percentage,
        // limit and spent are calculated later when saving AppData
    };
    onAddBudget(finalValues);
    onOpenChange(false);
  };

  // Filter out categories that already have a budget set for the current period
  const categoriesForSelect = React.useMemo(() => {
    return availableSpendingCategories.filter(cat => !existingBudgetCategoryIds.includes(cat.id));
  }, [availableSpendingCategories, existingBudgetCategoryIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Category Budget</DialogTitle>
          <DialogDescription>
             Allocate a percentage of your monthly income ({formatCurrency(monthlyIncome ?? 0)}) to this expense category. The monetary limit will be calculated automatically.
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
                          All categories have budgets or none available
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
                    <FormLabel>Budget Percentage (%)</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder={`e.g., 15 (Max ${availablePercentage.toFixed(1)}% available)`}
                            {...field}
                            step="0.1" // Allow decimals
                            max={availablePercentage} // Set max based on availability
                            min="0.1" // Minimum percentage
                            // Convert undefined to empty string for controlled input
                            value={field.value === undefined ? '' : field.value}
                            onChange={e => {
                                const val = e.target.value;
                                // Allow empty string or parse as number
                                field.onChange(val === '' ? undefined : parseFloat(val));
                            }}
                            disabled={!monthlyIncome || monthlyIncome <= 0} />
                    </FormControl>
                     <FormDescription>
                        Enter the percentage of income ({formatCurrency(monthlyIncome ?? 0)}) for this budget.
                      </FormDescription>
                    {!monthlyIncome || monthlyIncome <= 0 ? (
                        <p className="text-sm font-medium text-destructive">
                            Set income first to calculate amounts.
                        </p>
                    ) : percentageValue !== undefined && percentageValue > 0 ? (
                         <p className="text-sm text-muted-foreground">
                            Calculated Limit: {formatCurrency(calculatedLimit)}
                         </p>
                    ) : null }
                     <FormMessage />
                      <p className="text-xs text-muted-foreground pt-1">
                          Available to allocate: {availablePercentage.toFixed(1)}%
                      </p>
                    </FormItem>
                )}
                />

          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="add-budget-form" disabled={!monthlyIncome || monthlyIncome <= 0}>Save Budget</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
