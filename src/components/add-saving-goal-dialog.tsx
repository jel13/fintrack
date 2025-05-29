
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavingGoal, SavingGoalCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCategoryIconComponent } from '@/components/category-icon';

const formSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(50, "Name max 50 chars"),
  goalCategoryId: z.string().min(1, "Goal category is required"),
  savedAmount: z.coerce.number({invalid_type_error: "Saved amount must be a number"}).nonnegative("Saved amount cannot be negative").optional().default(0),
  percentageAllocation: z.coerce.number({ invalid_type_error: "Percentage must be a number", required_error: "Allocation percentage is required" })
    .gte(0.1, "Allocation must be at least 0.1%")
    .lte(100, "Allocation cannot exceed 100%")
    .multipleOf(0.1, { message: "Allocation can have max 1 decimal place" }),
  description: z.string().max(100, "Description max 100 chars").optional(),
});

type GoalFormValues = z.infer<typeof formSchema>;

interface AddSavingGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGoal: (goal: Omit<SavingGoal, 'id'> & { id?: string }) => void;
  existingGoal: SavingGoal | null;
  totalAllocatedPercentageToOtherGoals: number;
  savingsBudgetAmount: number; // Total amount available in the main "Savings" budget for the month
  savingGoalCategories: SavingGoalCategory[];
}

export function AddSavingGoalDialog({
    open,
    onOpenChange,
    onSaveGoal,
    existingGoal,
    totalAllocatedPercentageToOtherGoals,
    savingsBudgetAmount,
    savingGoalCategories
}: AddSavingGoalDialogProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingGoal ? {
        name: existingGoal.name,
        goalCategoryId: existingGoal.goalCategoryId,
        savedAmount: existingGoal.savedAmount,
        percentageAllocation: existingGoal.percentageAllocation,
        description: existingGoal.description,
    } : {
      name: "",
      goalCategoryId: "",
      savedAmount: 0,
      percentageAllocation: undefined,
      description: "",
    },
  });

   React.useEffect(() => {
        form.reset(existingGoal ? {
            name: existingGoal.name,
            goalCategoryId: existingGoal.goalCategoryId,
            savedAmount: existingGoal.savedAmount,
            percentageAllocation: existingGoal.percentageAllocation,
            description: existingGoal.description,
        } : {
            name: "",
            goalCategoryId: "",
            savedAmount: 0,
            percentageAllocation: undefined,
            description: "",
        });
    }, [open, existingGoal, form]);

  const { watch, setError, setValue } = form;
  const currentPercentage = watch('percentageAllocation');

  const maxAllowedPercentage = React.useMemo(() => {
      return Math.max(0, parseFloat((100 - totalAllocatedPercentageToOtherGoals).toFixed(1)));
  }, [totalAllocatedPercentageToOtherGoals]);

  const calculatedMonthlyContribution = React.useMemo(() => {
      if (savingsBudgetAmount > 0 && currentPercentage !== undefined && currentPercentage > 0) {
          return (currentPercentage / 100) * savingsBudgetAmount;
      }
      return 0;
  }, [currentPercentage, savingsBudgetAmount]);

  const onSubmit = (values: GoalFormValues) => {
     const percentageToValidate = values.percentageAllocation ?? 0;
     if (percentageToValidate > maxAllowedPercentage + 0.01) { // Add small tolerance for floating point
         setError("percentageAllocation", { message: `Allocation exceeds 100% of savings budget (${formatCurrency(savingsBudgetAmount)}). Max available: ${maxAllowedPercentage.toFixed(1)}%` });
         return;
     }

    const dataToSave: Omit<SavingGoal, 'id'> & { id?: string } = {
        name: values.name,
        goalCategoryId: values.goalCategoryId,
        savedAmount: values.savedAmount ?? 0,
        percentageAllocation: percentageToValidate,
        description: values.description,
    };
     if (existingGoal) {
      dataToSave.id = existingGoal.id;
    }
    onSaveGoal(dataToSave);
    onOpenChange(false);
  };

  const isAllocationDisabled = savingsBudgetAmount <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{existingGoal ? "Edit Saving Goal" : "Add Saving Goal"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? "Update the details for your saving goal." : "Define a saving goal and allocate a portion of your monthly savings budget."}
          </DialogDescription>
        </DialogHeader>
        {isAllocationDisabled && (
             <Alert variant="destructive" className="mt-2">
                 <Info className="h-4 w-4" />
                 <AlertTitle>Savings Budget is ₱0</AlertTitle>
                 <AlertDescription className="text-xs">
                    You cannot allocate funds to goals until your monthly Savings Budget is positive. Adjust expense budgets on the Budgets tab to free up funds for savings.
                 </AlertDescription>
             </Alert>
        )}
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="saving-goal-form" className="space-y-4 py-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vacation Fund, New Laptop" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goalCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a goal category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(savingGoalCategories || []).map((category) => {
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
                        {(!savingGoalCategories || savingGoalCategories.length === 0) && (
                            <SelectItem value="no-goal-cats" disabled>No goal categories defined</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="savedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Saved Amount (₱)</FormLabel>
                    <FormControl>
                       <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        value={field.value === undefined ? '' : String(field.value)}
                         onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? 0 : parseFloat(val));
                        }}
                        step="0.01"
                        min="0"
                       />
                    </FormControl>
                    <FormDescription className="text-xs">How much have you already saved towards this goal?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                  control={form.control}
                  name="percentageAllocation"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Allocation (% of Monthly Savings)</FormLabel>
                      <FormControl>
                      <Input
                          type="number"
                          placeholder={isAllocationDisabled ? "Savings budget is ₱0" : `Max ${maxAllowedPercentage.toFixed(1)}% available`}
                          {...field}
                          value={field.value === undefined ? '' : String(field.value)}
                          onChange={e => {
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                          step="0.1"
                          max={maxAllowedPercentage > 0 ? maxAllowedPercentage : 100}
                          min="0.1"
                          disabled={isAllocationDisabled}
                      />
                      </FormControl>
                      <FormDescription className="text-xs">
                         Allocate a percentage of your monthly savings budget ({formatCurrency(savingsBudgetAmount)}) towards this goal.
                      </FormDescription>
                      {!isAllocationDisabled && currentPercentage !== undefined && currentPercentage > 0 && (
                         <p className="text-sm text-muted-foreground mt-1">
                            Planned Monthly Contribution: {formatCurrency(calculatedMonthlyContribution)}
                         </p>
                      )}
                      <FormMessage />
                      <p className="text-xs text-muted-foreground pt-1">
                          Total available percentage of savings to allocate to goals: {maxAllowedPercentage.toFixed(1)}%
                      </p>
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
                           placeholder="Add a note about this goal (e.g., For a down payment on a car)"
                           {...field}
                           rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </form>
          </Form>
         </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="saving-goal-form" disabled={isAllocationDisabled && !existingGoal /* Allow saving if editing an existing goal, even if budget is 0 */}>
             {existingGoal ? "Save Changes" : "Add Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

