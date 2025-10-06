
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, PlusCircle, Target, Wallet } from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
  onDismiss: () => void;
  isIncomeSet: boolean;
}

interface TipProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const TipItem: React.FC<TipProps> = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 mt-1">
      <Icon className="h-5 w-5 text-accent" />
    </div>
    <div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ open, onDismiss, isIncomeSet }) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Welcome to FinTrack!
          </DialogTitle>
          <DialogDescription>
            Here are a few tips to get you started on your financial journey:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isIncomeSet && (
            <TipItem
              icon={Wallet}
              title="1. Set Your Income"
              description="Start by setting your estimated monthly income on the Home screen. This helps in budgeting."
            />
          )}
          <TipItem
            icon={PlusCircle}
            title={isIncomeSet ? "1. Log Transactions" : "2. Log Transactions"}
            description="Use the '+' button (bottom right on Home when income is set) to add your income and expenses as they happen."
          />
          <TipItem
            icon={Target}
            title={isIncomeSet ? "2. Create Budgets" : "3. Create Budgets"}
            description="Navigate to the 'Budgets' tab to allocate percentages of your income to different spending categories."
          />
          <TipItem
            icon={Lightbulb}
            title={isIncomeSet ? "3. Analyze Spending" : "4. Analyze Spending"}
            description="Check the 'Insights' tab to visualize your spending patterns and track your financial progress."
          />
        </div>
        <DialogFooter>
          <Button onClick={onDismiss} className="w-full">
            Got it, let's start!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
