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
import { Switch } from "@/components/ui/switch";
import type { SavingGoal } from "@/types";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils"; // Assuming formatCurrency is here


const formSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(50, "Name max 50 chars"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  percentageAllocation: z.coerce.number().gte(0, "Percentage must be >= 0").lte(100, "Percentage must be <= 100").optional(),
  targetDate: z.date().optional().nullable(),
  description: z.string().max(100, "Description max 100 chars").optional(),
  icon: z.string().optional(), // Assuming icon name string
  allocatePercentage: z.boolean().default(false), // To control percentage input visibility
});

type GoalFormValues = z.infer<typeof formSchema>;

interface AddSavingGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGoal: (goal: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string }) => void; // id is optional for create
  existingGoal: SavingGoal | null; // Pass goal data for editing
  totalAllocatedPercentage: number;
  savingsBudget: number;
}

export function AddSavingGoalDialog({ open, onOpenChange, onSaveGoal, existingGoal, totalAllocatedPercentage, savingsBudget }: AddSavingGoalDialogProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingGoal ? {
        name: existingGoal.name,
        targetAmount: existingGoal.targetAmount,
        percentageAllocation: existingGoal.percentageAllocation,
        targetDate: existingGoal.targetDate,
        description: existingGoal.description,
        icon: existingGoal.icon,
        allocatePercentage: !!existingGoal.percentageAllocation, // Set switch based on existing data
    } : {
      name: "",
      targetAmount: 0,
      percentageAllocation: undefined,
      targetDate: null,
      description: "",
      icon: "",
      allocatePercentage: false,
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
            allocatePercentage: !!existingGoal.percentageAllocation,
        } : {
            name: "",
            targetAmount: 0,
            percentageAllocation: undefined,
            targetDate: null,
            description: "",
            icon: "",
            allocatePercentage: false,
        });
    }, [open, existingGoal, form]);

  const { watch, setValue } = form;
  const allocatePercentage = watch('allocatePercentage');
  const currentPercentage = watch('percentageAllocation') ?? 0;
  const currentAllocatedWithoutThis = existingGoal
      ? totalAllocatedPercentage - (existingGoal.percentageAllocation ?? 0)
      : totalAllocatedPercentage;
  const maxAllowedPercentage = Math.max(0, 100 - currentAllocatedWithoutThis);

  // Clear percentage if switch is off
  React.useEffect(() => {
      if (!allocatePercentage) {
          setValue('percentageAllocation', undefined);
      } else if (allocatePercentage && form.getValues('percentageAllocation') === undefined) {
          // Optionally set a default when switched on, e.g., 0
          // setValue('percentageAllocation', 0);
      }
  }, [allocatePercentage, setValue, form]);

  const onSubmit = (values: GoalFormValues) => {
    // Ensure percentage is undefined if switch is off
    const dataToSave: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string } = {
        ...values,
        percentageAllocation: values.allocatePercentage ? values.percentageAllocation : undefined,
    };
     if (existingGoal) {
      dataToSave.id = existingGoal.id;
    }
    onSaveGoal(dataToSave);
    onOpenChange(false); // Close dialog
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingGoal ? "Edit Saving Goal" : "Add Saving Goal"}</DialogTitle>
          <DialogDescription>
            {existingGoal ? "Update the details for your saving goal." : "Set up a new goal to save towards."}
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
                    <Input type="number" placeholder="1000.00" {...field} step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allocatePercentage"
              render={({ field }) => (
                 <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Allocate from Savings Budget?</FormLabel>
                       <FormDescription>
                         {field.value ? "Set % of savings budget" : "Allocate manually"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={savingsBudget <= 0}
                      />
                    </FormControl>
                </FormItem>
              )}
              />

             {allocatePercentage && (
                 <FormField
                  control={form.control}
                  name="percentageAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage of Savings Budget (%)</FormLabel>
                      <FormControl>
                        {/* Use spread, but ensure value is handled correctly for undefined */}
                        <Input
                          type="number"
                          placeholder={`Max ${maxAllowedPercentage.toFixed(1)}% available`}
                          {...field}
                          value={field.value ?? ''} // Handle undefined for input value
                          step="0.1"
                          max={maxAllowedPercentage}
                          min={0}
                          disabled={savingsBudget <= 0}
                        />
                      </FormControl>
                       {savingsBudget > 0 && field.value !== undefined && (
                           <FormDescription>
                           Approx. {formatCurrency((field.value / 100) * savingsBudget)} per month.
                           </FormDescription>
                       )}
                       {savingsBudget <= 0 && (
                           <FormDescription className="text-destructive">
                                Savings budget is 0. Set a Savings budget first.
                           </FormDescription>
                       )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
             )}


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
          <Button type="submit" form="saving-goal-form">{existingGoal ? "Save Changes" : "Add Goal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
