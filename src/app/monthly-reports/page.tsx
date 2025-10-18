
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BarChartHorizontalBig, Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { loadAppData } from "@/lib/storage";
import type { AppData } from "@/types";
import { format } from "date-fns";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function MonthlyReportsPage() {
    const { user } = useAuth();
    const [appData, setAppData] = React.useState<AppData | null>(null);
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            const data = loadAppData();
            setAppData(data);
            setIsLoaded(true);
        }
    }, [user]);

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
                <Link href="/profile" passHref>
                    <Button asChild variant="ghost" size="icon" aria-label="Back to Profile">
                       <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-semibold ml-2">Monthly Reports</h1>
            </div>

            <ScrollArea className="flex-grow p-4">
                {!isLoaded ? (
                     <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                    </div>
                ) : !appData?.monthlyReports || appData.monthlyReports.length === 0 ? (
                    <Card className="border-dashed mt-4">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <Calendar className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-semibold">No Reports Yet</p>
                            <p className="text-sm">Your first monthly report will be saved here automatically at the start of next month.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {appData.monthlyReports.map((report) => (
                             <AccordionItem value={report.month} key={report.month} className="border-b-0">
                                <Card className="rounded-lg shadow-sm">
                                    <AccordionTrigger className="p-4 hover:no-underline rounded-lg data-[state=open]:bg-secondary/50">
                                        <div className="flex flex-col items-start text-left">
                                            <p className="font-semibold text-base">{format(new Date(report.month + '-02'), 'MMMM yyyy')}</p>
                                            <p className={cn("text-sm", report.netSavings >= 0 ? 'text-accent' : 'text-destructive')}>
                                                Net Savings: {formatCurrency(report.netSavings)}
                                            </p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-3 pt-2 border-t">
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4"/>Total Income</span>
                                                <span className="font-medium text-accent">{formatCurrency(report.totalIncome)}</span>
                                             </div>
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-muted-foreground"><TrendingDown className="h-4 w-4"/>Total Expenses</span>
                                                <span className="font-medium">{formatCurrency(report.totalExpenses)}</span>
                                             </div>

                                            {report.expenseBreakdown.length > 0 && (
                                                <div className="pt-2">
                                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChartHorizontalBig className="h-4 w-4"/>Expense Breakdown</h4>
                                                    <div className="space-y-1 pl-2">
                                                        {report.expenseBreakdown.sort((a,b) => b.amount - a.amount).map(item => (
                                                            <div key={item.categoryId} className="flex justify-between items-center text-xs">
                                                                <span className="text-muted-foreground">{item.categoryLabel}</span>
                                                                <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </ScrollArea>
             <div className="p-4 text-center text-xs text-muted-foreground border-t">
                Reports are auto-generated at the start of each new month.
            </div>
        </div>
    );
}
