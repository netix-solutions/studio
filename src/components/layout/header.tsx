
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
import { LogOut, LayoutDashboard, User, LayoutGrid } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOutUser } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '../ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Customer navigation items
const customerNavItems = [
  { href: '/account', label: 'My Account', icon: User },
  { href: '/directory-listing', label: 'Directory Listing', icon: LayoutGrid },
];

const pathToTitle: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/account': 'My Account',
  '/subscriptions': 'All Customers',
  '/users': 'User Management',
  '/pricing': 'Change Plan',
  '/directory-listing': 'Directory Listing',
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
    <header className="sticky top-4 z-30 w-full px-4 md:px-6">
        <div className="flex h-16 items-center gap-4 rounded-xl border border-white/60 bg-white/80 px-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl backdrop-saturate-150 md:px-6">
            {/* Admin: show sidebar trigger and page title */}
            {isAdmin && (
              <>
                <SidebarTrigger className="text-gray-700" />
                <h1 className="text-lg font-semibold md:text-xl font-headline text-gray-800">{pageTitle}</h1>
                <Button asChild variant="ghost" size="sm" className="ml-4 hidden sm:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100/80">
                    <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Panel
                    </Link>
                </Button>
              </>
            )}

            {/* Customer: show navigation pills directly in header */}
            {!isAdmin && (
              <nav className="flex items-center gap-1">
                {customerNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-brand-primary text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="ml-auto">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-100/80 transition-colors">
                    <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                        <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 font-medium text-sm">{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white/90 backdrop-blur-xl border-white/60 shadow-lg" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none text-gray-800">{user?.displayName}</p>
                        <p className="text-xs leading-none text-gray-500">{user?.email}</p>
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
