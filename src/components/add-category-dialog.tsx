"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import * as LucideIcons from 'lucide-react';

import { Button } from "@/components/ui/button";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/types";
import { getCategoryIconComponent } from '@/components/category-icon'; // Use new CategoryIcon


const formSchema = z.object({
  label: z.string().min(1, "Category name is required").max(50, "Name max 50 chars"),
  icon: z.string().min(1, "Icon is required"), // Store icon name string
  parentId: z.string().optional().nullable(), // Allow null for top-level
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveCategory: (category: Omit<Category, 'id'> & { id?: string }) => void; // id is optional for create
  existingCategory: Category | null; // Pass category data for editing
  categories: Category[]; // Pass all categories for parent selection
}

// Get a list of available Lucide icon names
const iconNames = Object.keys(LucideIcons).filter(key => key !== 'createLucideIcon' && key !== 'icons' && typeof LucideIcons[key as keyof typeof LucideIcons] === 'object');


export function AddCategoryDialog({ open, onOpenChange, onSaveCategory, existingCategory, categories }: AddCategoryDialogProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingCategory ? {
        label: existingCategory.label,
        icon: existingCategory.icon,
        parentId: existingCategory.parentId,
    } : {
      label: "",
      icon: "HelpCircle", // Default icon
      parentId: null,
    },
  });

  // Reset form when dialog opens/closes or existingCategory changes
   React.useEffect(() => {
        form.reset(existingCategory ? {
            label: existingCategory.label,
            icon: existingCategory.icon,
            parentId: existingCategory.parentId,
        } : {
            label: "",
            icon: "HelpCircle",
            parentId: null,
        });
    }, [open, existingCategory, form]);


  const onSubmit = (values: CategoryFormValues) => {
     // Prevent setting a category as its own parent or child
     if (existingCategory && values.parentId === existingCategory.id) {
         form.setError("parentId", { message: "Cannot set category as its own parent." });
         return;
     }
     // Add more checks if needed (e.g., prevent deep nesting)

    const dataToSave: Omit<Category, 'id'> & { id?: string } = {
        ...values,
         parentId: values.parentId === "" ? null : values.parentId, // Ensure empty string becomes null
    };
    if (existingCategory) {
      dataToSave.id = existingCategory.id;
    }
    onSaveCategory(dataToSave);
    onOpenChange(false); // Close dialog
  };

   // Filter categories suitable for being parents (cannot be a child of the current category being edited)
   const potentialParents = React.useMemo(() => {
        if (!existingCategory) return categories.filter(c => c.id !== 'income'); // All non-income categories for new
        // Exclude self and potential descendants (simple check, might need recursion for deeper nesting)
        return categories.filter(c => c.id !== existingCategory.id && c.parentId !== existingCategory.id && c.id !== 'income');
    }, [categories, existingCategory]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            {existingCategory ? "Update the details for this category." : "Create a new category or sub-category."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="category-form" className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries, Water Bill" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                         <div className="flex items-center gap-2">
                            {field.value && React.createElement(getCategoryIconComponent(field.value), { className: "h-4 w-4 text-muted-foreground" })}
                            <SelectValue placeholder="Select an icon" />
                         </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconNames.sort().map((iconName) => {
                         const Icon = getCategoryIconComponent(iconName);
                         return (
                           <SelectItem key={iconName} value={iconName}>
                             <div className="flex items-center gap-2">
                               <Icon className="h-4 w-4 text-muted-foreground" />
                               <span>{iconName}</span>
                             </div>
                           </SelectItem>
                         );
                       })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""} /* Handle null value */>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">-- None (Top Level) --</SelectItem>
                       {potentialParents.map((category) => {
                          const Icon = getCategoryIconComponent(category.icon);
                          return (
                           <SelectItem key={category.id} value={category.id}>
                             <div className="flex items-center gap-2">
                               <Icon className="h-4 w-4 text-muted-foreground" />
                               <span>{category.label}</span>
                             </div>
                           </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                   <FormDescription>Make this a sub-category by selecting a parent.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="category-form">{existingCategory ? "Save Changes" : "Add Category"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
