
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BottomNavigation } from "@/components/bottom-navigation";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FinTrack Mobile",
  description: "Personal finance tracking and budgeting",
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased flex flex-col", // Ensure body is a flex column
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
              {/* Main content area that grows and scrolls */}
              <div className="flex-grow overflow-y-auto pb-16"> {/* Ensure padding-bottom for nav bar height */}
                {children}
              </div>
              <BottomNavigation /> {/* Placed after the main scrollable content */}
              <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
