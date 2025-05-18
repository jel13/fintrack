

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import * as LucideIcons from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea


import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
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
  isIncomeSource: z.boolean().default(false), // Add field for income source flag
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
        isIncomeSource: existingCategory.isIncomeSource ?? false,
    } : {
      label: "",
      icon: "HelpCircle", // Default icon
      parentId: null,
      isIncomeSource: false,
    },
  });

  // Reset form when dialog opens/closes or existingCategory changes
   React.useEffect(() => {
        form.reset(existingCategory ? {
            label: existingCategory.label,
            icon: existingCategory.icon,
            parentId: existingCategory.parentId,
            isIncomeSource: existingCategory.isIncomeSource ?? false,
        } : {
            label: "",
            icon: "HelpCircle",
            parentId: null,
            isIncomeSource: false,
        });
    }, [open, existingCategory, form]);


  const onSubmit = (values: CategoryFormValues) => {
     // Prevent setting a category as its own parent or child
     if (existingCategory && values.parentId === existingCategory.id) {
         form.setError("parentId", { message: "Cannot set category as its own parent." });
         return;
     }
     // Prevent income source from having a parent
     if (values.isIncomeSource && values.parentId) {
         form.setError("parentId", { message: "Income source categories cannot be sub-categories." });
         return;
     }
      // Prevent non-income source from having an income source as parent
     const parentCategory = categories.find(c => c.id === values.parentId);
     if (!values.isIncomeSource && parentCategory && parentCategory.isIncomeSource) {
         form.setError("parentId", { message: "Expense categories cannot have an income source as parent." });
         return;
     }
     // Add more checks if needed (e.g., prevent deep nesting)

    const dataToSave: Omit<Category, 'id'> & { id?: string } = {
        ...values,
         parentId: values.parentId === "" ? null : values.parentId, // Ensure empty string becomes null
    };
    if (existingCategory) {
      dataToSave.id = existingCategory.id;
      // Preserve non-editable flags from the original category if necessary
      // dataToSave.isDefault = existingCategory.isDefault;
      // dataToSave.isDeletable = existingCategory.isDeletable;
      // isIncomeSource type cannot be changed after creation (enforced by disabling checkbox)
      dataToSave.isIncomeSource = existingCategory.isIncomeSource;
    }
    onSaveCategory(dataToSave);
    onOpenChange(false); // Close dialog
  };

   // Filter categories suitable for being parents
   const potentialParents = React.useMemo(() => {
        // Exclude income sources, self, and potential descendants
        // Also ensure categories prop is an array and category items themselves are valid
        if (!Array.isArray(categories)) {
            return []; 
        }
        return categories.filter(c =>
            c && // Ensure category object 'c' is not null or undefined
            !c.isIncomeSource && // Cannot be an income source
            c.id !== existingCategory?.id // Cannot be self
            // Add more complex check for descendants if needed
        );
    }, [categories, existingCategory]);

    const isIncomeSourceChecked = form.watch('isIncomeSource');


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{existingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            {existingCategory ? "Update the details for this category." : "Create a new category for income or expenses."}
          </DialogDescription>
        </DialogHeader>
         <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6"> {/* Add ScrollArea */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="category-form" className="space-y-4 py-1">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Groceries, Salary, Water Bill" {...field} />
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
                         {/* Wrap SelectContent's children in ScrollArea if needed, although SelectContent usually handles scroll */}
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
                  name="isIncomeSource"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-secondary/30">
                      <FormControl>
                          <Checkbox
                          checked={field.value}
                          onCheckedChange={(checkedState) => {
                              const checked = !!checkedState; // Ensure boolean
                              field.onChange(checked);
                              // If checking 'isIncomeSource', clear parentId
                              if (checked) {
                                  form.setValue('parentId', null);
                              }
                          }}
                          disabled={!!existingCategory} // Disable changing type for existing categories
                          />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                          <FormLabel>
                           Is this an Income Source?
                          </FormLabel>
                          <FormDescription className="text-xs">
                           Check if this category represents income (e.g., Salary, Freelance). Income sources cannot be sub-categories.
                          </FormDescription>
                           {existingCategory && <FormDescription className="text-xs text-destructive italic">Type cannot be changed after creation.</FormDescription>}
                      </div>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""} /* Handle null value */
                      disabled={isIncomeSourceChecked} // Disable if it's an income source
                    >
                      <FormControl>
                        <SelectTrigger disabled={isIncomeSourceChecked}>
                          <SelectValue placeholder={isIncomeSourceChecked ? "N/A (Income Source)" : "Select a parent (optional)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">-- None (Top Level Expense) --</SelectItem>
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
                     <FormDescription className="text-xs">Make this an expense sub-category by selecting a non-income parent.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


            </form>
          </Form>
         </ScrollArea> {/* End ScrollArea */}
        <DialogFooter className="mt-auto pt-4 border-t"> {/* Footer outside scroll */}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="category-form">{existingCategory ? "Save Changes" : "Add Category"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

