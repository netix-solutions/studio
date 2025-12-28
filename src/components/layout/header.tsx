
'use client';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '../ui/sidebar';
import Link from 'next/link';

const pathToTitle: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/account': 'My Account',
  '/subscriptions': 'All Customers',
  '/users': 'User Management',
  '/pricing': 'Change Plan',
  '/advertisements': 'Advertisements',
  '/automated-emails': 'Automated Emails',
  '/leads': 'Leads',
  '/import': 'Import Customers',
  '/legal': 'Legal Documents',
};

export default function Header({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    if (auth) {
      await signOutUser(auth);
    }
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0][0];
  };

  let pageTitle = "Account";
  for (const path in pathToTitle) {
      if (pathname.startsWith(path)) {
          pageTitle = pathToTitle[path];
          break;
      }
  }

  // For non-admins, some pages have a different context
  if (!isAdmin) {
      if (pathname.startsWith('/subscriptions')) {
          pageTitle = 'My Subscriptions';
      }
  }

  // For dynamic routes
  if (pathname.match(/^\/subscriptions\/[^/]+$/)) {
      pageTitle = "Customer Details";
  }
  if (pathname.match(/^\/leads\/[^/]+$/)) {
      pageTitle = "Lead Details";
  }


  return (
    <header className="sticky top-3 z-30 w-full px-4 md:px-6">
        <div className="flex h-[72px] items-center gap-4 rounded-2xl border border-border/30 bg-white/95 px-5 shadow-lg shadow-brand-primary/5 backdrop-blur-md md:px-6">
            <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-xl font-bold md:text-2xl font-headline text-brand-primary">{pageTitle}</h1>

            {isAdmin && (
                 <Button asChild variant="outline" className="ml-4 hidden sm:flex border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary">
                    <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Panel
                    </Link>
                </Button>
            )}

            <div className="ml-auto">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-11 w-11 rounded-full hover:bg-brand-primary/10 transition-colors">
                    <Avatar className="h-10 w-10 ring-2 ring-brand-primary/10">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                        <AvatarFallback className="bg-brand-primary/10 text-brand-primary font-semibold">{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none text-brand-primary">{user?.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    </header>
  );
}
