'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Ticket,
  Users,
  User,
  ShoppingBag,
  Megaphone,
  Mail,
  Handshake,
  FileText,
  Kanban,
  ChevronDown,
  ChevronRight,
  Settings,
  Workflow,
  BarChart3,
  LogOut,
  Radio,
} from 'lucide-react';
import { Button } from '../ui/button';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'warning';
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Admin navigation organized by workflow
const adminSections: NavSection[] = [
  {
    title: 'Overview',
    icon: BarChart3,
    defaultOpen: true,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Ad Workflow',
    icon: Workflow,
    defaultOpen: true,
    items: [
      { href: '/pipeline', label: 'Pipeline', icon: Kanban },
      { href: '/advertisements', label: 'All Ads', icon: Megaphone },
    ],
  },
  {
    title: 'CRM',
    icon: Handshake,
    defaultOpen: true,
    items: [
      { href: '/leads', label: 'Leads', icon: Handshake },
      { href: '/subscriptions', label: 'Customers', icon: Ticket },
    ],
  },
  {
    title: 'Ad Server',
    icon: Radio,
    defaultOpen: false,
    items: [
      { href: '/ad-server', label: 'Manage Ads', icon: Megaphone },
    ],
  },
  {
    title: 'Administration',
    icon: Settings,
    defaultOpen: false,
    items: [
      { href: '/users', label: 'Users', icon: Users },
      { href: '/automated-emails', label: 'Email Templates', icon: Mail },
      { href: '/legal', label: 'Legal Documents', icon: FileText },
    ],
  },
];

// User navigation (non-admin)
const userMenuItems: NavItem[] = [
  { href: '/account', label: 'My Account', icon: User },
  { href: '/pricing', label: 'Change Plan', icon: ShoppingBag },
];

function NavSectionComponent({
  section,
  pathname,
  isOpen,
  onToggle
}: {
  section: NavSection;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasActiveChild = section.items.some(item => pathname.startsWith(item.href));

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between px-3 py-2 h-auto font-medium text-sm",
            hasActiveChild && "text-primary"
          )}
        >
          <span className="flex items-center gap-2">
            <section.icon className="h-4 w-4" />
            {section.title}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
          {section.items.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
              className="w-full justify-start h-9 text-sm"
              size="sm"
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                {item.badge && (
                  <span className={cn(
                    "ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full",
                    item.badgeVariant === 'destructive' && "bg-destructive/10 text-destructive",
                    item.badgeVariant === 'warning' && "bg-amber-100 text-amber-700",
                    !item.badgeVariant && "bg-primary/10 text-primary"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  // Track which sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    adminSections.forEach(section => {
      initial[section.title] = section.defaultOpen ?? false;
    });
    return initial;
  });

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border pb-4">
        <Link
          href={isAdmin ? '/dashboard' : '/account'}
          className="flex items-center gap-3 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors px-2"
        >
          <Image
            src="/logo.png"
            alt="Community-Websites.com Logo"
            width={40}
            height={40}
            className="rounded-lg"
            style={{ height: '40px', width: 'auto' }}
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-headline text-base tracking-tight text-foreground leading-tight">
              Community
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {isAdmin ? 'Admin Panel' : 'Customer Portal'}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {isAdmin ? (
            // Admin navigation with sections
            <div className="space-y-2">
              {adminSections.map((section) => (
                <NavSectionComponent
                  key={section.title}
                  section={section}
                  pathname={pathname}
                  isOpen={openSections[section.title]}
                  onToggle={() => toggleSection(section.title)}
                />
              ))}
            </div>
          ) : (
            // User navigation (flat list)
            <div className="space-y-1">
              {userMenuItems.map((item) => (
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
            </div>
          )}
        </SidebarMenu>
      </SidebarContent>

      {isAdmin && (
        <SidebarFooter className="border-t border-border p-2">
          <div className="px-2 py-1">
            <p className="text-xs text-muted-foreground">
              Keyboard: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd> for search
            </p>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
