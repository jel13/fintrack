

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SavingGoal } from "@/types";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils"; // Assuming formatCurrency is here


const formSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(50, "Name max 50 chars"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  // Percentage of the *monthly savings budget* to allocate
  percentageAllocation: z.coerce.number({ invalid_type_error: "Percentage must be a number" })
    .gte(0.1, "Allocation must be at least 0.1%") // Minimum allocation
    .lte(100, "Allocation cannot exceed 100%")
    .multipleOf(0.1, { message: "Allocation can have max 1 decimal place" }) // Allow one decimal place
    .optional(), // Make optional initially, require later if needed
  targetDate: z.date().optional().nullable(),
  description: z.string().max(100, "Description max 100 chars").optional(),
  icon: z.string().optional(), // Assuming icon name string
}).refine(data => data.percentageAllocation !== undefined && data.percentageAllocation > 0, {
    message: "Please allocate a percentage > 0 of your savings", // Require percentage allocation
    path: ["percentageAllocation"],
});


type GoalFormValues = z.infer<typeof formSchema>;

interface AddSavingGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGoal: (goal: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string }) => void; // id is optional for create
  existingGoal: SavingGoal | null; // Pass goal data for editing
  // Percentage of the *savings budget* already allocated to *other* goals
  totalAllocatedPercentage: number;
  // The actual monetary value of the savings budget this month
  savingsBudgetAmount: number;
}

export function AddSavingGoalDialog({
    open,
    onOpenChange,
    onSaveGoal,
    existingGoal,
    totalAllocatedPercentage, // Percentage allocated to *other* goals
    savingsBudgetAmount // The actual amount available in savings this month
}: AddSavingGoalDialogProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingGoal ? {
        name: existingGoal.name,
        targetAmount: existingGoal.targetAmount,
        percentageAllocation: existingGoal.percentageAllocation,
        targetDate: existingGoal.targetDate,
        description: existingGoal.description,
        icon: existingGoal.icon,
    } : {
      name: "",
      targetAmount: 0,
      percentageAllocation: undefined,
      targetDate: null,
      description: "",
      icon: "",
    },
  });

   // Reset form when dialog opens/closes or existingGoal changes
   React.useEffect(() => {
        form.reset(existingGoal ? {
            name: existingGoal.name,
            targetAmount: existingGoal.targetAmount,
            percentageAllocation: existingGoal.percentageAllocation,
            targetDate: existingGoal.targetDate,
            description: existingGoal.description,
            icon: existingGoal.icon,
        } : {
            name: "",
            targetAmount: 0,
            percentageAllocation: undefined,
            targetDate: null,
            description: "",
            icon: "",
        });
    }, [open, existingGoal, form]);

  const { watch, setValue, setError } = form;
  const currentPercentage = watch('percentageAllocation') ?? 0;

  // Calculate available allocation percentage WITHIN the savings budget
  const maxAllowedPercentage = React.useMemo(() => {
      // `totalAllocatedPercentage` is the percentage allocated to *other* goals
      return Math.max(0, parseFloat((100 - totalAllocatedPercentage).toFixed(1)));
  }, [totalAllocatedPercentage]);


  // Calculate the monetary amount this goal would receive based on its percentage and the total savings budget amount
  const calculatedMonthlyContribution = React.useMemo(() => {
      if (savingsBudgetAmount > 0 && currentPercentage > 0) {
          return (currentPercentage / 100) * savingsBudgetAmount;
      }
      return 0;
  }, [currentPercentage, savingsBudgetAmount]);


  const onSubmit = (values: GoalFormValues) => {
     // Double-check allocation percentage against available within savings budget
     if (values.percentageAllocation && values.percentageAllocation > maxAllowedPercentage) {
         setError("percentageAllocation", { message: `Allocation exceeds 100% of savings budget. Max available: ${maxAllowedPercentage.toFixed(1)}%` });
         return;
     }

    const dataToSave: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string } = {
        ...values,
        percentageAllocation: values.percentageAllocation, // Already validated > 0 by schema refine
    };
     if (existingGoal) {
      dataToSave.id = existingGoal.id;
    }
    onSaveGoal(dataToSave);
    // form.reset(); // Reset happens on open now
    onOpenChange(false); // Close dialog
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingGoal ? "Edit Saving Goal" : "Add Saving Goal"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? "Update the details for your saving goal." : "Set a target and allocate a portion of your monthly savings budget towards it."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="saving-goal-form" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
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
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1000.00" {...field} step="0.01" min="0.01"/>
                  </FormControl>
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
                        placeholder={`Max ${maxAllowedPercentage.toFixed(1)}% available`}
                        {...field}
                        value={field.value ?? ''} // Handle undefined for input value
                        onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        step="0.1"
                        max={maxAllowedPercentage}
                        min="0.1" // Minimum allocation
                        disabled={savingsBudgetAmount <= 0}
                    />
                    </FormControl>
                    {savingsBudgetAmount > 0 && (
                        <FormDescription>
                           Allocate {field.value ?? 0}% of your monthly savings ({formatCurrency(savingsBudgetAmount)}) towards this goal.
                           <br/> Approx. {formatCurrency(calculatedMonthlyContribution)} per month.
                           <br/> Available to allocate: {maxAllowedPercentage.toFixed(1)}%
                        </FormDescription>
                    )}
                    {savingsBudgetAmount <= 0 && (
                        <FormDescription className="text-destructive">
                            Your monthly Savings budget is currently $0. Increase it on the Budgets tab to enable allocation here.
                        </FormDescription>
                    )}
                    <FormMessage />
                </FormItem>
                )}
            />


            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Target Date (Optional)</FormLabel>
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
                        selected={field.value ?? undefined} // Pass undefined if null
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
                      <Textarea placeholder="Add a note about this goal..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                {/* Icon Selector Placeholder - Implement later if needed */}
                {/* <FormField control={form.control} name="icon" render={...} /> */}

          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
           {/* Disable save if savings budget is zero? */}
          <Button type="submit" form="saving-goal-form" disabled={savingsBudgetAmount <= 0}>
             {existingGoal ? "Save Changes" : "Add Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

