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
import { LayoutDashboard, Ticket, Tag, Percent, Globe, Users, User } from 'lucide-react';
import { Button } from '../ui/button';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/account', label: 'Account', icon: User },
  { href: '/subscriptions', label: 'Subscriptions', icon: Ticket },
  // { href: '/pricing', label: 'Pricing', icon: Tag }, // Pricing is now a public page
  { href: '/discounts', label: 'Discounts', icon: Percent },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
        <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
                <Globe className="h-6 w-6" />
                <span className="font-headline">Community-Websites.com</span>
            </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
            <SidebarMenu>
                {menuItems.map((item) => (
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
