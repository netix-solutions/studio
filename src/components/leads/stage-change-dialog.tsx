'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { LEAD_STAGES, LEAD_STAGE_LABELS, type LeadStage } from '@/lib/types';

interface StageChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage: LeadStage;
  onConfirm: (stage: LeadStage, note?: string, lostReason?: string) => Promise<void>;
  mode?: 'change' | 'lost';
}

const ALL_STAGES = Object.values(LEAD_STAGES);

export function StageChangeDialog({
  isOpen,
  onOpenChange,
  currentStage,
  onConfirm,
  mode = 'change',
}: StageChangeDialogProps) {
  const [selectedStage, setSelectedStage] = useState<LeadStage>(
    mode === 'lost' ? 'lost' : currentStage
  );
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(
        mode === 'lost' ? 'lost' : selectedStage,
        note || undefined,
        mode === 'lost' || selectedStage === 'lost' ? lostReason : undefined
      );
      setNote('');
      setLostReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showLostReason = mode === 'lost' || selectedStage === 'lost';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'lost' ? 'Mark Lead as Lost' : 'Change Lead Stage'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'lost'
              ? 'This lead will be marked as lost and removed from the active pipeline.'
              : `Current stage: ${LEAD_STAGE_LABELS[currentStage]}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode !== 'lost' && (
            <div className="space-y-2">
              <Label>New Stage</Label>
              <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as LeadStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.filter(s => s !== currentStage).map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {LEAD_STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showLostReason && (
            <div className="space-y-2">
              <Label>Reason for Loss</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_budget">No Budget</SelectItem>
                  <SelectItem value="chose_competitor">Chose Competitor</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="bad_timing">Bad Timing</SelectItem>
                  <SelectItem value="not_a_fit">Not a Fit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Add a note about this stage change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || (mode !== 'lost' && selectedStage === currentStage)}
            variant={showLostReason ? 'destructive' : 'default'}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLostReason ? 'Mark as Lost' : 'Change Stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
