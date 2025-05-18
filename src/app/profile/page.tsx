
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LogOut, UserCircle, Trash2, Settings, FolderCog, ChevronRight, Palette, Bell } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ProfileListItemProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  isDestructive?: boolean;
}

const ProfileListItem: React.FC<ProfileListItemProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  href,
  isDestructive,
}) => {
  const content = (
    <div
      className={cn(
        "flex items-center p-4 rounded-lg transition-colors",
        onClick || href ? "hover:bg-secondary active:bg-secondary/80" : "",
        isDestructive ? "text-destructive hover:bg-destructive/10 active:bg-destructive/20" : "text-foreground"
      )}
      onClick={onClick && !href ? onClick : undefined} // Only add onClick if no href
    >
      <Icon className={cn("h-5 w-5 mr-4 flex-shrink-0", isDestructive ? "text-destructive" : "text-primary")} />
      <div className="flex-grow">
        <p className="font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {(href || onClick) && !isDestructive && <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />}
      {onClick && isDestructive && <span className="ml-auto"></span>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background" tabIndex={onClick ? 0 : -1} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.()}}>{content}</div>;
};


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
    <div className="flex flex-col h-screen bg-secondary/50">
      {/* Header */}
      <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10 shadow-sm">
        <Link href="/" passHref>
          <Button asChild variant="ghost" size="icon" aria-label="Back to Home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold ml-2">Profile & Settings</h1>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-6">
          {/* Account Section */}
          <Card className="rounded-xl shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-base font-semibold"><UserCircle className="h-5 w-5 text-primary" /> Account</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {user && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">Logged in as:</p>
                  <p className="font-medium text-foreground truncate">{user.email}</p>
                </div>
              )}
              <ProfileListItem
                icon={LogOut}
                title="Log Out"
                onClick={handleLogout}
              />
            </CardContent>
          </Card>

          {/* App Configuration Section */}
          <Card className="rounded-xl shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-base font-semibold"><Settings className="h-5 w-5 text-primary"/> App Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
                <ProfileListItem
                    icon={FolderCog}
                    title="Manage Categories"
                    description="Edit, add, or delete income/expense categories"
                    href="/categories"
                />
                 <ProfileListItem
                    icon={Bell}
                    title="Notification Preferences"
                    description="Manage app notifications (Coming Soon)"
                    onClick={() => toast({title: "Coming Soon!", description: "Notification settings will be available in a future update."})}
                />
                 <ProfileListItem
                    icon={Palette}
                    title="Appearance"
                    description="Customize app theme (Coming Soon)"
                    onClick={() => toast({title: "Coming Soon!", description: "Theme customization will be available in a future update."})}
                />
            </CardContent>
          </Card>

          {/* Data Management Section */}
          <Card className="rounded-xl shadow-md overflow-hidden">
            <CardHeader className="bg-destructive/10">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-destructive"><AlertTriangle className="h-5 w-5" /> Data Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <ProfileListItem
                        icon={Trash2}
                        title="Reset Local App Data"
                        description="Clear all transactions, budgets, etc., on this device"
                        isDestructive
                        onClick={() => {}} // onClick is handled by AlertDialogTrigger
                    />
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-xl">
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
                    <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
                    >
                      Yes, Reset My Local Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
         <div className="p-4 text-center text-xs text-muted-foreground">
            Version 1.0.0
        </div>
      </ScrollArea>
    </div>
  );
}
    

    