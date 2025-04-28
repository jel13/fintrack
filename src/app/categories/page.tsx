"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Edit, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppData, Category } from "@/types";
import { loadAppData, saveAppData } from "@/lib/storage";
import CategoryIcon, { getCategoryIconComponent } from '@/components/category-icon';
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
    const [appData, setAppData] = React.useState<AppData>(loadAppData());
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});
    const { toast } = useToast();

    // Persist data whenever appData changes
    React.useEffect(() => {
        saveAppData(appData);
    }, [appData]);

    const handleAddOrUpdateCategory = (categoryData: Omit<Category, 'id'> & { id?: string }) => {
        setAppData(prev => {
            const categories = [...prev.categories];
            if (categoryData.id) {
                // Update existing category
                const index = categories.findIndex(c => c.id === categoryData.id);
                if (index > -1) {
                     // Prevent changing deletable status of default non-deletable categories
                    const originalCategory = categories[index];
                    if (originalCategory.isDefault && originalCategory.isDeletable === false) {
                         categoryData.isDeletable = false;
                    }
                    categories[index] = { ...originalCategory, ...categoryData }; // Merge carefully
                    toast({ title: "Category Updated", description: `Category "${categoryData.label}" updated.` });
                }
            } else {
                // Add new category
                const newCategory: Category = {
                    ...categoryData,
                    id: `cat-${categoryData.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${Date.now()}`, // Simple ID generation
                    isDefault: false, // Custom categories are not default
                    isDeletable: true, // Custom categories are deletable
                };
                 // Ensure parent exists if parentId is set
                if (newCategory.parentId && !categories.some(c => c.id === newCategory.parentId)) {
                    toast({ title: "Error", description: "Parent category not found.", variant: "destructive" });
                    return prev; // Don't update state
                }
                categories.push(newCategory);
                toast({ title: "Category Added", description: `New category "${newCategory.label}" added.` });
            }
            return { ...prev, categories };
        });
        setEditingCategory(null); // Reset editing state
    };

    const handleDeleteCategory = (categoryId: string) => {
         const categoryToDelete = appData.categories.find(c => c.id === categoryId);
         if (!categoryToDelete || categoryToDelete.isDeletable === false) {
             toast({ title: "Cannot Delete", description: "This category cannot be deleted.", variant: "destructive"});
             return;
         }

         // Check if category has children or is used in transactions/budgets (basic check)
         const hasChildren = appData.categories.some(c => c.parentId === categoryId);
         const isInUse = appData.transactions.some(t => t.category === categoryId) || appData.budgets.some(b => b.category === categoryId);

         if (hasChildren) {
             toast({ title: "Cannot Delete", description: "Please delete or reassign sub-categories first.", variant: "destructive"});
             return;
         }
         if (isInUse) {
             // Consider prompting user to reassign transactions/budgets instead of outright blocking
             toast({ title: "Cannot Delete", description: "Category is currently used in transactions or budgets. Reassign them first.", variant: "destructive"});
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
    const renderCategoryTree = (parentId: string | null = null, level = 0) => {
        const children = appData.categories.filter(cat => cat.parentId === parentId).sort((a, b) => a.label.localeCompare(b.label));

        return children.map(cat => {
            const Icon = getCategoryIconComponent(cat.icon);
            const hasChildren = appData.categories.some(c => c.parentId === cat.id);
            const isExpanded = !!expandedCategories[cat.id];

            return (
                <div key={cat.id} className="flex flex-col" style={{ marginLeft: `${level * 16}px` }}>
                   <Card className={cn("mb-2 group/cat relative", level > 0 && "border-l-4 border-muted-foreground/20")}>
                      <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {hasChildren ? (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(cat.id)}>
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                ) : (
                                    <span className="w-6"></span> // Placeholder for alignment
                                )}
                                <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{cat.label}</span>
                                {cat.isDefault && <span className="text-xs text-muted-foreground">(Default)</span>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover/cat:opacity-100 focus-within:opacity-100 transition-opacity">
                                 {cat.isDeletable !== false && ( // Only show edit for potentially editable ones
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(cat)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                                {cat.isDeletable !== false && ( // Show delete only if deletable
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
                                )}
                                 {cat.isDeletable === false && (
                                    // Optional: Show a disabled or info icon for non-deletable
                                     <span className="h-7 w-7 flex items-center justify-center text-muted-foreground" title="Cannot delete default category"></span>
                                )}
                            </div>
                      </CardContent>
                   </Card>
                    {hasChildren && isExpanded && renderCategoryTree(cat.id, level + 1)}
                </div>
            );
        });
    };


    return (
        <div className="flex flex-col h-screen p-4 bg-background">
            {/* Header */}
            <div className="flex items-center mb-4">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Manage Categories</h1>
                 <Button size="sm" className="ml-auto" onClick={() => { setEditingCategory(null); setIsAddCategoryDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            {/* Categories List */}
            <ScrollArea className="flex-grow">
                <div className="space-y-0"> {/* Reduce space between cards */}
                     {renderCategoryTree(null)}
                     {appData.categories.filter(c => c.parentId === null).length === 0 && (
                         <p className="text-center text-muted-foreground pt-10">No categories found. Add one to get started!</p>
                     )}
                </div>
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
                categories={appData.categories} // Pass all categories for parent selection
            />
        </div>
    );
}
