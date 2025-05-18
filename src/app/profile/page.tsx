
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LogOut, UserCircle, Trash2, Settings, FolderCog } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const handleResetData = () => {
    try {
      clearAppData();
      toast({
        title: "Data Reset Successful",
        description: "All local application data has been cleared. The app will now reload.",
        variant: "default",
      });
      // No need to manually reload, clearAppData does it.
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
      toast({ title: "Logout Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
        <Link href="/" passHref>
          <Button asChild variant="ghost" size="icon" aria-label="Back to Home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold ml-2">Profile & Settings</h1>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-6">
          <Card className="shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Logged in as: <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                  <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not logged in.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/> App Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Link href="/categories" passHref>
                    <Button asChild variant="outline" className="w-full justify-start text-left">
                        <>
                            <FolderCog className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Manage Categories</span>
                        </>
                    </Button>
                </Link>
                 {/* Placeholder for future settings */}
                 {/* 
                 <Button variant="outline" className="w-full justify-start text-left" disabled>
                     <Bell className="mr-2 h-4 w-4 flex-shrink-0" />
                     <span>Notification Preferences (Soon)</span>
                 </Button>
                 <Button variant="outline" className="w-full justify-start text-left" disabled>
                     <Palette className="mr-2 h-4 w-4 flex-shrink-0" />
                     <span>Appearance (Soon)</span>
                 </Button>
                 */}
            </CardContent>
          </Card>

          <Card className="border-destructive/50 shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Data Management</CardTitle>
              <CardDescription>This action is irreversible and only affects data stored locally on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
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
                Resetting will clear all your financial records stored in this browser and reload the app.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
