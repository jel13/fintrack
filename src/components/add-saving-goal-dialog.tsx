

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Info } from "lucide-react"; // Added Info
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea


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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert


const formSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(50, "Name max 50 chars"),
  targetAmount: z.coerce.number({invalid_type_error: "Target must be a number", required_error: "Target amount is required"})
    .positive("Target amount must be positive"),
  // Percentage of the *monthly savings budget* to allocate
  percentageAllocation: z.coerce.number({ invalid_type_error: "Percentage must be a number", required_error: "Allocation percentage is required" })
    .gte(0.1, "Allocation must be at least 0.1%") // Minimum allocation
    .lte(100, "Allocation cannot exceed 100%")
    .multipleOf(0.1, { message: "Allocation can have max 1 decimal place" }), // Allow one decimal place
  targetDate: z.date().optional().nullable(),
  description: z.string().max(100, "Description max 100 chars").optional(),
  icon: z.string().optional(), // Assuming icon name string
});
// Removed refine, validation now happens in onSubmit based on available percentage

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
        targetDate: existingGoal.targetDate ? new Date(existingGoal.targetDate) : null, // Ensure Date object
        description: existingGoal.description,
        icon: existingGoal.icon,
    } : {
      name: "",
      targetAmount: undefined, // Use undefined for number coercion
      percentageAllocation: undefined, // Use undefined for number coercion
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
            targetDate: existingGoal.targetDate ? new Date(existingGoal.targetDate) : null,
            description: existingGoal.description,
            icon: existingGoal.icon,
        } : {
            name: "",
            targetAmount: undefined,
            percentageAllocation: undefined,
            targetDate: null,
            description: "",
            icon: "",
        });
    }, [open, existingGoal, form]);

  const { watch, setError } = form;
  const currentPercentage = watch('percentageAllocation'); // Watch returns number or undefined

  // Calculate available allocation percentage WITHIN the savings budget
  const maxAllowedPercentage = React.useMemo(() => {
      // `totalAllocatedPercentage` is the percentage allocated to *other* goals
      return Math.max(0, parseFloat((100 - totalAllocatedPercentage).toFixed(1)));
  }, [totalAllocatedPercentage]);


  // Calculate the monetary amount this goal would receive based on its percentage and the total savings budget amount
  const calculatedMonthlyContribution = React.useMemo(() => {
      if (savingsBudgetAmount > 0 && currentPercentage && currentPercentage > 0) {
          return (currentPercentage / 100) * savingsBudgetAmount;
      }
      return 0;
  }, [currentPercentage, savingsBudgetAmount]);


  const onSubmit = (values: GoalFormValues) => {
     // Double-check allocation percentage against available within savings budget
     // Ensure currentPercentage is treated as 0 if undefined
     const percentageToValidate = values.percentageAllocation ?? 0;
     if (percentageToValidate > maxAllowedPercentage) {
         setError("percentageAllocation", { message: `Allocation exceeds 100% of savings budget (${formatCurrency(savingsBudgetAmount)}). Max available: ${maxAllowedPercentage.toFixed(1)}%` });
         return;
     }

    const dataToSave: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string } = {
        ...values,
        percentageAllocation: percentageToValidate, // Use validated percentage
        targetDate: values.targetDate, // Already Date or null
    };
     if (existingGoal) {
      dataToSave.id = existingGoal.id;
    }
    onSaveGoal(dataToSave);
    onOpenChange(false); // Close dialog
  };

  const isAllocationDisabled = savingsBudgetAmount <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{existingGoal ? "Edit Saving Goal" : "Add Saving Goal"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? "Update the details for your saving goal." : "Set a target and allocate a portion of your monthly savings budget towards it."}
          </DialogDescription>
        </DialogHeader>
        {isAllocationDisabled && (
             <Alert variant="destructive" className="mt-2">
                 <Info className="h-4 w-4" />
                 <AlertTitle>Savings Budget is $0</AlertTitle>
                 <AlertDescription className="text-xs">
                    You cannot allocate funds to goals until your monthly Savings Budget is positive. Reduce expense budgets on the Budgets tab to increase available savings.
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
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount ($)</FormLabel>
                    <FormControl>
                       <Input
                        type="number"
                        placeholder="1000.00"
                        {...field}
                        // Handle undefined for input value consistency
                        value={field.value === undefined ? '' : field.value}
                         onChange={e => {
                            const val = e.target.value;
                            // Allow empty string or parse as number
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
                  name="percentageAllocation"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Allocation (% of Monthly Savings)</FormLabel>
                      <FormControl>
                      <Input
                          type="number"
                          placeholder={isAllocationDisabled ? "Savings budget is $0" : `Max ${maxAllowedPercentage.toFixed(1)}% available`}
                          {...field}
                          // Handle undefined for input value consistency
                          value={field.value === undefined ? '' : field.value}
                          onChange={e => {
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                          step="0.1"
                          max={maxAllowedPercentage}
                          min="0.1" // Minimum allocation
                          disabled={isAllocationDisabled} // Disable if savings budget is zero
                      />
                      </FormControl>
                      {!isAllocationDisabled && (
                          <FormDescription className="text-xs">
                             Allocate {field.value ?? 0}% of your monthly savings ({formatCurrency(savingsBudgetAmount)}) towards this goal.
                             <br/> Approx. {formatCurrency(calculatedMonthlyContribution)} per month.
                             <br/> Available to allocate: {maxAllowedPercentage.toFixed(1)}%
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
                          onSelect={(date) => field.onChange(date ?? null)} // Ensure null is passed if cleared
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
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
                           placeholder="Add a note about this goal (e.g., Trip to Japan, Down payment)"
                           {...field}
                           rows={2} // Make textarea smaller
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  {/* Icon Selector Placeholder - Implement later if needed */}
                  {/* <FormField control={form.control} name="icon" render={...} /> */}

            </form>
          </Form>
         </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
           {/* Disable save if allocation is disabled */}
          <Button type="submit" form="saving-goal-form" disabled={isAllocationDisabled}>
             {existingGoal ? "Save Changes" : "Add Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

```

