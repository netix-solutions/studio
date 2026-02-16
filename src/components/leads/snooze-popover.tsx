'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SnoozePopoverProps {
  leadId: string;
  userId: string;
  userName: string;
  trigger: React.ReactNode;
  onSnoozed?: () => void;
}

export function SnoozePopover({
  leadId,
  userId,
  userName,
  trigger,
  onSnoozed,
}: SnoozePopoverProps) {
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSnooze = async (daysOrDate: number | string) => {
    setIsSubmitting(true);
    try {
      let snoozeDate: Date;
      if (typeof daysOrDate === 'number') {
        snoozeDate = new Date();
        snoozeDate.setDate(snoozeDate.getDate() + daysOrDate);
      } else {
        snoozeDate = new Date(daysOrDate);
      }

      const res = await fetch(`/api/leads/${leadId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snoozeUntil: snoozeDate.toISOString(),
          userId,
          userName,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({ title: 'Lead Snoozed', description: `Follow-up scheduled for ${snoozeDate.toLocaleDateString()}` });
      setIsOpen(false);
      onSnoozed?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to snooze', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-56" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <p className="text-sm font-medium">Snooze Lead</p>
          <div className="space-y-1">
            <Button
              variant="ghost" size="sm" className="w-full justify-start text-sm"
              onClick={() => handleSnooze(1)} disabled={isSubmitting}
            >
              Tomorrow
            </Button>
            <Button
              variant="ghost" size="sm" className="w-full justify-start text-sm"
              onClick={() => handleSnooze(3)} disabled={isSubmitting}
            >
              In 3 Days
            </Button>
            <Button
              variant="ghost" size="sm" className="w-full justify-start text-sm"
              onClick={() => handleSnooze(7)} disabled={isSubmitting}
            >
              In 1 Week
            </Button>
          </div>
          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground mb-1">Custom Date</p>
            <div className="flex gap-1">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-sm h-8"
                min={new Date().toISOString().split('T')[0]}
              />
              <Button
                size="sm" className="h-8 px-2"
                onClick={() => customDate && handleSnooze(customDate)}
                disabled={isSubmitting || !customDate}
              >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
