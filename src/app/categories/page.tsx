

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Briefcase, TrendingDown, Folder, FolderOpen, File } from "lucide-react"; // Added Folder icons
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
import { Badge } from "@/components/ui/badge"; // Import Badge


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
        // Expand top-level categories by default initially
        const initialExpanded: Record<string, boolean> = {};
         loadedData.categories.forEach(cat => {
             if (!cat.parentId) { // Only top-level
                 initialExpanded[cat.id] = true;
             }
         });
        setExpandedCategories(initialExpanded);
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

         // Check if category has children
         const hasChildren = appData.categories.some(c => c.parentId === categoryId);
         if (hasChildren) {
              toast({ title: "Cannot Delete", description: "Please delete or reassign sub-categories first.", variant: "destructive"});
              return;
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

         if (children.length === 0 && level === 0) {
            return (
                 <p className="text-sm text-muted-foreground pl-2 py-4">
                    {parentId === null && categoriesToRender.length === 0 ? "No categories defined in this section." : ""}
                 </p>
            );
        }


        return children.map(cat => {
            const Icon = getCategoryIconComponent(cat.icon);
            const hasChildren = categoriesToRender.some(c => c.parentId === cat.id);
            const isExpanded = !!expandedCategories[cat.id];
            const isIncome = cat.isIncomeSource ?? false;

            return (
                <div key={cat.id} className="flex flex-col" style={{ marginLeft: `${level * 16}px` }}>
                   {/* Use Card for visual grouping, subtle border */}
                   <Card className={cn(
                        "mb-1 group/cat relative transition-all duration-150 ease-in-out hover:shadow-md",
                        level > 0 ? "border-l-4 border-muted-foreground/10" : "border", // Indentation indicator
                        isExpanded ? "shadow-sm" : "shadow-xs"
                    )}>
                      <CardContent className="p-2 flex items-center justify-between cursor-pointer" onClick={() => hasChildren && toggleExpand(cat.id)}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* Expand/Collapse Icon */}
                                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                    {hasChildren ? (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 group-hover/cat:opacity-100" onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}>
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                    ) : (
                                         // Placeholder or different icon for leaf nodes
                                         <File className="h-4 w-4 text-muted-foreground/50" />
                                    )}
                                </div>

                                {/* Category Icon and Label */}
                                <Icon className={cn("h-4 w-4 flex-shrink-0", isIncome ? "text-accent" : "text-primary")} />
                                <span className="text-sm font-medium truncate flex-grow">{cat.label}</span>

                                {/* Badges for Type and Default Status */}
                                <div className="flex gap-1 ml-auto flex-shrink-0 mr-12"> {/* Space before actions */}
                                     {isIncome && <Badge variant="outline" className="text-xs h-5 border-accent/50 text-accent">Income</Badge>}
                                     {cat.isDefault && <Badge variant="secondary" className="text-xs h-5">Default</Badge>}
                                </div>
                            </div>

                            {/* Action Buttons (Appear on Hover/Focus) */}
                            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1 opacity-0 group-hover/cat:opacity-100 focus-within:opacity-100 transition-opacity ml-1 flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditDialog(cat); }} aria-label={`Edit ${cat.label}`}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                {cat.isDeletable !== false ? (
                                     <AlertDialog onOpenChange={(open) => !open && (document.activeElement as HTMLElement)?.blur()}>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => e.stopPropagation()} aria-label={`Delete ${cat.label}`}>
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
                                     <span className="h-7 w-7 flex items-center justify-center text-muted-foreground/50 cursor-not-allowed" title={`Cannot delete ${cat.isDefault ? 'default' : ''} category "${cat.label}"`}>
                                          <Trash2 className="h-4 w-4" />
                                     </span>
                                )}
                            </div>
                      </CardContent>
                   </Card>
                   {/* Recursive Call for Children */}
                   {hasChildren && isExpanded && (
                        <div className="mt-1 pl-1 border-l border-dashed border-muted-foreground/30">
                           {renderCategoryTree(categoriesToRender, cat.id, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    // Separate categories for rendering
    const incomeCats = appData.categories.filter(c => c.isIncomeSource);
    const expenseCats = appData.categories.filter(c => !c.isIncomeSource);


    return (
        <div className="flex flex-col h-screen bg-background">
             {/* Header */}
            <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
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
            <ScrollArea className="flex-grow p-4">
                 {!isLoaded ? (
                      <div className="space-y-4">
                        {/* Skeleton Loading State */}
                        {[...Array(3)].map((_, i) => (
                           <Card key={`skel-inc-${i}`} className="mb-2 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-muted rounded-full animate-pulse"></div>
                                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                                </div>
                           </Card>
                        ))}
                         {[...Array(5)].map((_, i) => (
                           <Card key={`skel-exp-${i}`} className="mb-2 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-muted rounded-full animate-pulse"></div>
                                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                                </div>
                           </Card>
                        ))}
                    </div>
                 ) : (
                    <div className="space-y-4">
                         {/* Income Sources Section */}
                         <div>
                             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 border-b pb-1"><Briefcase className="h-5 w-5 text-accent" /> Income Sources</h2>
                             <div className="space-y-1 mt-2">
                                 {renderCategoryTree(incomeCats, null)}
                                 {incomeCats.length === 0 && (
                                      <p className="text-sm text-muted-foreground pl-2 py-4">No income sources defined. Click 'Add Category' to create one.</p>
                                  )}
                             </div>
                         </div>

                        {/* Expense Categories Section */}
                         <div>
                             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 border-b pb-1"><TrendingDown className="h-5 w-5 text-primary" /> Expense Categories</h2>
                             <div className="space-y-1 mt-2">
                                 {renderCategoryTree(expenseCats, null)}
                                 {expenseCats.filter(c => c.parentId === null).length === 0 && ( // Check for top-level expenses
                                     <p className="text-sm text-muted-foreground pl-2 py-4">No expense categories defined. Click 'Add Category' to create one.</p>
                                 )}
                             </div>
                         </div>

                        {/* Overall Empty State */}
                        {appData.categories.length === incomeCats.length + expenseCats.length && incomeCats.length === 0 && expenseCats.length === 0 && (
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
```

