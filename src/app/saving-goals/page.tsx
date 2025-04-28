"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { AppData, SavingGoal } from "@/types";
import { loadAppData, saveAppData } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils"; // Assuming utils has formatCurrency
import { AddSavingGoalDialog } from "@/components/add-saving-goal-dialog";
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
    const [appData, setAppData] = React.useState<AppData>(loadAppData());
    const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<SavingGoal | null>(null);
    const { toast } = useToast();

    // Persist data whenever appData changes
    React.useEffect(() => {
        saveAppData(appData);
    }, [appData]);

    const handleAddOrUpdateGoal = (goalData: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string }) => {
        setAppData(prev => {
            const goals = [...prev.savingGoals];
            if (goalData.id) {
                // Update existing goal
                const index = goals.findIndex(g => g.id === goalData.id);
                if (index > -1) {
                    goals[index] = { ...goals[index], ...goalData };
                    toast({ title: "Goal Updated", description: `Saving goal "${goalData.name}" updated.` });
                }
            } else {
                // Add new goal
                const newGoal: SavingGoal = {
                    ...goalData,
                    id: `goal-${Date.now().toString()}`,
                    savedAmount: 0, // Initialize saved amount
                };
                goals.push(newGoal);
                 toast({ title: "Goal Added", description: `New saving goal "${newGoal.name}" added.` });
            }
            return { ...prev, savingGoals: goals };
        });
        setEditingGoal(null); // Reset editing state
    };

    const handleDeleteGoal = (goalId: string) => {
        setAppData(prev => ({
            ...prev,
            savingGoals: prev.savingGoals.filter(g => g.id !== goalId)
        }));
         toast({ title: "Goal Deleted", description: `Saving goal removed.` });
    };

    const openEditDialog = (goal: SavingGoal) => {
        setEditingGoal(goal);
        setIsAddGoalDialogOpen(true);
    }

    const totalSavingsBudget = React.useMemo(() => {
        const currentMonth = format(new Date(), 'yyyy-MM');
        const savingsBudget = appData.budgets.find(b => b.category === 'savings' && b.month === currentMonth);
        return savingsBudget?.limit ?? 0;
    }, [appData.budgets]);

     const totalAllocatedPercentage = React.useMemo(() => {
         return appData.savingGoals.reduce((sum, goal) => sum + (goal.percentageAllocation ?? 0), 0);
     }, [appData.savingGoals]);


    return (
        <div className="flex flex-col h-screen p-4 bg-background">
            {/* Header */}
            <div className="flex items-center mb-4">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Manage Saving Goals</h1>
                 <Button size="sm" className="ml-auto" onClick={() => { setEditingGoal(null); setIsAddGoalDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                </Button>
            </div>

            {/* Savings Budget Info */}
             <Card className="mb-4 bg-primary/10 border-primary">
                <CardContent className="p-3 text-sm text-primary-foreground">
                    <p>Monthly Savings Budget: <span className="font-semibold">{formatCurrency(totalSavingsBudget)}</span></p>
                    <p>Total Goal Allocation: <span className="font-semibold">{totalAllocatedPercentage.toFixed(1)}%</span></p>
                     {totalAllocatedPercentage > 100 && <p className="text-xs text-destructive-foreground/80 font-semibold">Warning: Total allocation exceeds 100%!</p>}
                     {totalSavingsBudget <= 0 && <p className="text-xs text-primary-foreground/80">Set a 'Savings' budget on the Budgets tab to allocate funds.</p>}
                </CardContent>
            </Card>


            {/* Goals List */}
            <ScrollArea className="flex-grow">
                <div className="space-y-3">
                    {appData.savingGoals.length > 0 ? (
                        appData.savingGoals.map(goal => (
                            <Card key={goal.id} className="relative group/goal">
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-base">{goal.name}</CardTitle>
                                        {goal.description && <CardDescription className="text-xs">{goal.description}</CardDescription>}
                                    </div>
                                    {/* Edit/Delete Buttons */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/goal:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(goal)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive">
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
                                         <span>Progress</span>
                                         <span>{formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                     </div>
                                    <Progress value={(goal.savedAmount / goal.targetAmount) * 100} className="h-2 [&>*]:bg-accent" />
                                    {goal.percentageAllocation !== undefined && goal.percentageAllocation > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Allocated: {goal.percentageAllocation}% of Savings Budget
                                            {totalSavingsBudget > 0 && ` (~${formatCurrency((goal.percentageAllocation / 100) * totalSavingsBudget)}/mo)`}
                                        </p>
                                    )}
                                     {goal.targetDate && (
                                         <p className="text-xs text-muted-foreground mt-1">Target Date: {format(goal.targetDate, 'MMM yyyy')}</p>
                                     )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                         <div className="text-center text-muted-foreground py-10">
                             <PiggyBank className="mx-auto h-12 w-12 mb-2" />
                            <p>You haven't set any saving goals yet.</p>
                            <p>Click "Add Goal" to start planning!</p>
                         </div>
                    )}
                </div>
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
                totalAllocatedPercentage={totalAllocatedPercentage}
                savingsBudget={totalSavingsBudget}
            />
        </div>
    );
}
