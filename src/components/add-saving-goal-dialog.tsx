
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Info, Calendar as CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { SavingGoal, SavingGoalCategory } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCategoryIconComponent } from '@/components/category-icon';

// Schema for the new SavingGoal structure
const formSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(50, "Name max 50 characters"),
  goalCategoryId: z.string().min(1, "Goal category is required"),
  targetAmount: z.coerce.number({ invalid_type_error: "Target amount must be a number", required_error: "Target amount is required" })
    .positive("Target amount must be a positive number."),
  savedAmount: z.coerce.number({invalid_type_error: "Saved amount must be a number"}).nonnegative("Saved amount cannot be negative").optional().default(0),
  percentageAllocation: z.coerce.number({ invalid_type_error: "Percentage must be a number", required_error: "Allocation percentage is required" })
    .gte(0.1, "Allocation must be at least 0.1%")
    .lte(100, "Allocation cannot exceed 100%")
    .multipleOf(0.1, { message: "Allocation can have max 1 decimal place" }),
  description: z.string().max(100, "Description max 100 characters").optional(),
  startDate: z.date().optional(),
  targetDate: z.date().optional(),
  savingMode: z.enum(['daily', 'weekly', 'monthly']).optional(),
}).refine(data => !data.targetAmount || data.savedAmount === undefined || data.savedAmount <= data.targetAmount, {
    message: "Initial saved amount cannot exceed the target amount.",
    path: ["savedAmount"],
}).refine(data => !data.startDate || !data.targetDate || data.startDate < data.targetDate, {
    message: "Target date must be after the start date.",
    path: ["targetDate"],
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
        targetAmount: existingGoal.targetAmount,
        savedAmount: existingGoal.savedAmount,
        percentageAllocation: existingGoal.percentageAllocation,
        description: existingGoal.description,
        startDate: existingGoal.startDate,
        targetDate: existingGoal.targetDate,
        savingMode: existingGoal.savingMode,
    } : {
      name: "",
      goalCategoryId: "",
      targetAmount: undefined,
      savedAmount: 0,
      percentageAllocation: undefined,
      description: "",
      startDate: new Date(),
      targetDate: undefined,
      savingMode: 'monthly',
    },
  });

   React.useEffect(() => {
        if (open) { // Reset form only when dialog opens
            form.reset(existingGoal ? {
                name: existingGoal.name,
                goalCategoryId: existingGoal.goalCategoryId,
                targetAmount: existingGoal.targetAmount,
                savedAmount: existingGoal.savedAmount,
                percentageAllocation: existingGoal.percentageAllocation,
                description: existingGoal.description || "",
                startDate: existingGoal.startDate,
                targetDate: existingGoal.targetDate,
                savingMode: existingGoal.savingMode || 'monthly',
            } : {
                name: "",
                goalCategoryId: "",
                targetAmount: undefined,
                savedAmount: 0,
                percentageAllocation: undefined,
                description: "",
                startDate: new Date(),
                targetDate: undefined,
                savingMode: 'monthly',
            });
        }
    }, [open, existingGoal, form]);

  const { watch, setError } = form;
  const currentPercentage = watch('percentageAllocation');

  const maxAllowedPercentage = React.useMemo(() => {
      return Math.max(0, parseFloat((100 - totalAllocatedPercentageToOtherGoals).toFixed(1)));
  }, [totalAllocatedPercentageToOtherGoals]);

  const calculatedMonthlyContribution = React.useMemo(() => {
      if (savingsBudgetAmount > 0 && typeof currentPercentage === 'number' && currentPercentage > 0) {
          return (currentPercentage / 100) * savingsBudgetAmount;
      }
      return 0;
  }, [currentPercentage, savingsBudgetAmount]);

  const onSubmit = (values: GoalFormValues) => {
    if (values.percentageAllocation && values.percentageAllocation > 100) {
        form.setError("percentageAllocation", {
            type: "manual",
            message: "Percentage for a single goal cannot exceed 100%.",
        });
        return;
    }
    
    const dataToSave: Omit<SavingGoal, 'id'> & { id?: string } = {
        name: values.name,
        goalCategoryId: values.goalCategoryId,
        targetAmount: values.targetAmount,
        savedAmount: values.savedAmount ?? 0,
        percentageAllocation: values.percentageAllocation ?? 0,
        description: values.description,
        startDate: values.startDate,
        targetDate: values.targetDate,
        savingMode: values.savingMode,
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
          <DialogTitle>{existingGoal ? "Edit Saving Goal" : "Create a New Saving Goal"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? "Update the details for your saving goal." : "Define a new goal and decide how much of your monthly savings to allocate to it."}
          </DialogDescription>
        </DialogHeader>
        {isAllocationDisabled && !existingGoal && (
             <Alert variant="destructive" className="mt-2">
                 <Info className="h-4 w-4" />
                 <AlertTitle>Savings Budget is ₱0</AlertTitle>
                 <AlertDescription className="text-xs">
                    You cannot allocate funds to new goals until your monthly Savings Budget is positive. Adjust expense budgets on the Budgets tab to free up funds for savings.
                 </AlertDescription>
             </Alert>
        )}
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="saving-goal-form" className="space-y-4 pt-1 pb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vacation Fund, New Laptop" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Give your goal a descriptive name.</FormDescription>
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
                    <FormDescription className="text-xs">Choose the type of goal you're saving for.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount (₱)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 50000"
                        {...field}
                        value={field.value === undefined ? '' : String(field.value)}
                        onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        step="0.01"
                        min="0.01"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">How much do you want to save in total for this goal?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="savedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Amount Saved (₱)</FormLabel>
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
                    <FormDescription className="text-xs">Enter the total amount you've already saved specifically for this goal.</FormDescription>
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
                          placeholder={isAllocationDisabled && !existingGoal ? "Savings budget is ₱0" : `Max ${maxAllowedPercentage.toFixed(1)}% available`}
                          {...field}
                          value={field.value === undefined ? '' : String(field.value)}
                          onChange={e => {
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                          step="0.1"
                          max={Math.min(100, maxAllowedPercentage > 0 ? maxAllowedPercentage : 100)}
                          min="0.1"
                          disabled={isAllocationDisabled && !existingGoal}
                      />
                      </FormControl>
                      <FormDescription className="text-xs">
                         Allocate a percentage of your total monthly savings budget ({formatCurrency(savingsBudgetAmount)}) to this goal.
                      </FormDescription>
                      {(!isAllocationDisabled || existingGoal) && typeof currentPercentage === 'number' && currentPercentage > 0 && calculatedMonthlyContribution >= 0 && (
                          <p className="text-sm font-medium text-primary mt-1.5">
                              Planned monthly contribution: <span className="font-bold">{formatCurrency(calculatedMonthlyContribution)}</span>
                          </p>
                      )}
                      <FormMessage />
                      <p className="text-xs text-muted-foreground pt-1">
                          Total savings budget portion available to allocate: {maxAllowedPercentage.toFixed(1)}%
                      </p>
                  </FormItem>
                  )}
              />

                <FormField
                control={form.control}
                name="savingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Savings Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a saving frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                        Set how often you plan to save. Reminders are planned for a future update.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
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
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Target Date</FormLabel>
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
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              form.getValues("startDate") ? date < form.getValues("startDate")! : false
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                           placeholder="Add a note about this goal (e.g., For a down payment)"
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
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="saving-goal-form" disabled={isAllocationDisabled && !existingGoal}>
             {existingGoal ? "Save Changes" : "Add Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
