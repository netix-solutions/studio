'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, ArrowLeft, Plus, Trash2, GripVertical, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { type SequenceStep } from '@/lib/types';

interface SequenceData {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  steps: SequenceStep[];
  isActive: boolean;
  enrollmentCount?: number;
  enrollmentsByStatus?: Record<string, number>;
}

export default function SequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const sequenceId = params.id as string;

  const [sequence, setSequence] = useState<SequenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [steps, setSteps] = useState<SequenceStep[]>([]);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/leads/sequences/${sequenceId}`);
      const data = await res.json();
      if (data.success) {
        setSequence(data.data);
        setSteps(data.data.steps || []);
      }
    } catch (err) {
      console.error('Error fetching sequence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSequence(); }, [sequenceId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/leads/sequences/${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Sequence Saved' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/leads/sequences/${sequenceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Sequence Deleted' });
        router.push('/leads/sequences');
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      order: prev.length,
      delayDays: prev.length === 0 ? 0 : 3,
      templateId: '',
      templateName: '',
      skipIfContacted: false,
    }]);
  };

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sequence) {
    return <p className="text-center py-12 text-muted-foreground">Sequence not found</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/leads/sequences')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{sequence.name}</h1>
            {sequence.description && <p className="text-sm text-muted-foreground">{sequence.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-red-600" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save Steps
          </Button>
        </div>
      </div>

      {/* Sequence Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <Badge variant={sequence.isActive ? 'default' : 'secondary'}>
                {sequence.isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Trigger:</span>{' '}
              {sequence.trigger === 'lead_created' ? 'Lead Created' : 'Manual'}
            </div>
            {sequence.enrollmentsByStatus && (
              <div>
                <span className="text-muted-foreground">Enrollments:</span>{' '}
                {Object.entries(sequence.enrollmentsByStatus).map(([status, count]) => (
                  <Badge key={status} variant="outline" className="ml-1">{status}: {count}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Steps</CardTitle>
          <CardDescription>Define the email steps and delays for this sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No steps yet. Add your first email step.</p>
            </div>
          ) : (
            steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Wait
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={step.delayDays}
                      onChange={(e) => updateStep(index, { delayDays: parseInt(e.target.value) || 0 })}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-muted-foreground">days, then send:</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Email Template ID</Label>
                    <Input
                      placeholder="template_id (from emailTemplates collection)"
                      value={step.templateId}
                      onChange={(e) => updateStep(index, { templateId: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Template Name (for display)</Label>
                    <Input
                      placeholder="e.g., Welcome Email"
                      value={step.templateName || ''}
                      onChange={(e) => updateStep(index, { templateName: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={step.skipIfContacted || false}
                        onCheckedChange={(v) => updateStep(index, { skipIfContacted: v })}
                      />
                      Skip if lead was contacted since enrollment
                    </label>
                    <Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => removeStep(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}

          <Button variant="outline" onClick={addStep} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Add Step
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sequence and cancel all active enrollments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Delete Sequence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
