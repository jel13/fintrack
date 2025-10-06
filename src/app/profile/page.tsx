
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LogOut, UserCircle, Trash2, Settings, FolderCog, ChevronRight, Palette, Bell, Edit, KeyRound, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { clearAppData } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ProfileListItemProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  isDestructive?: boolean;
  children?: React.ReactNode; 
  actionElement?: React.ReactNode;
}

const ProfileListItem: React.FC<ProfileListItemProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  href,
  isDestructive,
  children,
  actionElement,
}) => {
  const content = (
    <div
      className={cn(
        "flex items-center p-4 min-h-[64px] bg-card rounded-lg",
        onClick && !href ? "hover:bg-secondary active:bg-secondary/80 cursor-pointer" : "",
        isDestructive ? "text-destructive hover:bg-destructive/10 active:bg-destructive/20" : "text-foreground"
      )}
      onClick={onClick && !href ? onClick : undefined}
      role={onClick && !href ? "button" : undefined}
      tabIndex={onClick && !href ? 0 : -1}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick && !href) onClick()}}
    >
      <Icon className={cn("h-5 w-5 mr-4 flex-shrink-0", isDestructive ? "text-destructive" : "text-primary")} />
      <div className="flex-grow">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {children && <div className="mt-1">{children}</div>} 
      </div>
      {actionElement ? <div className="ml-auto pl-2">{actionElement}</div> : ( (href || (onClick && !isDestructive && !children)) && <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />)}
    </div>
  );

  if (href && !onClick) {
    return (
      <Link
        href={href}
        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <div className="hover:bg-secondary active:bg-secondary/80 cursor-pointer">{content}</div>
      </Link>
    );
  }
  return <div className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background">{content}</div>;
};

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground">{children}</h2>
);


export default function ProfilePage() {
  const { toast } = useToast();
  const { user, logout, updateUserDisplayName, sendCurrentUserPasswordResetEmail } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isResetDataDialogOpen, setIsResetDataDialogOpen] = React.useState(false);
  const [isNotificationsInfoOpen, setIsNotificationsInfoOpen] = React.useState(false);

  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState(user?.displayName || "");
  const [usernameError, setUsernameError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    if (user?.displayName) {
      setNewUsername(user.displayName);
    }
  }, [user?.displayName]);

  const handleResetData = () => {
    try {
      clearAppData();
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
    } catch (error: any) {
      toast({ title: "Logout Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    if (newUsername.trim().length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }
    if (newUsername.trim().length > 20) {
        setUsernameError("Username cannot exceed 20 characters.");
        return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) {
        setUsernameError("Username can only contain letters, numbers, and underscores.");
        return;
    }
    setUsernameError(null);

    try {
      await updateUserDisplayName(newUsername.trim());
      toast({ title: "Username Updated", description: "Your username has been successfully updated." });
      setIsEditingUsername(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update username.", variant: "destructive" });
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendCurrentUserPasswordResetEmail();
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).",
        duration: 7000,
      });
    } catch (error: any) {
      toast({ title: "Error Sending Email", description: error.message || "Could not send password reset email.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-secondary/30">
      <div className="flex items-center p-4 border-b sticky top-0 bg-background z-10 shadow-sm">
        <Link href="/" passHref>
          <Button asChild variant="ghost" size="icon" aria-label="Back to Home">
              <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold ml-2">Profile & Settings</h1>
      </div>

      <ScrollArea className="flex-grow">
        <div className="py-4 space-y-4">
          
          <section>
            <SectionHeader>Account</SectionHeader>
            <div className="space-y-1 px-4">
                <div className="bg-card p-4 rounded-lg">
                    {isEditingUsername ? (
                      <div className="space-y-2">
                        <Label htmlFor="username-edit" className="text-sm font-medium">Edit Username</Label>
                        <Input
                          id="username-edit"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Enter new username"
                          className="h-9 text-sm"
                        />
                        {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={handleSaveUsername} className="h-8 text-xs rounded-full">
                            <Save className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setIsEditingUsername(false); setUsernameError(null); }} className="h-8 text-xs rounded-full">
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div>
                            <p className="text-sm text-muted-foreground">Username</p>
                            <p className="font-semibold text-foreground truncate">{user?.displayName || "Not set"}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setIsEditingUsername(true); setNewUsername(user?.displayName || ""); setUsernameError(null); }} className="ml-2 text-xs h-8 rounded-full">
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </div>
                    )}
                </div>

                 <div className="bg-card p-4 rounded-lg">
                     <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-semibold text-foreground truncate">{user?.email}</p>
                        </div>
                         {!user?.emailVerified && (
                            <Badge variant="destructive" className="text-xs ml-2">Unverified</Badge>
                         )}
                     </div>
                  </div>

                  <ProfileListItem
                    icon={KeyRound}
                    title="Reset Password"
                    description="Send a password reset link to your email"
                    onClick={handlePasswordReset}
                  />
                  <ProfileListItem
                    icon={LogOut}
                    title="Log Out"
                    onClick={handleLogout}
                  />
            </div>
          </section>

          <section>
            <SectionHeader>App Settings</SectionHeader>
             <div className="space-y-1 px-4">
                 <ProfileListItem
                   icon={FolderCog}
                   title="Manage Categories"
                   description="Edit, add, or delete income/expense categories"
                   href="/categories"
                />
                 <ProfileListItem icon={Palette} title="Theme"
                  actionElement={
                    mounted ? (
                        <Select
                            value={theme}
                            onValueChange={(value) => setTheme(value)}
                        >
                            <SelectTrigger className="w-auto rounded-full h-9 text-sm focus:ring-0 focus:ring-offset-0 border-0 bg-secondary" aria-label="Select theme">
                                <SelectValue placeholder="Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Skeleton className="h-9 w-[120px] rounded-full" />
                    )
                  }
                 />
                 <ProfileListItem
                    icon={Bell}
                    title="Notification Preferences"
                    description="Manage app notifications"
                    onClick={() => setIsNotificationsInfoOpen(true)}
                />
            </div>
          </section>
          
          <section>
            <SectionHeader>Danger Zone</SectionHeader>
            <div className="px-4">
                 <ProfileListItem
                  icon={Trash2}
                  title="Reset Local App Data"
                  description="Clear all financial data on this device"
                  isDestructive
                  onClick={() => setIsResetDataDialogOpen(true)}
                />
            </div>
          </section>
        </div>
         <div className="p-4 text-center text-xs text-muted-foreground">
            FinTrack Mobile Version 1.0.0
        </div>
      </ScrollArea>

      <AlertDialog open={isResetDataDialogOpen} onOpenChange={setIsResetDataDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your financial data (transactions, budgets, categories, goals) stored locally on this device/browser.
              It will not affect your account itself.
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
      
      <AlertDialog open={isNotificationsInfoOpen} onOpenChange={setIsNotificationsInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notification Preferences</AlertDialogTitle>
            <AlertDialogDescription>
              Managing app notifications for reminders and updates is planned for a future version of FinTrack Mobile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsNotificationsInfoOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
