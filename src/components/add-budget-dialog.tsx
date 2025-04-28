"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import type { Budget } from "@/types";
import { categories, getCategoryByValue } from "@/components/category-icon";

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  limit: z.coerce.number().positive("Limit must be a positive number"),
});

type BudgetFormValues = z.infer<typeof formSchema>;

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBudget: (budget: Omit<Budget, 'id' | 'spent' | 'month'>) => void;
  existingCategories: string[]; // Pass categories that already have budgets
}

export function AddBudgetDialog({ open, onOpenChange, onAddBudget, existingCategories }: AddBudgetDialogProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      limit: 0,
    },
  });

  const onSubmit = (values: BudgetFormValues) => {
    onAddBudget(values);
    form.reset();
    onOpenChange(false);
  };

  // Filter out income and categories that already have a budget set for the current period
  const availableCategories = React.useMemo(() => {
    return categories.filter(cat =>
      cat.value !== 'income' && !existingCategories.includes(cat.value)
    );
  }, [existingCategories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Budget</DialogTitle>
          <DialogDescription>
            Define a spending limit for a category this month.
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
                      {availableCategories.length > 0 ? (
                        availableCategories.map((category) => {
                          const Icon = category.icon;
                          return (
                           <SelectItem key={category.value} value={category.value}>
                             <div className="flex items-center gap-2">
                               <Icon className="h-4 w-4 text-muted-foreground" />
                               <span>{category.label}</span>
                             </div>
                           </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-categories" disabled>
                          All categories have budgets
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
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
