
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { Loader2, LayoutDashboard, User } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';
import { doc, getDoc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const ADMIN_ROUTES = ['/dashboard', '/users', '/subscriptions', '/advertisements', '/automated-emails', '/leads', '/import', '/legal', '/pipeline'];
const USER_DEFAULT_ROUTE = '/account';
const ADMIN_DEFAULT_ROUTE = '/dashboard';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      // Create user profile doc if it doesn't exist
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(userDocSnap => {
        if (!userDocSnap.exists()) {
           setDoc(userDocRef, {
              id: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            }, { merge: true });
        }
      });
      
      // Check for admin role
      const adminDocRef = doc(firestore, 'roles_admin', user.uid);
      const unsubscribe = onSnapshot(adminDocRef, (docSnap) => {
        const userIsAdmin = docSnap.exists();
        setIsAdmin(userIsAdmin);
        setIsRoleLoading(false);

        // --- Role-based routing ---
        const isAccessingAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route) && route !== '/subscriptions'); // allow non-admins to see their own subs
        
        if (!userIsAdmin && isAccessingAdminRoute) {
          // If a non-admin tries to access an admin page, redirect them.
          router.replace(USER_DEFAULT_ROUTE);
        } else if (userIsAdmin && pathname === USER_DEFAULT_ROUTE) {
          // If an admin logs in and lands on the default user page, send them to their dashboard.
          router.replace(ADMIN_DEFAULT_ROUTE);
        }

      }, (error) => {
        // A 'permission-denied' error is expected for non-admin users,
        // so we can safely assume they are not an admin.
        setIsAdmin(false);
        setIsRoleLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, firestore, pathname, router]);


  if (isUserLoading || isRoleLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Final check to prevent flashing admin content to non-admins
  const isAccessingAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route) && route !== '/subscriptions');
  if (!isAdmin && isAccessingAdminRoute) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <SidebarProvider>
        {/* The error listener is now scoped to the protected layout */}
        <FirebaseErrorListener />
        {/* Command palette for quick navigation */}
        <CommandPalette isAdmin={isAdmin} />
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <AppSidebar isAdmin={isAdmin} />
            </div>
            <div className="flex flex-col">
                <Header isAdmin={isAdmin} />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
                    {children}
                </main>
            </div>
        </div>
    </SidebarProvider>
  );
}
