
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Ticket,
  User,
  ShoppingBag,
  Megaphone,
  Handshake,
  Radio,
  UserPlus,
  Home,
  Mail,
  Upload,
  FileText,
  Bell,
  Settings,
  Calculator,
  Code,
  LayoutGrid,
  FolderOpen,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
} from 'lucide-react';
import { Button } from '../ui/button';
import Image from 'next/image';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

// Core admin navigation - essential features for managing the ad business
const adminMenuItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/financials', label: 'Financials', icon: DollarSign },
  { href: '/leads', label: 'Leads', icon: Handshake },
  { href: '/subscriptions', label: 'Customers', icon: Ticket },
  { href: '/advertisements', label: 'Advertisements', icon: Megaphone },
  { href: '/manual-entry', label: 'Manual Entry', icon: UserPlus },
  { href: '/ad-server', label: 'Ad Server', icon: Radio },
  { href: '/directory', label: 'Directory', icon: FolderOpen },
  { href: '/embed-codes', label: 'Embed Codes', icon: Code },
];

// Settings section items
const adminSettingsItems: NavItem[] = [
  { href: '/automated-emails', label: 'Email Templates', icon: Mail },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/reconciliation', label: 'Reconciliation', icon: Calculator },
  { href: '/legal', label: 'Legal', icon: FileText },
  { href: '/admin-notifications', label: 'Notifications', icon: Bell },
];

// User navigation (non-admin)
const userMenuItems: NavItem[] = [
  { href: '/account', label: 'My Account', icon: User },
  { href: '/directory-listing', label: 'Directory Listing', icon: LayoutGrid },
  { href: '/pricing', label: 'Change Plan', icon: ShoppingBag },
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/50 pb-5 pt-1">
        <Link
          href={isAdmin ? '/leads' : '/account'}
          className="flex items-center gap-3.5 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors px-2"
        >
          <Image
            src="/logo.png"
            alt="Community-Websites.com Logo"
            width={44}
            height={44}
            className="rounded-xl shrink-0"
            style={{ height: '44px', width: 'auto' }}
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-headline text-base font-bold tracking-tight text-brand-primary leading-tight">
              Community-Websites
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-0.5">
              {isAdmin ? 'Admin Panel' : 'Customer Portal'}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                  size="lg"
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                <Settings className="h-4 w-4" />
                Settings
              </div>
              <div className="space-y-1">
                {adminSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.label}
                      size="lg"
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </div>
            </div>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center group-data-[collapsible=icon]:px-0"
        >
          {isCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden">Collapse</span>
            </>
          )}
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
