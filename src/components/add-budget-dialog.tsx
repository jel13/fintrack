
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Info } from "lucide-react";
import { format } from "date-fns"; // Import format

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
import { formatCurrency } from "@/lib/utils";


const formSchema = z.object({
  id: z.string().optional(), // ID is optional, present if editing
  category: z.string().min(1, "Category is required"),
  percentage: z.coerce.number({ invalid_type_error: "Percentage must be a number", required_error: "Percentage is required" })
    .gte(0.1, "Percentage must be at least 0.1%")
    .lte(100, "Percentage cannot exceed 100%")
    .multipleOf(0.1, { message: "Percentage can have max 1 decimal place" }),
});


type BudgetFormValues = z.infer<typeof formSchema>;

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveBudget: (budget: Budget) => void;
  existingBudgetCategoryIds: string[];
  availableSpendingCategories: Category[];
  monthlyIncome: number | null;
  totalAllocatedPercentage: number;
  existingBudget?: Budget | null;
}

export function AddBudgetDialog({
    open,
    onOpenChange,
    onSaveBudget,
    existingBudgetCategoryIds,
    availableSpendingCategories,
    monthlyIncome,
    totalAllocatedPercentage,
    existingBudget
}: AddBudgetDialogProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
     if (open) {
         if (existingBudget) {
             form.reset({
                 id: existingBudget.id,
                 category: existingBudget.category,
                 percentage: existingBudget.percentage,
             });
         } else {
             form.reset({ id: undefined, category: "", percentage: undefined });
         }
     }
  }, [open, existingBudget, form]);


  const { watch, setError, setValue } = form;
  const percentageValue = watch('percentage');
  const categoryValue = watch('category');

  const availablePercentage = React.useMemo(() => {
      // totalAllocatedPercentage is the sum of percentages of *other* budgets
      // If editing, the current budget's old percentage is already excluded from totalAllocatedPercentage
      return Math.max(0, parseFloat((100 - totalAllocatedPercentage).toFixed(1)));
  }, [totalAllocatedPercentage]);

  const calculatedLimit = React.useMemo(() => {
      if (monthlyIncome && monthlyIncome > 0 && percentageValue !== undefined && percentageValue > 0) {
          return parseFloat(((percentageValue / 100) * monthlyIncome).toFixed(2));
      }
      return 0;
  }, [percentageValue, monthlyIncome]);


  const onSubmit = (values: BudgetFormValues) => {
    if (values.percentage > availablePercentage + 0.01) { // Add small tolerance for floating point
         setError("percentage", { message: `Allocation exceeds 100% of income. Max available for this budget: ${availablePercentage.toFixed(1)}%` });
         return;
    }

    const budgetToSave: Budget = {
        id: values.id || `b-${values.category}-${Date.now().toString()}`,
        category: values.category,
        percentage: values.percentage,
        limit: calculatedLimit,
        spent: existingBudget?.spent ?? 0,
        month: existingBudget?.month ?? format(new Date(), 'yyyy-MM'), // Corrected: Use format from date-fns
    };
    onSaveBudget(budgetToSave);
    onOpenChange(false);
  };

  const categoriesForSelect = React.useMemo(() => {
    if (existingBudget) {
        const currentCat = availableSpendingCategories.find(cat => cat.id === existingBudget.category);
        return currentCat ? [currentCat] : [];
    }
    return availableSpendingCategories.filter(cat => !existingBudgetCategoryIds.includes(cat.id));
  }, [availableSpendingCategories, existingBudgetCategoryIds, existingBudget]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingBudget ? "Edit Budget" : "Set Category Budget"}</DialogTitle>
          <DialogDescription>
             {existingBudget ? "Update the percentage for this budget." : `Allocate a percentage of your monthly income (${formatCurrency(monthlyIncome ?? 0)}) to this expense category.`} The monetary limit will be calculated.
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!existingBudget}
                  >
                    <FormControl>
                      <SelectTrigger disabled={!!existingBudget}>
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
                          {existingBudget ? "Category cannot be changed" : "All categories have budgets or none available"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {existingBudget && <FormDescription className="text-xs">Category cannot be changed when editing.</FormDescription>}
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
                            step="0.1"
                            max={availablePercentage > 0 ? availablePercentage : 100}
                            min="0.1"
                            value={field.value === undefined ? '' : field.value}
                            onChange={e => {
                                const val = e.target.value;
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
                          Total available to allocate across all budgets: {availablePercentage.toFixed(1)}%
                      </p>
                    </FormItem>
                )}
                />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="add-budget-form" disabled={!monthlyIncome || monthlyIncome <= 0}>
            {existingBudget ? "Save Changes" : "Set Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
