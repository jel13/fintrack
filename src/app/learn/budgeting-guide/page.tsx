"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BudgetingGuidePage() {
  return (
    <div className="flex flex-col h-screen p-4 bg-background">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold ml-2">How to Budget Guide</h1>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-grow">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started with Budgeting</CardTitle>
            <CardDescription>A simple guide to taking control of your finances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Know Your Income</h2>
              <p className="text-sm text-muted-foreground">
                The first step is to understand how much money you have coming in each month. This includes your salary, freelance work, allowances, or any other regular income sources.
                Use the Dashboard in the app to set your estimated monthly income.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Track Your Expenses</h2>
              <p className="text-sm text-muted-foreground">
                Where does your money go? Start logging every expense, big or small, using the "+" button in the app. Categorize them honestly (e.g., Groceries, Food & Dining, Transport, Bills). This helps you see your spending patterns.
                Check the 'History' tab to review past transactions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Set Financial Goals</h2>
              <p className="text-sm text-muted-foreground">
                What do you want to achieve? Save for a down payment? Pay off debt? Build an emergency fund? Go on vacation? Having clear goals makes budgeting more motivating.
                Use the 'Goals' tab to set up specific Saving Goals.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Create Your Budget (Allocate Funds)</h2>
              <p className="text-sm text-muted-foreground">
                This is where you plan how to spend your income. Based on your goals and past spending, allocate percentages or specific amounts to different categories in the 'Budgets' tab.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Start with essential needs (Housing, Bills, Groceries, Transport).</li>
                <li>Allocate funds towards your Saving Goals (treat savings like a bill!).</li>
                <li>Set limits for discretionary spending (Food & Dining, Clothing, Entertainment).</li>
                <li>Use the percentage method: Assign a percentage of your income to each category (e.g., 50% Needs, 30% Wants, 20% Savings). The app helps calculate the monetary value.</li>
                <li>The 'Savings' category in the app automatically holds any unallocated income.</li>
              </ul>
            </section>

             <section>
              <h2 className="text-lg font-semibold mb-2">5. Review and Adjust</h2>
              <p className="text-sm text-muted-foreground">
                A budget isn't set in stone. Review your spending against your budget regularly (e.g., weekly or monthly). Did you overspend in a category? Underspend? Adjust your budget percentages or limits for the next month as needed.
                Use the Dashboard's spending analysis and the 'Budgets' tab progress bars to track your performance. Compare current vs. previous month's insights.
              </p>
            </section>

             <section>
              <h2 className="text-lg font-semibold mb-2">Tips for Success</h2>
               <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                 <li>Be realistic: Don't cut spending too drastically at first. Make gradual changes.</li>
                 <li>Be consistent: Track expenses regularly.</li>
                 <li>Be flexible: Life happens! Allow for unexpected costs. Consider an 'Miscellaneous' or 'Buffer' category if needed.</li>
                 <li>Automate savings: Set up automatic transfers to your savings account or goals if possible.</li>
                 <li>Celebrate progress: Acknowledge small wins to stay motivated!</li>
               </ul>
            </section>

          </CardContent>
        </Card>
      </ScrollArea>
    </div>
  );
}
