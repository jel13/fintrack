
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Briefcase, TrendingDown, FileText, FolderOpen, Folder, MoreVertical } from "lucide-react"; // Changed File to FileText for more distinction
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppData, Category } from "@/types";
import { loadAppData, saveAppData, defaultAppData } from "@/lib/storage";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


export default function CategoriesPage() {
    const [appData, setAppData] = React.useState<AppData>(defaultAppData);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});
    const { toast } = useToast();

    React.useEffect(() => {
        const loadedData = loadAppData();
        setAppData(loadedData);
        const initialExpanded: Record<string, boolean> = {};
         loadedData.categories.forEach(cat => {
             if (!cat.parentId) {
                 initialExpanded[cat.id] = true;
             }
         });
        setExpandedCategories(initialExpanded);
        setIsLoaded(true);
    }, []);

    React.useEffect(() => {
        if (isLoaded) {
            saveAppData(appData);
        }
    }, [appData, isLoaded]);

    const handleAddOrUpdateCategory = (categoryData: Omit<Category, 'id'> & { id?: string }) => {
        setAppData(prev => {
            let categories = [...prev.categories];
            let toastMessage = "";

            if (categoryData.parentId === categoryData.id) {
                toast({ title: "Invalid Parent", description: "A category cannot be its own parent.", variant: "destructive" });
                return prev;
             }
             if (categoryData.isIncomeSource && categoryData.parentId) {
                 toast({ title: "Invalid Parent", description: "Income source categories cannot have a parent.", variant: "destructive" });
                 return prev;
             }

            if (categoryData.id) {
                const index = categories.findIndex(c => c.id === categoryData.id);
                if (index > -1) {
                    const originalCategory = categories[index];
                    // Preserve non-editable properties from original if needed
                    const updatedCategoryData = {
                        ...categoryData,
                        isDefault: originalCategory.isDefault,
                        isDeletable: originalCategory.isDeletable,
                        isIncomeSource: originalCategory.isIncomeSource, // Type cannot be changed
                    };


                     if (updatedCategoryData.parentId && categories.some(c => c.parentId === updatedCategoryData.id && c.id === updatedCategoryData.parentId)) {
                         toast({ title: "Invalid Parent", description: "Cannot set parent to a direct child.", variant: "destructive" });
                         return prev;
                     }
                    categories[index] = { ...originalCategory, ...updatedCategoryData };
                    toastMessage = `Category "${updatedCategoryData.label}" updated.`;
                } else {
                    toast({ title: "Error", description: "Category not found for update.", variant: "destructive" });
                    return prev;
                }
            } else {
                const newCategory: Category = {
                    ...categoryData,
                    id: `cat-${categoryData.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${Date.now()}`,
                    isDefault: false,
                    isDeletable: true,
                };
                if (newCategory.parentId && !categories.some(c => c.id === newCategory.parentId && !c.isIncomeSource)) {
                     // Check if parent exists and is not an income source
                    toast({ title: "Error", description: "Parent category not found or is an income source.", variant: "destructive" });
                    return prev;
                }
                categories.push(newCategory);
                 toastMessage = `New category "${newCategory.label}" added.`;
            }

            categories.sort((a, b) => {
                 if (a.isIncomeSource && !b.isIncomeSource) return -1;
                 if (!a.isIncomeSource && b.isIncomeSource) return 1;
                 return a.label.localeCompare(b.label);
             });

            toast({ title: categoryData.id ? "Category Updated" : "Category Added", description: toastMessage });
            return { ...prev, categories };
        });
        setEditingCategory(null);
    };

    const handleDeleteCategory = (categoryId: string) => {
         const categoryToDelete = appData.categories.find(c => c.id === categoryId);
         if (!categoryToDelete) {
             toast({ title: "Error", description: "Category not found.", variant: "destructive"});
             return;
         }
         if (categoryToDelete.isDeletable === false) {
             toast({ title: "Cannot Delete", description: `Category "${categoryToDelete.label}" cannot be deleted.`, variant: "destructive"});
             return;
         }

         const hasChildren = appData.categories.some(c => c.parentId === categoryId);
         if (hasChildren) {
              toast({ title: "Cannot Delete", description: "Please delete or reassign sub-categories first.", variant: "destructive"});
              return;
          }

         let isInUse = false;
         let usageMessage: string[] = [];

         if (!categoryToDelete.isIncomeSource) {
             const isInTransactions = appData.transactions.some(t => t.category === categoryId && t.type === 'expense');
             const isInBudgets = appData.budgets.some(b => b.category === categoryId);
             if (isInTransactions) { usageMessage.push("expense transactions"); isInUse = true; }
             if (isInBudgets) { usageMessage.push("budgets"); isInUse = true; }
         } else {
              const isInTransactions = appData.transactions.some(t => t.category === categoryId && t.type === 'income');
              if (isInTransactions) { usageMessage.push("income transactions"); isInUse = true; }
         }

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

    const renderCategoryTree = (categoriesToRender: Category[], parentId: string | null = null, level = 0) => {
        const children = categoriesToRender
            .filter(cat => cat.parentId === parentId)
            .sort((a, b) => a.label.localeCompare(b.label));

         if (children.length === 0 && parentId === null && categoriesToRender.length === 0) { 
            return (
                 <p className="text-sm text-muted-foreground pl-2 py-4">
                    No categories defined in this section.
                 </p>
            );
        }

        return children.map(cat => {
            const Icon = getCategoryIconComponent(cat.icon);
            const hasChildren = categoriesToRender.some(c => c.parentId === cat.id);
            const isExpanded = !!expandedCategories[cat.id];
            const isIncome = cat.isIncomeSource ?? false;

            return (
                <div key={cat.id} className="flex flex-col" style={{ marginLeft: `${level * 10}px` }}> 
                   <div
                        className={cn(
                            "group/cat relative flex items-center justify-between p-2.5 mb-0.5 rounded-md border cursor-pointer transition-all duration-150 ease-in-out hover:bg-secondary/50 hover:shadow-sm active:scale-[0.98]",
                            level > 0 ? "border-l-4 border-muted-foreground/20" : "border",
                            isExpanded ? "bg-secondary/20 shadow-inner" : ""
                        )}
                    >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => hasChildren && toggleExpand(cat.id)}> 
                            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center"> 
                                {hasChildren ? (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-70 group-hover/cat:opacity-100" onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}>
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                ) : (
                                     <span className="w-7 h-7 flex items-center justify-center">
                                        {level > 0 ? <FileText className="h-4 w-4 text-muted-foreground/60" /> : <Folder className="h-4 w-4 text-muted-foreground/60"/>}
                                     </span>
                                )}
                            </div>

                            <Icon className={cn("h-4 w-4 flex-shrink-0", isIncome ? "text-accent" : "text-primary")} />
                            <span className="text-sm font-medium truncate flex-grow">{cat.label}</span>

                            <div className="flex gap-1.5 ml-auto flex-shrink-0 mr-2"> 
                                 {isIncome && <Badge variant="outline" className="text-xs h-5 border-accent/70 text-accent bg-accent/10">Income</Badge>}
                                 {cat.isDefault && <Badge variant="secondary" className="text-xs h-5 bg-muted/70 text-muted-foreground">Default</Badge>}
                            </div>
                        </div>

                        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex-shrink-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover/cat:opacity-100 focus:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Category Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => openEditDialog(cat)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    {cat.isDeletable !== false ? (
                                        <>
                                            <DropdownMenuSeparator />
                                            <AlertDialog onOpenChange={(open) => !open && (document.activeElement as HTMLElement)?.blur()}>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem 
                                                        onSelect={(event) => event.preventDefault()}
                                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
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
                                        </>
                                    ) : (
                                        <DropdownMenuItem disabled>
                                            <Trash2 className="mr-2 h-4 w-4" /> Cannot Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                   </div>
                   {hasChildren && isExpanded && (
                        <div className="mt-1 pl-2 border-l-2 border-dashed border-muted-foreground/20"> 
                           {renderCategoryTree(categoriesToRender, cat.id, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    const incomeCats = appData.categories.filter(c => c.isIncomeSource);
    const expenseCats = appData.categories.filter(c => !c.isIncomeSource);

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
                <Link href="/" passHref>
                    <Button asChild variant="ghost" size="icon" aria-label="Back to Home">
                       <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Manage Categories</h1>
                 <Button size="sm" className="ml-auto" onClick={() => { setEditingCategory(null); setIsAddCategoryDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            <ScrollArea className="flex-grow p-4">
                 {!isLoaded ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                           <div key={`skel-inc-${i}`} className="mb-2 p-3 border rounded-md animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-muted rounded-full"></div>
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                </div>
                           </div>
                        ))}
                         {[...Array(5)].map((_, i) => (
                           <div key={`skel-exp-${i}`} className="mb-2 p-3 border rounded-md animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-muted rounded-full"></div>
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                </div>
                           </div>
                        ))}
                    </div>
                 ) : (
                    <div className="space-y-6"> 
                         <div>
                             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 border-b pb-2"><Briefcase className="h-5 w-5 text-accent" /> Income Sources</h2>
                             <div className="space-y-0.5 mt-2"> 
                                 {renderCategoryTree(incomeCats, null)}
                                 {incomeCats.length === 0 && (
                                      <p className="text-sm text-muted-foreground pl-2 py-4">No income sources defined. Click 'Add Category' to create one.</p>
                                  )}
                             </div>
                         </div>

                         <div>
                             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 border-b pb-2"><TrendingDown className="h-5 w-5 text-primary" /> Expense Categories</h2>
                             <div className="space-y-0.5 mt-2">
                                 {renderCategoryTree(expenseCats, null)}
                                 {expenseCats.filter(c => c.parentId === null).length === 0 && ( // Check only top-level expense categories
                                     <p className="text-sm text-muted-foreground pl-2 py-4">No expense categories defined. Click 'Add Category' to create one.</p>
                                 )}
                             </div>
                         </div>

                        {appData.categories.length === (incomeCats.length + expenseCats.length) && incomeCats.length === 0 && expenseCats.length === 0 && (
                             <p className="text-center text-muted-foreground pt-10">No categories found. Add one to get started!</p>
                        )}
                    </div>
                 )}
            </ScrollArea>

            <AddCategoryDialog
                open={isAddCategoryDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsAddCategoryDialogOpen(isOpen);
                    if (!isOpen) setEditingCategory(null);
                }}
                onSaveCategory={handleAddOrUpdateCategory}
                existingCategory={editingCategory}
                categories={appData.categories}
            />
        </div>
    );
}

