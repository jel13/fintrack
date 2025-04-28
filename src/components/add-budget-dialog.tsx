"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Switch } from "@/components/ui/switch"

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
import CategoryIcon, { getCategoryIconComponent } from '@/components/category-icon'; // Use new CategoryIcon
import { Label } from "@/components/ui/label";

// Schema allows either limit or percentage, or both if they match income
const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  limit: z.coerce.number().nonnegative("Limit must be non-negative").optional(),
  percentage: z.coerce.number().gte(0, "Percentage must be >= 0").lte(100, "Percentage must be <= 100").optional(),
  isPercentageInput: z.boolean().default(false),
}).refine(data => data.limit !== undefined || data.percentage !== undefined, {
    message: "Please set either a monetary limit or a percentage",
    path: ["limit"], // Attach error to one field for display
}).refine(data => !(data.limit === 0 && data.percentage === 0), {
    message: "Budget cannot be zero for both limit and percentage.",
    path: ["limit"],
});


type BudgetFormValues = z.infer<typeof formSchema>;

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBudget: (budget: Omit<Budget, 'id' | 'spent' | 'month'>) => void;
  existingCategories: string[]; // Pass IDs of categories that already have budgets
  categories: Category[]; // Pass available spending categories
  monthlyIncome: number | null; // Pass income for calculations
}

export function AddBudgetDialog({ open, onOpenChange, onAddBudget, existingCategories, categories: availableCategories, monthlyIncome }: AddBudgetDialogProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      limit: undefined,
      percentage: undefined,
      isPercentageInput: false,
    },
  });

  const { watch, setValue } = form;
  const isPercentageInput = watch('isPercentageInput');
  const limitValue = watch('limit');
  const percentageValue = watch('percentage');

  React.useEffect(() => {
    if (monthlyIncome && monthlyIncome > 0) {
      if (isPercentageInput && percentageValue !== undefined) {
        const calculatedLimit = parseFloat(((percentageValue / 100) * monthlyIncome).toFixed(2));
        setValue('limit', calculatedLimit, { shouldValidate: true });
      } else if (!isPercentageInput && limitValue !== undefined) {
        const calculatedPercentage = parseFloat(((limitValue / monthlyIncome) * 100).toFixed(1));
         setValue('percentage', calculatedPercentage > 100 ? 100 : calculatedPercentage, { shouldValidate: true }); // Cap at 100%
      }
    } else {
        // If no income, clear the derived value
        if (isPercentageInput) setValue('limit', undefined);
        else setValue('percentage', undefined);
    }
  }, [isPercentageInput, limitValue, percentageValue, monthlyIncome, setValue]);

  // Clear the other field when switching input mode if income exists
  React.useEffect(() => {
      if(monthlyIncome && monthlyIncome > 0) {
          if (isPercentageInput) {
              setValue('limit', undefined);
          } else {
              setValue('percentage', undefined);
          }
      }
  }, [isPercentageInput, monthlyIncome, setValue]);


  const onSubmit = (values: BudgetFormValues) => {
    const finalValues = {
        category: values.category,
        // Ensure values are numbers, default to 0 if undefined
        limit: values.limit ?? 0,
        percentage: values.percentage, // Keep undefined if not calculated/set
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
            Define a spending limit for a category this month. Input either a percentage or a fixed amount.
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
              name="isPercentageInput"
              render={({ field }) => (
                 <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Input Mode</FormLabel>
                      <FormDescription>
                         {field.value ? "Enter percentage of income" : "Enter fixed monetary amount"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!monthlyIncome || monthlyIncome <= 0} // Disable switch if no income
                      />
                    </FormControl>
                </FormItem>
              )}
              />

            {isPercentageInput ? (
                 <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} step="0.1" value={field.value ?? ''} disabled={!monthlyIncome || monthlyIncome <= 0}/>
                      </FormControl>
                       {monthlyIncome && monthlyIncome > 0 && field.value !== undefined && (
                         <FormDescription>
                           Calculated Limit: ${((field.value / 100) * monthlyIncome).toFixed(2)}
                         </FormDescription>
                       )}
                       {!monthlyIncome || monthlyIncome <= 0 && (
                           <FormDescription className="text-destructive">
                                Set income first to use percentages.
                           </FormDescription>
                       )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
            ) : (
                 <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Monthly Limit ($)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="100.00" {...field} step="0.01" value={field.value ?? ''}/>
                        </FormControl>
                         {monthlyIncome && monthlyIncome > 0 && field.value !== undefined && field.value > 0 && (
                             <FormDescription>
                               Calculated Percentage: {((field.value / monthlyIncome) * 100).toFixed(1)}%
                             </FormDescription>
                         )}
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}

             {/* Display calculated value (read-only) */}
            {monthlyIncome && monthlyIncome > 0 && (
                isPercentageInput && limitValue !== undefined ? (
                <FormItem>
                    <Label className="text-muted-foreground">Calculated Limit ($)</Label>
                    <Input type="number" value={limitValue.toFixed(2)} readOnly disabled className="bg-muted/50" />
                </FormItem>
                ) : !isPercentageInput && percentageValue !== undefined ? (
                 <FormItem>
                    <Label className="text-muted-foreground">Calculated Percentage (%)</Label>
                    <Input type="number" value={percentageValue.toFixed(1)} readOnly disabled className="bg-muted/50"/>
                 </FormItem>
                 ) : null
            )}


          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="add-budget-form">Save Budget</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
