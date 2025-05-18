
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LogOut, UserCircle, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { clearAppData } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, logout } = useAuth(); // Get user and logout function

  const handleResetData = () => {
    try {
      clearAppData(); // This reloads the page
      toast({
        title: "Data Reset Successful",
        description: "All local application data has been cleared. The app will now reload.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error Resetting Data",
        description: "Could not reset app data. Please try again.",
        variant: "destructive",
      });
      console.error("Error resetting data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // Navigation to /login is handled by AuthContext
    } catch (error: any) {
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
        <Link href="/" passHref legacyBehavior>
          <Button asChild variant="ghost" size="icon" aria-label="Back to Home">
            <a><ArrowLeft className="h-5 w-5" /></a>
          </Button>
        </Link>
        <h1 className="text-xl font-semibold ml-2">Profile & Settings</h1>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Logged in as: <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not logged in.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/> App Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Link href="/categories" passHref legacyBehavior>
                    <Button asChild variant="outline" className="w-full justify-start">
                        <a>Manage Categories</a>
                    </Button>
                </Link>
                 {/* Add other configuration links here if needed, e.g., Manage Saving Goals if it's not on main nav */}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Data Management</CardTitle>
              <CardDescription>Manage your local application data. This action is irreversible and only affects data stored on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Reset Local App Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all
                      your financial data (transactions, budgets, categories, goals) stored locally on this device/browser.
                      It will not affect your account if data were synced to a server (not currently implemented).
                      The application will reload after reset.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Yes, Reset My Local Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="mt-2 text-xs text-muted-foreground">
                Resetting will clear all your financial records stored in this browser.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
