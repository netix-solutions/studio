
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Ticket, Percent, Users, User } from 'lucide-react';
import { Button } from '../ui/button';
import Image from 'next/image';

const allMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { href: '/account', label: 'Account', icon: User, adminOnly: false },
  { href: '/subscriptions', label: 'Subscriptions', icon: Ticket, adminOnly: true },
  { href: '/discounts', label: 'Discounts', icon: Percent, adminOnly: true },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const visibleMenuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar>
        <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
                <Image src="/logo.png" alt="Community-Websites.com Logo" width={81} height={45} style={{height: '45px', width: 'auto'}} />
                <span className="font-headline text-lg tracking-tight text-gray-700 group-data-[collapsible=icon]:hidden">Community-Websites.com</span>
            </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
            <SidebarMenu>
                {visibleMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <Button
                            asChild
                            variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            size="lg"
                        >
                            <Link href={item.href}>
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.label}
                            </Link>
                        </Button>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>
    </Sidebar>
  );
}
