'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      
      const checkAndCreateUserDoc = async () => {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          // Document doesn't exist, so create it.
          try {
            await setDoc(userDocRef, {
              id: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            });
            console.log("User document created for existing user:", user.uid);
          } catch (error) {
            console.error("Error creating user document:", error);
          }
        }
      };

      checkAndCreateUserDoc();
    }
  }, [user, firestore]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <AppSidebar />
            </div>
            <div className="flex flex-col">
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
                    {children}
                </main>
            </div>
        </div>
    </SidebarProvider>
  );
}
