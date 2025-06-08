
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, PlusCircle, TrendingDown, BarChart3, Wallet } from "lucide-react";

interface OnboardingCardProps {
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

export const OnboardingCard: React.FC<OnboardingCardProps> = ({ onDismiss, isIncomeSet }) => {
  return (
    <Card className="mb-4 border-2 border-primary bg-primary/5 animate-fade-in shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg">Welcome to FinTrack!</CardTitle>
        </div>
        <CardDescription>Here are a few tips to get you started on your financial journey:</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!isIncomeSet && (
           <TipItem
            icon={Wallet}
            title="Set Your Income"
            description="Start by setting your estimated monthly income on this Home screen. This helps in budgeting."
          />
        )}
        <TipItem
          icon={PlusCircle}
          title="Log Transactions"
          description="Use the '+' button (bottom right on Home when income is set) to add your income and expenses as they happen."
        />
        <TipItem
          icon={TrendingDown}
          title="Create Budgets"
          description="Navigate to the 'Budgets' tab to allocate percentages of your income to different spending categories."
        />
        <TipItem
          icon={BarChart3}
          title="Analyze Spending"
          description="Check the 'Insights' tab to visualize your spending patterns and track your financial progress."
        />
      </CardContent>
      <CardFooter>
        <Button onClick={onDismiss} className="w-full">
          Got it, let's start!
        </Button>
      </CardFooter>
    </Card>
  );
};
