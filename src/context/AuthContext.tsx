
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  UserCredential
} from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  register: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const register = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    // User will be redirected by the useEffect hook above after state update
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
  
  // If not loading and on a public path without a user, or if user exists, allow children
   const isPublicPath = ['/login', '/register'].includes(pathname);
   if (!user && !isPublicPath && !loading) {
     // This state should ideally be handled by the redirect effect,
     // but as a fallback, show loading or a minimal UI.
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
             <p className="text-muted-foreground text-lg">Redirecting to login...</p>
        </div>
     );
   }


  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
