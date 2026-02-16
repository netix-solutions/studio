'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuickNotePopoverProps {
  leadId: string;
  userId: string;
  userName: string;
  trigger: React.ReactNode;
  onNoteAdded?: () => void;
}

export function QuickNotePopover({
  leadId,
  userId,
  userName,
  trigger,
  onNoteAdded,
}: QuickNotePopoverProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/quick-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim(), userId, userName }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({ title: 'Note Added' });
      setNote('');
      setIsOpen(false);
      onNoteAdded?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add note', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <p className="text-sm font-medium">Quick Note</p>
          <Textarea
            placeholder="Add a quick note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !note.trim()}>
              {isSubmitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <MessageSquare className="mr-1 h-3 w-3" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
