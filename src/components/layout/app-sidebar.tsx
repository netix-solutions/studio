
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
  Layers,
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
  { href: '/wix-directory', label: 'Wix Directory', icon: Layers },
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
      <SidebarHeader className="border-b border-border/50 py-3">
        <Link
          href={isAdmin ? '/leads' : '/account'}
          className="flex items-center gap-3 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors px-1"
        >
          <Image
            src="/logo.png"
            alt="Community-Websites.com Logo"
            width={36}
            height={36}
            className="rounded-lg shrink-0"
            style={{ height: '36px', width: 'auto' }}
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-headline text-sm font-bold tracking-tight text-brand-primary leading-tight">
              Community-Websites
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {isAdmin ? 'Admin Panel' : 'Customer Portal'}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-1">
        <SidebarMenu className="gap-0.5">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {isAdmin && (
            <>
              <div className="mt-4 mb-1 flex items-center gap-2 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                <Settings className="h-3 w-3" />
                Settings
              </div>
              {adminSettingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full h-7 justify-center text-xs group-data-[collapsible=icon]:px-0"
        >
          {isCollapsed ? (
            <ChevronsRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronsLeft className="h-3.5 w-3.5 mr-1.5" />
              <span className="group-data-[collapsible=icon]:hidden">Collapse</span>
            </>
          )}
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
