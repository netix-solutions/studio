
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
import { LogOut } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '../ui/sidebar';

const pathToTitle: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/account': 'My Account',
  '/subscriptions': 'All Subscriptions',
  '/users': 'User Management',
  '/pricing': 'Change Plan',
  '/advertisements': 'Advertisements',
  '/automated-emails': 'Automated Emails',
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
      pageTitle = "Subscription Details";
  }


  return (
    <header className="sticky top-0 z-30 w-full px-4 md:px-6">
        <div className="flex h-[70px] items-center gap-4 rounded-b-xl border border-t-0 border-border/40 bg-background/80 px-4 shadow-lg backdrop-blur-sm md:px-6">
            <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-xl font-semibold md:text-2xl font-headline text-foreground">{pageTitle}</h1>
            <div className="ml-auto">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                        <AvatarFallback>{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
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
