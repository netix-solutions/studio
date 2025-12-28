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
  Megaphone,
  Handshake,
  Ticket,
  User,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  keywords?: string[];
  group: 'main' | 'quick';
}

// Simplified admin commands - just the essentials
const ADMIN_COMMANDS: CommandItem[] = [
  // Main pages
  { id: 'leads', label: 'Leads', icon: Handshake, href: '/leads', keywords: ['prospects', 'sales', 'pipeline'], group: 'main' },
  { id: 'customers', label: 'Customers', icon: Ticket, href: '/subscriptions', keywords: ['subscribers', 'subscriptions', 'billing'], group: 'main' },
  { id: 'advertisements', label: 'Advertisements', icon: Megaphone, href: '/advertisements', keywords: ['ads', 'list', 'all', 'approve'], group: 'main' },

  // Quick filters
  { id: 'action-required', label: 'Ads Needing Approval', icon: Megaphone, href: '/advertisements?status=action_required', keywords: ['action', 'pending', 'review', 'approve'], group: 'quick' },
  { id: 'live-ads', label: 'Live Ads', icon: Megaphone, href: '/advertisements?status=live', keywords: ['active', 'running'], group: 'quick' },
];

const USER_COMMANDS: CommandItem[] = [
  { id: 'account', label: 'My Account', icon: User, href: '/account', keywords: ['profile', 'settings'], group: 'main' },
  { id: 'pricing', label: 'Change Plan', icon: ShoppingBag, href: '/pricing', keywords: ['upgrade', 'subscription', 'billing'], group: 'main' },
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
    main: 'Go to',
    quick: 'Quick Filters',
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
