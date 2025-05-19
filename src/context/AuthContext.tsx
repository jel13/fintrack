
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  updateProfile, // Import updateProfile
  sendPasswordResetEmail, // Import sendPasswordResetEmail
  UserCredential
} from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; 
import { useToast } from "@/hooks/use-toast"; 

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  register: (email: string, pass: string, username: string) => Promise<UserCredential>; 
  logout: () => Promise<void>;
  sendVerificationEmail: (user: FirebaseUser) => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  sendCurrentUserPasswordResetEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      const allowedPaths = ['/login', '/register'];
      if (!allowedPaths.includes(pathname)) {
        router.push('/login');
      }
    }
    if (!loading && user && (pathname === '/login' || pathname === '/register')) {
        router.push('/');
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, pass: string): Promise<UserCredential> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential.user && !userCredential.user.emailVerified) {
      toast({
        title: "Email Not Verified",
        description: "Please check your email to verify your account. You can request a new verification email if needed.",
        variant: "default", 
        duration: 7000,
      });
    }
    return userCredential;
  };
  
  const sendVerificationEmail = async (currentUser: FirebaseUser): Promise<void> => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    } else {
      throw new Error("No user to send verification email to.");
    }
  };

  const register = async (email: string, pass: string, username: string): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: username
      });
      await sendEmailVerification(userCredential.user);
      // Update local user state to reflect new displayName immediately
      setUser(auth.currentUser); 
    }
    return userCredential;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserDisplayName = async (newName: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newName });
      // To ensure the UI updates, we re-set the user state with the potentially updated currentUser object.
      // Firebase's onAuthStateChanged might also pick this up, but this is more immediate.
      setUser(auth.currentUser ? { ...auth.currentUser, displayName: newName } : null);
    } else {
      throw new Error("No user currently signed in to update display name.");
    }
  };

  const sendCurrentUserPasswordResetEmail = async () => {
    if (auth.currentUser && auth.currentUser.email) {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
    } else {
      throw new Error("No authenticated user or user email available to send password reset email.");
    }
  };


  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <svg className="animate-spin h-12 w-12 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground text-lg">Loading FinTrack Mobile...</p>
            <div className="w-full max-w-xs mt-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
  }
  
   const isPublicPath = ['/login', '/register'].includes(pathname);
   if (!user && !isPublicPath && !loading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
             <p className="text-muted-foreground text-lg">Redirecting to login...</p>
        </div>
     );
   }


  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        login, 
        register, 
        logout, 
        sendVerificationEmail,
        updateUserDisplayName,
        sendCurrentUserPasswordResetEmail 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

