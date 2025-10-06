
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from 'next/image';
import { auth } from '@/lib/firebase'; 
import { sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth(); 
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showResendVerification, setShowResendVerification] = React.useState(false);
  const [emailForResend, setEmailForResend] = React.useState("");


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleResendVerification = async () => {
    if (!emailForResend) {
        toast({ title: "Error", description: "Email address not available.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
        // We need to temporarily sign in the user to get their user object, then sign out.
        // This is a common pattern when you need a user object for actions like sending verification emails.
        const userCredential = await signInWithEmailAndPassword(auth, emailForResend, form.getValues('password'));
        if (userCredential.user) {
            await sendEmailVerification(userCredential.user);
            toast({ title: "Verification Email Sent", description: "A new verification email has been sent. Please check your inbox." });
        }
        await auth.signOut(); // Immediately sign out
        setShowResendVerification(false);
    } catch (error: any) {
        toast({ title: "Error Sending Email", description: error.message || "Could not resend verification email.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
};


  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setShowResendVerification(false); 
    setEmailForResend(data.email); 
    try {
      await login(data.email, data.password);
      toast({ title: "Login Successful", description: "Welcome back!" });
    } catch (error: any) {
        if (error.name === 'EmailUnverified') {
            setShowResendVerification(true);
            toast({
                title: "Email Not Verified",
                description: "Please check your email to verify your account.",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Login Failed",
                description: error.message || "Please check your credentials and try again.",
                variant: "destructive",
            });
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Image
            src="/logo.png" 
            alt="FinTrack Logo"
            width={128} 
            height={128} 
            className="mx-auto mb-4"
            data-ai-hint="logo"
            priority
          />
          <CardTitle className="text-2xl">WELCOME!</CardTitle>
          <CardDescription>Log in to manage your finances with FinTrack.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...form.register("email")}
                disabled={isLoading}
                className="rounded-lg"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
                disabled={isLoading}
                className="rounded-lg"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full rounded-lg" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log In"}
            </Button>
          </form>
           {showResendVerification && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Your email is not verified.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={isLoading}
                className="rounded-lg"
              >
                {isLoading ? "Sending..." : "Resend Verification Email"}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
