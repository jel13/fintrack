

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, PiggyBank, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { AppData, SavingGoal } from "@/types";
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage"; // Import default
import { formatCurrency } from "@/lib/utils"; // Assuming utils has formatCurrency
import { AddSavingGoalDialog } from "@/components/add-saving-goal-dialog";
import { format } from 'date-fns'; // Import format
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


export default function SavingGoalsPage() {
    const [appData, setAppData] = React.useState<AppData>(defaultAppData);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<SavingGoal | null>(null);
    const { toast } = useToast();

     // Load data from localStorage on mount (client-side only)
    React.useEffect(() => {
        const loadedData = loadAppData();
        setAppData(loadedData);
        setIsLoaded(true);
    }, []);

    // Persist data whenever appData changes *after* initial load
    React.useEffect(() => {
        if (isLoaded) {
            saveAppData(appData);
        }
    }, [appData, isLoaded]);

    // Calculate the current month's savings budget LIMIT
    const totalSavingsBudgetLimit = React.useMemo(() => {
        if (!isLoaded) return 0; // Don't calculate until loaded
        const currentMonth = format(new Date(), 'yyyy-MM');
        const savingsBudget = appData.budgets.find(b => b.category === 'savings' && b.month === currentMonth);
        return savingsBudget?.limit ?? 0; // Get the calculated limit for savings
    }, [appData.budgets, isLoaded]); // Depend on isLoaded

    // Calculate the total percentage of the *savings budget* allocated to goals
     const totalAllocatedPercentageOfSavings = React.useMemo(() => {
         if (!isLoaded) return 0; // Don't calculate until loaded
         return appData.savingGoals.reduce((sum, goal) => sum + (goal.percentageAllocation ?? 0), 0);
     }, [appData.savingGoals, isLoaded]); // Depend on isLoaded


    const handleAddOrUpdateGoal = (goalData: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string }) => {
        // Validation before updating state
        const newPercentage = goalData.percentageAllocation ?? 0;
        const currentTotalAllocated = appData.savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0);
        const existingPercentage = editingGoal ? (editingGoal.percentageAllocation ?? 0) : 0;
        const totalWithoutCurrent = currentTotalAllocated - existingPercentage;

        // Prevent negative percentage
        if (newPercentage < 0) {
            toast({ title: "Invalid Percentage", description: `Percentage cannot be negative.`, variant: "destructive" });
            return; // Don't update state
        }

        // Prevent total allocation exceeding 100% of the savings budget
        if (totalWithoutCurrent + newPercentage > 100) {
            const maxAllowed = Math.max(0, 100 - totalWithoutCurrent);
            toast({
                title: "Allocation Limit Exceeded",
                description: `Cannot allocate ${newPercentage}%. Total allocation would exceed 100% of savings budget. Available: ${maxAllowed.toFixed(1)}%`,
                variant: "destructive",
                duration: 5000
            });
            // Optionally automatically adjust to max allowed, or just prevent save
            // goalData.percentageAllocation = maxAllowed; // Auto-adjust approach
             return; // Prevent save approach
        }

        // If validation passes, update the state
        setAppData(prev => {
            let goals = [...prev.savingGoals];

            if (goalData.id) {
                // Update existing goal
                const index = goals.findIndex(g => g.id === goalData.id);
                if (index > -1) {
                    // Ensure savedAmount is preserved unless explicitly modified
                    const originalSavedAmount = goals[index].savedAmount;
                    goals[index] = { ...goals[index], ...goalData, savedAmount: originalSavedAmount };
                    toast({ title: "Goal Updated", description: `Saving goal "${goalData.name}" updated.` });
                }
            } else {
                // Add new goal
                const newGoal: SavingGoal = {
                    ...goalData,
                    id: `goal-${Date.now().toString()}`,
                    savedAmount: 0, // Initialize saved amount for new goals
                };
                goals.push(newGoal);
                 toast({ title: "Goal Added", description: `New saving goal "${newGoal.name}" added.` });
            }
             // Sort goals, e.g., by name, for consistent order
            goals.sort((a, b) => a.name.localeCompare(b.name));
            return { ...prev, savingGoals: goals };
        });
        setEditingGoal(null); // Reset editing state
    };

    const handleDeleteGoal = (goalId: string) => {
        const goalToDelete = appData.savingGoals.find(g => g.id === goalId);
         if (!goalToDelete) return; // Should not happen

        // Add check: Prevent deletion if goal has saved amount? (Optional business rule)
        // if (goalToDelete.savedAmount > 0) {
        //     toast({ title: "Cannot Delete", description: `Goal "${goalToDelete.name}" has funds saved. Consider reallocating first.`, variant: "destructive"});
        //     return;
        // }

        setAppData(prev => ({
            ...prev,
            savingGoals: prev.savingGoals.filter(g => g.id !== goalId)
        }));
         toast({ title: "Goal Deleted", description: `Saving goal "${goalToDelete.name}" removed.` });
    };

    const openEditDialog = (goal: SavingGoal) => {
        setEditingGoal(goal);
        setIsAddGoalDialogOpen(true);
    }


    return (
        <div className="flex flex-col h-screen p-4 bg-background">
            {/* Header */}
            <div className="flex items-center mb-4">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" aria-label="Back to Home">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Manage Saving Goals</h1>
                 <Button size="sm" className="ml-auto" onClick={() => { setEditingGoal(null); setIsAddGoalDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                </Button>
            </div>

            {/* Savings Budget Info */}
             <Card className="mb-4 bg-accent/10 border-accent">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Info className="h-5 w-5 text-accent" /> Monthly Savings Allocation
                    </CardTitle>
                    <CardDescription className="text-xs">
                         This is the amount leftover from your income after allocating to expense budgets. You can allocate percentages of this amount to specific goals below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-sm text-accent flex flex-col gap-1">
                     {isLoaded ? (
                        <>
                        <div className="flex justify-between">
                            <span>Total Savings Budget This Month:</span>
                            <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Allocated to Goals (% of Savings):</span>
                            <span className="font-semibold">{totalAllocatedPercentageOfSavings.toFixed(1)}%</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Allocated to Goals ($):</span>
                             {/* Calculate the monetary value allocated based on the *current* savings budget limit */}
                            <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit * (totalAllocatedPercentageOfSavings / 100))}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Unallocated Savings ($):</span>
                             {/* Calculate unallocated portion */}
                            <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit * (1 - totalAllocatedPercentageOfSavings / 100))}</span>
                        </div>
                        {totalAllocatedPercentageOfSavings > 100 && <p className="text-xs text-destructive font-semibold mt-1">Warning: Total goal allocation exceeds 100% of savings budget!</p>}
                        {totalSavingsBudgetLimit <= 0 && <p className="text-xs text-accent/80 mt-1">Your current savings budget is $0. Reduce expense budgets on the Budgets tab to increase savings.</p>}
                        </>
                     ) : (
                         <p>Loading budget info...</p>
                     )}

                </CardContent>
            </Card>


            {/* Goals List */}
            <ScrollArea className="flex-grow">
                {!isLoaded ? (
                     <p className="text-center text-muted-foreground pt-10">Loading goals...</p>
                ) : (
                    <div className="space-y-3">
                        {appData.savingGoals.length > 0 ? (
                            appData.savingGoals.map(goal => {
                                 const progressValue = (goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) : 0) * 100;
                                 // Calculate expected monthly contribution based on current savings budget limit
                                 const monthlyContribution = (goal.percentageAllocation ?? 0) / 100 * totalSavingsBudgetLimit;
                                 return (
                                    <Card key={goal.id} className="relative group/goal">
                                        <CardHeader className="flex flex-row items-start justify-between pb-2 pr-12"> {/* Added padding-right */}
                                            <div>
                                                <CardTitle className="text-base">{goal.name}</CardTitle>
                                                {goal.description && <CardDescription className="text-xs mt-1">{goal.description}</CardDescription>}
                                            </div>
                                            {/* Edit/Delete Buttons - Absolutely positioned */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/goal:opacity-100 focus-within:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(goal)} aria-label={`Edit ${goal.name}`}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${goal.name}`}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the "{goal.name}" saving goal.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteGoal(goal.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Delete Goal
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                                                <span>Progress ({progressValue.toFixed(1)}%)</span>
                                                <span>{formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                            </div>
                                            <Progress value={progressValue} className="h-2 [&>*]:bg-accent" />
                                            {goal.percentageAllocation !== undefined && goal.percentageAllocation > 0 && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Allocation: {goal.percentageAllocation}% of Savings
                                                    {totalSavingsBudgetLimit > 0 && ` (Est. ${formatCurrency(monthlyContribution)}/mo)`}
                                                </p>
                                            )}
                                             {goal.targetDate && (
                                                 <p className="text-xs text-muted-foreground mt-1">Target Date: {format(goal.targetDate, 'MMM yyyy')}</p>
                                             )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                             <div className="text-center text-muted-foreground py-10">
                                 <PiggyBank className="mx-auto h-12 w-12 mb-2" />
                                <p>You haven't set any saving goals yet.</p>
                                <p>Click "Add Goal" to start planning where your savings will go!</p>
                             </div>
                        )}
                    </div>
                 )}
            </ScrollArea>

            {/* Add/Edit Dialog */}
            <AddSavingGoalDialog
                open={isAddGoalDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsAddGoalDialogOpen(isOpen);
                    if (!isOpen) setEditingGoal(null); // Reset editing state when closing
                }}
                onSaveGoal={handleAddOrUpdateGoal}
                existingGoal={editingGoal}
                // Pass the percentage of the savings budget already allocated to *other* goals
                totalAllocatedPercentage={editingGoal
                    ? totalAllocatedPercentageOfSavings - (editingGoal.percentageAllocation ?? 0)
                    : totalAllocatedPercentageOfSavings
                }
                 // Pass the actual monetary value of the savings budget this month
                savingsBudgetAmount={totalSavingsBudgetLimit}
            />
        </div>
    );
}

