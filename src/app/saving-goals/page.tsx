"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, PiggyBank, Info, Target } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { AppData, SavingGoal } from "@/types";
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage";
import { formatCurrency, cn } from "@/lib/utils";
import { AddSavingGoalDialog } from "@/components/add-saving-goal-dialog";
import { format } from 'date-fns';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function SavingGoalsPage() {
    const [appData, setAppData] = React.useState<AppData>(defaultAppData);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<SavingGoal | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const loadedData = loadAppData();
        setAppData(loadedData);
        setIsLoaded(true);
    }, []);

    React.useEffect(() => {
        if (isLoaded) {
            saveAppData(appData);
        }
    }, [appData, isLoaded]);

    const totalSavingsBudgetLimit = React.useMemo(() => {
        if (!isLoaded) return 0;
        const currentMonth = format(new Date(), 'yyyy-MM');
        const savingsBudget = appData.budgets.find(b => b.category === 'savings' && b.month === currentMonth);
        return savingsBudget?.limit ?? 0;
    }, [appData.budgets, isLoaded]);

     const totalAllocatedPercentageOfSavings = React.useMemo(() => {
         if (!isLoaded) return 0;
         return appData.savingGoals.reduce((sum, goal) => sum + (goal.percentageAllocation ?? 0), 0);
     }, [appData.savingGoals, isLoaded]);


    const handleAddOrUpdateGoal = (goalData: Omit<SavingGoal, 'id' | 'savedAmount'> & { id?: string }) => {
        const newPercentage = goalData.percentageAllocation ?? 0;
        const currentTotalAllocated = appData.savingGoals.reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0);
        const existingPercentage = editingGoal ? (editingGoal.percentageAllocation ?? 0) : 0;
        const totalWithoutCurrent = currentTotalAllocated - existingPercentage;

        if (newPercentage < 0) {
            setTimeout(() => toast({ title: "Invalid Percentage", description: `Percentage cannot be negative.`, variant: "destructive" }), 0);
            return;
        }

        if (totalWithoutCurrent + newPercentage > 100.05) {
            const maxAllowed = Math.max(0, parseFloat((100 - totalWithoutCurrent).toFixed(1)));
            setTimeout(() => toast({
                title: "Allocation Limit Exceeded",
                description: `Cannot allocate ${newPercentage}%. Total allocation would exceed 100% of savings budget. Available: ${maxAllowed}%`,
                variant: "destructive",
                duration: 5000
            }), 0);
             return;
        }

        setAppData(prev => {
            let goals = [...prev.savingGoals];
            let toastMessageTitle = "";
            let toastMessageDescription = "";

            if (goalData.id) {
                const index = goals.findIndex(g => g.id === goalData.id);
                if (index > -1) {
                    const originalSavedAmount = goals[index].savedAmount;
                    goals[index] = { ...goals[index], ...goalData, savedAmount: originalSavedAmount };
                    toastMessageTitle = "Goal Updated";
                    toastMessageDescription = `Saving goal "${goalData.name}" updated.`;
                }
            } else {
                const newGoal: SavingGoal = {
                    ...goalData,
                    id: `goal-${Date.now().toString()}`,
                    savedAmount: 0,
                };
                goals.push(newGoal);
                toastMessageTitle = "Goal Added";
                toastMessageDescription = `New saving goal "${newGoal.name}" added.`;
            }
            goals.sort((a, b) => a.name.localeCompare(b.name));
            
            if (toastMessageTitle) {
                setTimeout(() => toast({ title: toastMessageTitle, description: toastMessageDescription }), 0);
            }
            return { ...prev, savingGoals: goals };
        });
        setEditingGoal(null);
    };

    const handleDeleteGoal = (goalId: string) => {
        const goalToDelete = appData.savingGoals.find(g => g.id === goalId);
         if (!goalToDelete) return;

        setAppData(prev => ({
            ...prev,
            savingGoals: prev.savingGoals.filter(g => g.id !== goalId)
        }));
        setTimeout(() => toast({ title: "Goal Deleted", description: `Saving goal "${goalToDelete.name}" removed.` }), 0);
    };

    const openEditDialog = (goal: SavingGoal) => {
        setEditingGoal(goal);
        setIsAddGoalDialogOpen(true);
    }


    return (
        <div className="flex flex-col h-screen bg-background">
             <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
                <Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Back to Home">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-semibold ml-2">Manage Saving Goals</h1>
                 <Button size="sm" className="ml-auto" onClick={() => { setEditingGoal(null); setIsAddGoalDialogOpen(true); }} disabled={!isLoaded || totalSavingsBudgetLimit <= 0}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                </Button>
            </div>

             <div className="p-4">
                <Card className="mb-4 bg-accent/10 border-accent animate-fade-in">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Info className="h-5 w-5 text-accent" /> Monthly Savings Allocation
                        </CardTitle>
                        <CardDescription className="text-xs">
                             Amount leftover from income after expense budgets. Allocate percentages to specific goals below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-accent grid grid-cols-2 gap-x-4 gap-y-1">
                         {isLoaded ? (
                            <>
                            <div className="flex justify-between col-span-2 border-b pb-1 mb-1 border-accent/20">
                                <span>Total Savings Budget:</span>
                                <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Allocated to Goals (%):</span>
                                <span className="font-semibold">{totalAllocatedPercentageOfSavings.toFixed(1)}%</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Allocated to Goals ($):</span>
                                <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit * (totalAllocatedPercentageOfSavings / 100))}</span>
                            </div>
                             <div className="flex justify-between text-accent/80">
                                <span>Unallocated (%):</span>
                                <span className="font-semibold">{(100 - totalAllocatedPercentageOfSavings).toFixed(1)}%</span>
                            </div>
                             <div className="flex justify-between text-accent/80">
                                <span>Unallocated ($):</span>
                                <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit * (1 - totalAllocatedPercentageOfSavings / 100))}</span>
                            </div>
                            {totalAllocatedPercentageOfSavings > 100.05 && <p className="text-xs text-destructive font-semibold mt-1 col-span-2">Warning: Total goal allocation exceeds 100% of savings budget!</p>}
                            {totalSavingsBudgetLimit <= 0 && (
                                <Alert variant="default" className="col-span-2 mt-2 p-2 bg-accent/10 border-accent/30">
                                     <PiggyBank className="h-4 w-4 text-accent/80" />
                                     <AlertDescription className="text-xs text-accent/80">
                                        Your current savings budget is $0. Reduce expense budgets on the Budgets tab to increase available savings for goals.
                                     </AlertDescription>
                                </Alert>
                             )}
                            </>
                         ) : (
                             <div className="col-span-2 space-y-1 py-2">
                                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                                <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                             </div>
                         )}

                    </CardContent>
                </Card>
            </div>

            <ScrollArea className="flex-grow px-4 pb-4">
                {!isLoaded ? (
                     <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                             <Card key={`skel-goal-${i}`} className="p-4 space-y-2 animate-pulse">
                                <div className="flex justify-between">
                                    <div className="h-5 bg-muted rounded w-1/3"></div>
                                    <div className="h-4 bg-muted rounded w-1/4"></div>
                                </div>
                                 <div className="h-2 bg-muted rounded w-full"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
                             </Card>
                         ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {appData.savingGoals.length > 0 ? (
                            appData.savingGoals.map((goal, index) => {
                                 const progressValue = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
                                 const monthlyContribution = (goal.percentageAllocation ?? 0) / 100 * totalSavingsBudgetLimit;
                                 return (
                                    <div key={goal.id} className="animate-slide-up" style={{"animationDelay": `${index * 0.05}s`}}>
                                        <Card className="relative group/goal overflow-hidden transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-accent/10 transition-all duration-500 ease-out"
                                                style={{ width: `${progressValue}%` }}
                                             />
                                            <div className="relative z-10">
                                                <CardHeader className="flex flex-row items-start justify-between pb-2 pr-12">
                                                    <div>
                                                        <CardTitle className="text-base">{goal.name}</CardTitle>
                                                        {goal.description && <CardDescription className="text-xs mt-1">{goal.description}</CardDescription>}
                                                    </div>
                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/goal:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(goal)} aria-label={`Edit ${goal.name}`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog onOpenChange={(open) => !open && (document.activeElement as HTMLElement)?.blur()}>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => e.stopPropagation()} aria-label={`Delete ${goal.name}`}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the "{goal.name}" saving goal and its progress.
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
                                                <CardContent className="pt-0">
                                                    <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                                                        <span>{formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                                        <span>{progressValue.toFixed(1)}%</span>
                                                    </div>
                                                    <Progress value={progressValue} className="h-1.5 [&>div]:bg-accent" />
                                                    {goal.percentageAllocation !== undefined && goal.percentageAllocation > 0 && (
                                                        <p className="text-xs text-muted-foreground mt-1.5">
                                                            Alloc: {goal.percentageAllocation}% of Savings
                                                            {totalSavingsBudgetLimit > 0 && ` (~${formatCurrency(monthlyContribution)}/mo)`}
                                                            {totalSavingsBudgetLimit <= 0 && ` ($0/mo)`}
                                                        </p>
                                                    )}
                                                     {goal.targetDate && (
                                                         <p className="text-xs text-muted-foreground mt-0.5">Target: {format(goal.targetDate, 'MMM yyyy')}</p>
                                                     )}
                                                </CardContent>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })
                        ) : (
                             <Card className="border-dashed border-muted-foreground animate-fade-in bg-secondary/30">
                                <CardContent className="text-center text-muted-foreground py-10">
                                    <Target className="mx-auto h-10 w-10 mb-2 text-accent" />
                                    <p className="font-semibold">No Saving Goals Yet</p>
                                    <p className="text-sm mb-3">Click "Add Goal" to start planning where your savings will go!</p>
                                    <Button size="sm" onClick={() => setIsAddGoalDialogOpen(true)} disabled={totalSavingsBudgetLimit <= 0}>
                                        <span className="flex items-center justify-center">Add New Goal</span>
                                    </Button>
                                     {totalSavingsBudgetLimit <= 0 && <p className="text-xs text-destructive mt-2">Enable Add Goal by increasing your Savings Budget.</p>}
                                </CardContent>
                             </Card>
                        )}
                    </div>
                 )}
            </ScrollArea>

            <AddSavingGoalDialog
                open={isAddGoalDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsAddGoalDialogOpen(isOpen);
                    if (!isOpen) setEditingGoal(null);
                }}
                onSaveGoal={handleAddOrUpdateGoal}
                existingGoal={editingGoal}
                totalAllocatedPercentage={editingGoal
                    ? totalAllocatedPercentageOfSavings - (editingGoal.percentageAllocation ?? 0)
                    : totalAllocatedPercentageOfSavings
                }
                savingsBudgetAmount={totalSavingsBudgetLimit}
            />
        </div>
    );
}
