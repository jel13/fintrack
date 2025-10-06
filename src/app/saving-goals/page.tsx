
"use client";
// This page is now deprecated and its contents have been moved to the Budgets tab.
// It will redirect users to the correct page.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SavingGoalsRedirectPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    React.useEffect(() => {
        if (!loading && user) {
            router.replace('/?tab=budgets');
            // After redirecting, maybe set the default tab there to 'savings'
            // This could be done with a query param like /?tab=budgets&view=savings
            // For now, a simple redirect is fine.
        } else if (!loading && !user) {
            router.replace('/login');
        }
    }, [router, user, loading]);

    return (
        <div className="flex flex-col flex-1 bg-background items-center justify-center p-4">
             <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">Redirecting to Budgets page...</p>
        </div>
    );
}

    