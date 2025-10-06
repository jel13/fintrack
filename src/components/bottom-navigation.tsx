
"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Home, List, BarChart3, UserCircle, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
  href: string;
  isPage: boolean;
}

const navItems: NavItem[] = [
  { value: "home", label: "Home", icon: Home, href: "/?tab=home", isPage: false },
  { value: "transactions", label: "Transactions", icon: List, href: "/?tab=transactions", isPage: false },
  { value: "budgets", label: "Budgets", icon: BarChart3, href: "/?tab=budgets", isPage: false },
  { value: "insights", label: "Insights", icon: BarChart3, href: "/?tab=insights", isPage: false },
  { value: "profile", label: "Profile", icon: UserCircle, href: "/profile", isPage: true },
];

export function BottomNavigation() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTabQuery = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = React.useState("home");

  React.useEffect(() => {
    // Find the current active item based on page route or tab query param
    const currentNavItem = navItems.find(item =>
      item.isPage ? pathname === item.href : (pathname === "/" && (currentTabQuery || "home") === item.value)
    );
    if (currentNavItem) {
      setActiveTab(currentNavItem.value);
    } else if (pathname === "/") {
      setActiveTab("home"); 
    } else {
      // Handle cases like /categories, /history etc. which are related to profile
      const baseHrefMatch = navItems.find(item => item.isPage && pathname.startsWith(item.href));
      if (baseHrefMatch) {
        setActiveTab(baseHrefMatch.value);
      } else if (pathname.startsWith('/history') || pathname.startsWith('/categories')) {
         setActiveTab("profile");
      }
    }
  }, [pathname, currentTabQuery]);


  const handleTabChange = (value: string) => {
    const selectedItem = navItems.find((item) => item.value === value);
    if (selectedItem) {
      setActiveTab(value);
      router.push(selectedItem.href);
    }
  };
  
  React.useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const tabValue = customEvent.detail;
      const selectedItem = navItems.find(item => item.value === tabValue && !item.isPage);
      if (selectedItem) {
        handleTabChange(tabValue);
      }
    };
    document.addEventListener('navigateToTab', handleNavigate);
    return () => {
      document.removeEventListener('navigateToTab', handleNavigate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !user) {
    return null;
  }

  // Hide nav on certain pages if desired
  if (pathname === '/history') {
    // Or you can choose to show it and have 'Profile' selected
    return null; 
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg"
    >
      <TabsList className="grid h-16 w-full grid-cols-5 rounded-none p-0">
        {navItems.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 rounded-none p-1 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:border-t-2 data-[state=active]:!text-accent data-[state=active]:shadow-none data-[state=active]:border-accent",
              "hover:text-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
            )}
            aria-label={item.label}
          >
            <item.icon className={cn("h-5 w-5", activeTab === item.value ? "text-accent" : "text-muted-foreground/80" )} />
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
