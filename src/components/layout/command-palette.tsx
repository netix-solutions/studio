'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Kanban,
  Megaphone,
  Handshake,
  Ticket,
  Users,
  Mail,
  FileText,
  User,
  ShoppingBag,
  Search,
  ArrowRight,
  UserCog,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  keywords?: string[];
  group: 'navigation' | 'workflow' | 'crm' | 'admin';
}

const ADMIN_COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', keywords: ['home', 'overview', 'stats'], group: 'navigation' },

  // Workflow
  { id: 'pipeline', label: 'Ad Pipeline', icon: Kanban, href: '/pipeline', keywords: ['kanban', 'workflow', 'stages', 'board'], group: 'workflow' },
  { id: 'advertisements', label: 'All Advertisements', icon: Megaphone, href: '/advertisements', keywords: ['ads', 'list', 'all'], group: 'workflow' },
  { id: 'customer-workflow', label: 'Customer Workflow', icon: UserCog, href: '/customer-workflow', keywords: ['manage', 'customer', 'override', 'manual', 'onboarding'], group: 'workflow' },
  { id: 'action-required', label: 'Ads Requiring Action', icon: Megaphone, href: '/advertisements?status=action_required', keywords: ['action', 'pending', 'review'], group: 'workflow' },
  { id: 'live-ads', label: 'Live Ads', icon: Megaphone, href: '/advertisements?status=live', keywords: ['active', 'running'], group: 'workflow' },

  // CRM
  { id: 'leads', label: 'Leads', icon: Handshake, href: '/leads', keywords: ['prospects', 'sales', 'pipeline'], group: 'crm' },
  { id: 'customers', label: 'Customers', icon: Ticket, href: '/subscriptions', keywords: ['subscribers', 'subscriptions', 'billing'], group: 'crm' },

  // Admin
  { id: 'users', label: 'User Management', icon: Users, href: '/users', keywords: ['accounts', 'people'], group: 'admin' },
  { id: 'emails', label: 'Email Templates', icon: Mail, href: '/automated-emails', keywords: ['templates', 'automation'], group: 'admin' },
  { id: 'legal', label: 'Legal Documents', icon: FileText, href: '/legal', keywords: ['terms', 'privacy', 'policy'], group: 'admin' },
];

const USER_COMMANDS: CommandItem[] = [
  { id: 'account', label: 'My Account', icon: User, href: '/account', keywords: ['profile', 'settings'], group: 'navigation' },
  { id: 'pricing', label: 'Change Plan', icon: ShoppingBag, href: '/pricing', keywords: ['upgrade', 'subscription', 'billing'], group: 'navigation' },
];

interface CommandPaletteProps {
  isAdmin: boolean;
}

export function CommandPalette({ isAdmin }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const commands = isAdmin ? ADMIN_COMMANDS : USER_COMMANDS;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const groupLabels: Record<string, string> = {
    navigation: 'Navigation',
    workflow: 'Ad Workflow',
    crm: 'CRM',
    admin: 'Administration',
  };

  const groupedCommands = commands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(groupedCommands).map(([group, items], index) => (
          <div key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={groupLabels[group]}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
