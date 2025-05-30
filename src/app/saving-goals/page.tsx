
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, PiggyBank, Info, Target, MoreVertical, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppData, SavingGoal, SavingGoalCategory } from "@/types";
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
  AlertDialogTrigger, // Added missing import
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCategoryIconComponent } from '@/components/category-icon';

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
        if (!isLoaded || !appData.budgets) return 0;
        const currentMonth = format(new Date(), 'yyyy-MM');
        const savingsBudget = appData.budgets.find(b => b.category === 'savings' && b.month === currentMonth);
        return savingsBudget?.limit ?? 0;
    }, [appData.budgets, isLoaded]);

     const totalAllocatedPercentageOfSavings = React.useMemo(() => {
         if (!isLoaded || !appData.savingGoals) return 0;
         return appData.savingGoals.reduce((sum, goal) => sum + (goal.percentageAllocation ?? 0), 0);
     }, [appData.savingGoals, isLoaded]);

    const totalMonetaryAllocatedToGoals = React.useMemo(() => {
        return parseFloat((totalSavingsBudgetLimit * (totalAllocatedPercentageOfSavings / 100)).toFixed(2));
    }, [totalSavingsBudgetLimit, totalAllocatedPercentageOfSavings]);

    const unallocatedSavingsPercentage = React.useMemo(() => {
        // Use a small tolerance for floating point arithmetic
        const unallocated = 100 - totalAllocatedPercentageOfSavings;
        return Math.max(0, parseFloat(unallocated.toFixed(1)));
    }, [totalAllocatedPercentageOfSavings]);


    const unallocatedSavingsAmount = React.useMemo(() => {
        const unallocated = totalSavingsBudgetLimit - totalMonetaryAllocatedToGoals;
        return parseFloat(unallocated.toFixed(2));
    }, [totalSavingsBudgetLimit, totalMonetaryAllocatedToGoals]);


    const handleAddOrUpdateGoal = (goalData: Omit<SavingGoal, 'id'> & { id?: string }) => {
        const newPercentage = goalData.percentageAllocation ?? 0;

        const currentTotalAllocatedToOtherGoals = appData.savingGoals
            .filter(g => g.id !== goalData.id)
            .reduce((sum, g) => sum + (g.percentageAllocation ?? 0), 0);

        if (newPercentage < 0) {
            requestAnimationFrame(() => toast({ title: "Invalid Percentage", description: `Percentage cannot be negative.`, variant: "destructive" }));
            return;
        }
        
        // Add a small tolerance (e.g., 0.05) for floating point comparisons
        if (currentTotalAllocatedToOtherGoals + newPercentage > 100.05) { 
            const maxAllowedForThisGoal = Math.max(0, parseFloat((100 - currentTotalAllocatedToOtherGoals).toFixed(1)));
            requestAnimationFrame(() => toast({
                title: "Allocation Limit Exceeded",
                description: `Cannot allocate ${newPercentage}%. Total allocation would exceed 100% of savings budget. Max available for this goal: ${maxAllowedForThisGoal}%`,
                variant: "destructive",
                duration: 7000
            }));
             return;
        }

        setAppData(prev => {
            let goals = [...prev.savingGoals];
            let toastMessageTitle = "";
            let toastMessageDescription = "";

            if (goalData.id) { // Editing existing goal
                const index = goals.findIndex(g => g.id === goalData.id);
                if (index > -1) {
                    goals[index] = {
                        ...goals[index], 
                        ...goalData,     
                    };
                    toastMessageTitle = "Goal Updated";
                    toastMessageDescription = `Saving goal "${goalData.name}" updated.`;
                }
            } else { // Adding new goal
                const newGoal: SavingGoal = {
                    id: `goal-${Date.now().toString()}`, 
                    name: goalData.name,
                    goalCategoryId: goalData.goalCategoryId,
                    savedAmount: goalData.savedAmount ?? 0, 
                    percentageAllocation: goalData.percentageAllocation,
                    description: goalData.description,
                };
                goals.push(newGoal);
                toastMessageTitle = "Goal Added";
                toastMessageDescription = `New saving goal "${newGoal.name}" added.`;
            }
            goals.sort((a, b) => a.name.localeCompare(b.name));

            if (toastMessageTitle) {
                requestAnimationFrame(() => {
                    toast({ title: toastMessageTitle, description: toastMessageDescription });
                });
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
         requestAnimationFrame(() => {
            toast({ title: "Goal Deleted", description: `Saving goal "${goalToDelete.name}" removed.` });
        });
    };

    const openEditDialog = (goal: SavingGoal) => {
        setEditingGoal(goal);
        setIsAddGoalDialogOpen(true);
    }

    const getGoalCategoryById = (id: string): SavingGoalCategory | undefined => {
        return appData.savingGoalCategories.find(sgc => sgc.id === id);
    }


    return (
        <div className="flex flex-col flex-1 bg-background">
             <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10 shadow-sm">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" aria-label="Back to Home">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Saving Goals</h1>
                 <Button size="sm" className="ml-auto rounded-lg" onClick={() => { setEditingGoal(null); setIsAddGoalDialogOpen(true); }} disabled={!isLoaded || totalSavingsBudgetLimit <= 0}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                </Button>
            </div>

             <div className="p-4">
                <Card className="mb-4 bg-accent/10 border-accent shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Info className="h-5 w-5 text-accent" /> Monthly Savings Budget Allocation
                        </CardTitle>
                        <CardDescription className="text-xs">
                             This is the total amount from your main budget allocated to "Savings" this month. Allocate percentages of this amount to specific goals below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-accent grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                         {isLoaded ? (
                            <>
                            <div className="flex justify-between col-span-1 sm:col-span-2 border-b pb-1 mb-1 border-accent/20">
                                <span>Total Savings Budget (this month):</span>
                                <span className="font-semibold">{formatCurrency(totalSavingsBudgetLimit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Allocated to Goals (% of Savings):</span>
                                <span className="font-semibold">{totalAllocatedPercentageOfSavings.toFixed(1)}%</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Allocated to Goals (₱ this month):</span>
                                <span className="font-semibold">{formatCurrency(totalMonetaryAllocatedToGoals)}</span>
                            </div>
                             <div className="flex justify-between text-accent/80">
                                <span>Unallocated Savings (%):</span>
                                <span className="font-semibold">{unallocatedSavingsPercentage.toFixed(1)}%</span>
                            </div>
                             <div className="flex justify-between text-accent/80">
                                <span>Unallocated Savings (₱ this month):</span>
                                <span className="font-semibold">{formatCurrency(unallocatedSavingsAmount)}</span>
                            </div>
                            {totalAllocatedPercentageOfSavings > 100.05 && 
                                <p className="text-xs text-destructive font-semibold mt-1 col-span-1 sm:col-span-2 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3"/>Warning: Total goal allocation exceeds 100% of savings budget!
                                </p>
                            }
                            {totalSavingsBudgetLimit <= 0 && (
                                <Alert variant="default" className="col-span-1 sm:col-span-2 mt-2 p-2 bg-accent/10 border-accent/30">
                                     <PiggyBank className="h-4 w-4 text-accent/80" />
                                     <AlertDescription className="text-xs text-accent/80">
                                        Your current "Savings" budget (from the Budgets tab) is ₱0. To fund goals, increase your Savings allocation in the main Budgets section by reducing other expense budgets, or add more income.
                                     </AlertDescription>
                                </Alert>
                             )}
                            </>
                         ) : (
                             <div className="col-span-1 sm:col-span-2 space-y-1 py-2">
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
                                 <div className="h-3 bg-muted rounded w-1/2"></div>
                                 <div className="h-3 bg-muted rounded w-2/3"></div>
                             </Card>
                         ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {appData.savingGoals.length > 0 ? (
                            appData.savingGoals.map((goal, index) => {
                                 const goalCategory = getGoalCategoryById(goal.goalCategoryId);
                                 const CategoryIcon = getCategoryIconComponent(goalCategory?.icon ?? 'Landmark');
                                 const monthlyContribution = parseFloat(((goal.percentageAllocation ?? 0) / 100 * totalSavingsBudgetLimit).toFixed(2));
                                 return (
                                    <div key={goal.id} className="animate-slide-up" style={{"animationDelay": `${index * 0.05}s`}}>
                                        <Card className="relative group/goal overflow-hidden transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] rounded-lg shadow-md">
                                            <div className="relative z-10">
                                                <CardHeader className="flex flex-row items-start justify-between p-4 pb-2 pr-3">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <CategoryIcon className="h-6 w-6 text-accent flex-shrink-0"/>
                                                        <div className="min-w-0">
                                                            <CardTitle className="text-base truncate">{goal.name}</CardTitle>
                                                            <CardDescription className="text-xs mt-0.5">{goalCategory?.label ?? "General Goal"}</CardDescription>
                                                        </div>
                                                    </div>
                                                     <div className="flex-shrink-0">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover/goal:opacity-100 focus:opacity-100 transition-opacity rounded-full">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                    <span className="sr-only">Goal Actions</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openEditDialog(goal)}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Goal
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <AlertDialog onOpenChange={(open) => !open && (document.activeElement as HTMLElement)?.blur()}>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem
                                                                            onSelect={(event) => event.preventDefault()}
                                                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Goal
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This action cannot be undone. This will permanently delete the "{goal.name}" saving goal and its progress.
                                                                        </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                        <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteGoal(goal.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
                                                                            Delete Goal
                                                                        </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="px-4 pb-3 pt-2">
                                                    <div className="text-sm font-semibold mb-1">
                                                        Total Saved: {formatCurrency(goal.savedAmount)}
                                                    </div>
                                                    {goal.percentageAllocation !== undefined && goal.percentageAllocation > 0 && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Plan: {goal.percentageAllocation.toFixed(1)}% of monthly savings budget
                                                            (Est. {formatCurrency(monthlyContribution)}/mo this month)
                                                        </p>
                                                    )}
                                                    {goal.description && <p className="text-xs text-muted-foreground italic mt-1">"{goal.description}"</p>}
                                                </CardContent>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })
                        ) : (
                             <Card className="border-dashed border-muted-foreground bg-secondary/30 rounded-lg shadow-md">
                                <CardContent className="text-center text-muted-foreground py-10">
                                    <Target className="mx-auto h-10 w-10 mb-2 text-accent" />
                                    <p className="font-semibold">No Saving Goals Yet</p>
                                    <p className="text-sm mb-3">Click "Add Goal" to start planning where your savings will go!</p>
                                    <Button size="sm" onClick={() => {setEditingGoal(null); setIsAddGoalDialogOpen(true);}} disabled={totalSavingsBudgetLimit <= 0} className="rounded-lg">
                                        <span className="flex items-center justify-center">Add New Goal</span>
                                    </Button>
                                     {totalSavingsBudgetLimit <= 0 && <p className="text-xs text-destructive mt-2">Enable "Add Goal" by increasing your "Savings" allocation in the main Budgets tab.</p>}
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
                totalAllocatedPercentageToOtherGoals={editingGoal && typeof editingGoal.percentageAllocation === 'number' 
                    ? totalAllocatedPercentageOfSavings - (editingGoal.percentageAllocation)
                    : totalAllocatedPercentageOfSavings
                }
                savingsBudgetAmount={totalSavingsBudgetLimit}
                savingGoalCategories={appData.savingGoalCategories}
            />
        </div>
    );
}

