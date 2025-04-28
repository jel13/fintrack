

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppData, Category } from "@/types";
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage"; // Import default
import { getCategoryIconComponent } from '@/components/category-icon';
import { AddCategoryDialog } from "@/components/add-category-dialog";
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
import { cn } from "@/lib/utils";


export default function CategoriesPage() {
    const [appData, setAppData] = React.useState<AppData>(defaultAppData);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});
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

    const handleAddOrUpdateCategory = (categoryData: Omit<Category, 'id'> & { id?: string }) => {
        setAppData(prev => {
            let categories = [...prev.categories];
            let toastMessage = "";

            // Basic validation
            if (categoryData.parentId === categoryData.id) {
                toast({ title: "Invalid Parent", description: "A category cannot be its own parent.", variant: "destructive" });
                return prev; // Don't update state
             }
             if (categoryData.isIncomeSource && categoryData.parentId) {
                 toast({ title: "Invalid Parent", description: "Income source categories cannot have a parent.", variant: "destructive" });
                 return prev;
             }


            if (categoryData.id) {
                // Update existing category
                const index = categories.findIndex(c => c.id === categoryData.id);
                if (index > -1) {
                    const originalCategory = categories[index];
                    // Preserve non-editable flags
                    categoryData.isDefault = originalCategory.isDefault;
                    categoryData.isDeletable = originalCategory.isDeletable;
                    // isIncomeSource cannot be changed after creation (enforced in dialog)
                    categoryData.isIncomeSource = originalCategory.isIncomeSource;


                     // Prevent setting parentId to one of its own children (basic check for direct children)
                     if (categoryData.parentId && categories.some(c => c.parentId === categoryData.id && c.id === categoryData.parentId)) {
                         toast({ title: "Invalid Parent", description: "Cannot set parent to a direct child.", variant: "destructive" });
                         return prev;
                     }

                    categories[index] = { ...originalCategory, ...categoryData }; // Merge carefully
                    toastMessage = `Category "${categoryData.label}" updated.`;
                } else {
                    toast({ title: "Error", description: "Category not found for update.", variant: "destructive" });
                    return prev;
                }
            } else {
                // Add new category
                const newCategory: Category = {
                    ...categoryData,
                    id: `cat-${categoryData.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${Date.now()}`, // Simple ID generation
                    isDefault: false, // Custom categories are not default
                    isDeletable: true, // Custom categories are deletable
                     // isIncomeSource is set from categoryData
                };
                 // Ensure parent exists if parentId is set and is not an income source
                if (newCategory.parentId && !categories.some(c => c.id === newCategory.parentId && !c.isIncomeSource)) {
                    toast({ title: "Error", description: "Parent category not found or is an income source.", variant: "destructive" });
                    return prev; // Don't update state
                }
                categories.push(newCategory);
                 toastMessage = `New category "${newCategory.label}" added.`;
            }

            // Sort categories for consistent display (e.g., income first, then expense alphabetically)
            categories.sort((a, b) => {
                 if (a.isIncomeSource && !b.isIncomeSource) return -1;
                 if (!a.isIncomeSource && b.isIncomeSource) return 1;
                 return a.label.localeCompare(b.label);
             });


            toast({ title: categoryData.id ? "Category Updated" : "Category Added", description: toastMessage });
            return { ...prev, categories };
        });
        setEditingCategory(null); // Reset editing state
    };

    const handleDeleteCategory = (categoryId: string) => {
         const categoryToDelete = appData.categories.find(c => c.id === categoryId);
         if (!categoryToDelete) {
             toast({ title: "Error", description: "Category not found.", variant: "destructive"});
             return;
         }
         // Use isDeletable flag from the category itself
         if (categoryToDelete.isDeletable === false) {
             toast({ title: "Cannot Delete", description: `Category "${categoryToDelete.label}" cannot be deleted.`, variant: "destructive"});
             return;
         }

         // Check if category has children (only relevant for non-income sources)
         if (!categoryToDelete.isIncomeSource) {
             const hasChildren = appData.categories.some(c => c.parentId === categoryId);
             if (hasChildren) {
                 toast({ title: "Cannot Delete", description: "Please delete or reassign sub-categories first.", variant: "destructive"});
                 return;
             }
         }

         // Check if category is used in transactions or budgets (expense categories) or saving goals
         let isInUse = false;
         let usageMessage: string[] = [];

         if (!categoryToDelete.isIncomeSource) { // Only check budget/expense usage for non-income
             const isInTransactions = appData.transactions.some(t => t.category === categoryId && t.type === 'expense');
             const isInBudgets = appData.budgets.some(b => b.category === categoryId);
             if (isInTransactions) { usageMessage.push("expense transactions"); isInUse = true; }
             if (isInBudgets) { usageMessage.push("budgets"); isInUse = true; }
         } else { // Check income transaction usage for income sources
              const isInTransactions = appData.transactions.some(t => t.category === categoryId && t.type === 'income');
              if (isInTransactions) { usageMessage.push("income transactions"); isInUse = true; }
         }

          // Check Saving Goals usage (relevant if category could be linked conceptually, though unlikely directly)
         // Example: const isInGoals = appData.savingGoals.some(g => g.relatedCategoryId === categoryId);
         // if (isInGoals) { usageMessage.push("saving goals"); isInUse = true; }


         if (isInUse) {
             toast({
                title: "Cannot Delete",
                description: `Category is currently used in ${usageMessage.join(' and ')}. Please reassign or remove usage first.`,
                variant: "destructive",
                duration: 5000
             });
             return;
         }

        setAppData(prev => ({
            ...prev,
            categories: prev.categories.filter(c => c.id !== categoryId)
        }));
        toast({ title: "Category Deleted", description: `Category "${categoryToDelete.label}" removed.` });
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory(category);
        setIsAddCategoryDialogOpen(true);
    }

     const toggleExpand = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };


     // Recursive function to render categories and sub-categories
    const renderCategoryTree = (categoriesToRender: Category[], parentId: string | null = null, level = 0) => {
        // Sort ensures consistent order
        const children = categoriesToRender
            .filter(cat => cat.parentId === parentId)
            .sort((a, b) => a.label.localeCompare(b.label));

        return children.map(cat => {
            const Icon = getCategoryIconComponent(cat.icon);
            const hasChildren = categoriesToRender.some(c => c.parentId === cat.id);
            const isExpanded = !!expandedCategories[cat.id];

            return (
                <div key={cat.id} className="flex flex-col" style={{ marginLeft: `${level * 16}px` }}>
                   <Card className={cn("mb-2 group/cat relative", level > 0 && "border-l-4 border-muted-foreground/20")}>
                      <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {hasChildren ? (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => toggleExpand(cat.id)}>
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                ) : (
                                    <span className="w-6 flex-shrink-0"></span> // Placeholder for alignment
                                )}
                                <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium truncate flex-grow">{cat.label}</span>
                                {/* Indicate type (Income/Expense) and Default status */}
                                {cat.isIncomeSource && <span className="text-xs text-accent/80 flex-shrink-0 ml-1">(Income)</span>}
                                {cat.isDefault && <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">(Default)</span>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover/cat:opacity-100 focus-within:opacity-100 transition-opacity ml-2 flex-shrink-0">
                                 {/* Allow editing always, but disable changing type later */}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(cat)} aria-label={`Edit ${cat.label}`}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                {cat.isDeletable !== false ? ( // Show delete only if deletable
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${cat.label}`}>
                                                <Trash2 className="h-4 w-4" />
                                             </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Deleting "{cat.label}" cannot be undone. Ensure it has no sub-categories and is not used in transactions or budgets.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Delete Category
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    // Show disabled trash icon for non-deletable
                                     <span className="h-7 w-7 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed" title={`Cannot delete ${cat.isDefault ? 'default' : ''} category "${cat.label}"`}>
                                          <Trash2 className="h-4 w-4" />
                                     </span>
                                )}
                            </div>
                      </CardContent>
                   </Card>
                    {hasChildren && isExpanded && renderCategoryTree(categoriesToRender, cat.id, level + 1)}
                </div>
            );
        });
    };

    // Separate categories for rendering
    const incomeCats = appData.categories.filter(c => c.isIncomeSource);
    const expenseCats = appData.categories.filter(c => !c.isIncomeSource);


    return (
        <div className="flex flex-col h-screen p-4 bg-background">
            {/* Header */}
            <div className="flex items-center mb-4">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" aria-label="Back to Home">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Manage Categories</h1>
                 <Button size="sm" className="ml-auto" onClick={() => { setEditingCategory(null); setIsAddCategoryDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            {/* Categories List Area */}
            <ScrollArea className="flex-grow">
                 {!isLoaded ? (
                     <p className="text-center text-muted-foreground pt-10">Loading categories...</p>
                 ) : (
                    <div className="space-y-4">
                         {/* Income Sources Section */}
                         <div>
                             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Briefcase className="h-5 w-5 text-accent" /> Income Sources</h2>
                             <div className="space-y-0">
                                 {renderCategoryTree(incomeCats, null)}
                                 {incomeCats.length === 0 && (
                                      <p className="text-sm text-muted-foreground pl-2">No income sources defined.</p>
                                  )}
                             </div>
                         </div>

                        {/* Expense Categories Section */}
                         <div>
                             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-primary" /> Expense Categories</h2>
                             <div className="space-y-0">
                                 {renderCategoryTree(expenseCats, null)}
                                 {expenseCats.filter(c => c.parentId === null).length === 0 && (
                                     <p className="text-sm text-muted-foreground pl-2">No top-level expense categories defined.</p>
                                 )}
                             </div>
                         </div>

                        {appData.categories.length === 0 && (
                            <p className="text-center text-muted-foreground pt-10">No categories found. Add one to get started!</p>
                        )}
                    </div>
                 )}
            </ScrollArea>

            {/* Add/Edit Dialog */}
            <AddCategoryDialog
                open={isAddCategoryDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsAddCategoryDialogOpen(isOpen);
                    if (!isOpen) setEditingCategory(null); // Reset editing state when closing
                }}
                onSaveCategory={handleAddOrUpdateCategory}
                existingCategory={editingCategory}
                // Pass all categories for parent selection logic within the dialog
                categories={appData.categories}
            />
        </div>
    );
}

