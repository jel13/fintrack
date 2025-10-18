
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Paperclip } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import CategoryIcon, { getCategoryIconComponent } from "@/components/category-icon"; // Assuming CategoryIcon can take iconName

interface CategoryOrGoalDisplay {
  label: string;
  icon: string;
  isSavingGoal?: boolean;
}

interface TransactionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  categoryOrGoalDisplay: CategoryOrGoalDisplay | null;
}

export function TransactionReceiptDialog({
  open,
  onOpenChange,
  transaction,
  categoryOrGoalDisplay,
}: TransactionReceiptDialogProps) {
  if (!transaction || !categoryOrGoalDisplay) {
    return null;
  }

  const IconComponent = getCategoryIconComponent(categoryOrGoalDisplay.icon);
  const dateLabel = transaction.type === 'income' ? "Date & Time of Income" : "Date & Time of Expense";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription className="text-xs pt-1">
            ID: {transaction.id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 -m-4 overflow-y-auto">
         <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{dateLabel}</span>
              <span className="font-medium text-sm text-right">
                {format(transaction.date, "MMM d, yyyy 'at' p")}
              </span>
            </div>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground block mb-0.5">Amount</span>
              <p
                className={`text-3xl font-bold ${
                  transaction.type === "income"
                    ? "text-accent"
                    : "text-foreground"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}{" "}
                {formatCurrency(transaction.amount)}
              </p>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge
                variant={
                  transaction.type === "income" ? "outline" : "secondary"
                }
                className={
                  transaction.type === "income"
                    ? "border-accent text-accent bg-accent/10"
                    : "bg-secondary text-secondary-foreground"
                }
              >
                {transaction.type.charAt(0).toUpperCase() +
                  transaction.type.slice(1)}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{categoryOrGoalDisplay.isSavingGoal ? "Saving Goal" : "Category"}</span>
              <div className="flex items-center gap-2">
                <IconComponent className={`h-4 w-4 ${categoryOrGoalDisplay.isSavingGoal ? "text-accent" : "text-primary" }`} />
                <span className="font-medium text-sm">{categoryOrGoalDisplay.label}</span>
              </div>
            </div>
            {transaction.description && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground block mb-0.5">
                    Description
                  </span>
                  <p className="text-sm font-medium whitespace-pre-wrap">
                    {transaction.description}
                  </p>
                </div>
              </>
            )}
            {transaction.receiptDataUrl && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">
                    Receipt
                  </span>
                  {transaction.receiptDataUrl.startsWith("data:image") ? (
                    <a href={transaction.receiptDataUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                      <img
                        src={transaction.receiptDataUrl}
                        alt="Receipt"
                        className="rounded-md border object-contain w-full max-h-60 cursor-pointer hover:opacity-80 transition-opacity"
                        data-ai-hint="receipt image"
                      />
                    </a>
                  ) : transaction.receiptDataUrl.startsWith(
                      "data:application/pdf"
                    ) ? (
                    <a
                      href={transaction.receiptDataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                    >
                      <Paperclip className="h-4 w-4" /> View PDF Receipt
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Unsupported receipt format
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
