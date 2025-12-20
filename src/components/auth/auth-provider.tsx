'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading: isUserLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
