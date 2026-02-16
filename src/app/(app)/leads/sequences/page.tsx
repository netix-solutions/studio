'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, ArrowLeft, Mail, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LEAD_STAGE_LABELS, type LeadStage, type SequenceTrigger } from '@/lib/types';

interface Sequence {
  id: string;
  name: string;
  description?: string;
  trigger: SequenceTrigger;
  triggerStage?: LeadStage;
  steps: any[];
  isActive: boolean;
  enrollmentCount?: number;
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState<SequenceTrigger>('manual');
  const [newTriggerStage, setNewTriggerStage] = useState<LeadStage>('contacted');
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const fetchSequences = async () => {
    try {
      const res = await fetch('/api/leads/sequences');
      const data = await res.json();
      if (data.success) setSequences(data.data);
    } catch (err) {
      console.error('Error fetching sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSequences(); }, []);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/leads/sequences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setSequences(prev => prev.map(s => s.id === id ? { ...s, isActive: !isActive } : s));
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update sequence', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/leads/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          trigger: newTrigger,
          triggerStage: newTrigger === 'stage_enter' ? newTriggerStage : undefined,
          steps: [],
          userId: user?.uid,
          userName: user?.displayName || user?.email || 'Unknown',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Sequence Created' });
        setShowCreateDialog(false);
        setNewName('');
        setNewDescription('');
        router.push(`/leads/sequences/${data.data.id}`);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create sequence', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const triggerLabels: Record<SequenceTrigger, string> = {
    stage_enter: 'Stage Enter',
    lead_created: 'Lead Created',
    manual: 'Manual',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/leads')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Leads
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Sequences</h1>
            <p className="text-muted-foreground text-sm">Automated follow-up email sequences</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-1 h-4 w-4" /> New Sequence
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No sequences yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first automated follow-up sequence</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map(seq => (
            <Card key={seq.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/leads/sequences/${seq.id}`)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{seq.name}</h3>
                    <Badge variant={seq.isActive ? 'default' : 'secondary'}>
                      {seq.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  {seq.description && (
                    <p className="text-sm text-muted-foreground mt-1">{seq.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Trigger: {triggerLabels[seq.trigger]}{seq.triggerStage ? ` (${LEAD_STAGE_LABELS[seq.triggerStage]})` : ''}</span>
                    <span><Mail className="inline h-3 w-3 mr-1" />{seq.steps?.length || 0} steps</span>
                    <span>{seq.enrollmentCount || 0} enrolled</span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={seq.isActive}
                    onCheckedChange={() => handleToggleActive(seq.id, seq.isActive)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Sequence Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sequence</DialogTitle>
            <DialogDescription>Set up a new automated follow-up sequence</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g., New Lead Welcome" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea placeholder="What does this sequence do?" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={newTrigger} onValueChange={(v) => setNewTrigger(v as SequenceTrigger)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Enrollment</SelectItem>
                  <SelectItem value="lead_created">Lead Created</SelectItem>
                  <SelectItem value="stage_enter">Stage Enter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newTrigger === 'stage_enter' && (
              <div className="space-y-2">
                <Label>Trigger Stage</Label>
                <Select value={newTriggerStage} onValueChange={(v) => setNewTriggerStage(v as LeadStage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STAGE_LABELS).filter(([k]) => k !== 'won' && k !== 'lost').map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Configure Steps
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
