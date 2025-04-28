import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
// import { AppDataProvider } from "@/context/AppDataContext"; // Example context provider

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FinTrack Mobile",
  description: "Personal finance tracking and budgeting",
  // Add viewport settings for mobile-first approach
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
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        {/* Wrap children potentially with Context Providers if needed later */}
        {/* <AppDataProvider> */}
            {children}
            <Toaster /> {/* Add Toaster here */}
        {/* </AppDataProvider> */}
      </body>
    </html>
  );
}
