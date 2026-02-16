'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { TASK_TYPE_LABELS, type TaskType } from '@/lib/types';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  type?: TaskType;
  dueAt?: any;
  completedAt?: any;
}

interface TaskListCardProps {
  leadId: string;
  userId: string;
  userName: string;
  onCreateTask: () => void;
}

export function TaskListCard({ leadId, userId, userName, onCreateTask }: TaskListCardProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?leadId=${leadId}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [leadId]);

  const handleToggleComplete = async (task: TaskItem) => {
    setUpdatingId(task.id);
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId, userName }),
      });

      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        ));
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'canceled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const getDueColor = (dueAt: any) => {
    if (!dueAt) return '';
    const dueDate = dueAt?.toDate?.() || (dueAt?._seconds ? new Date(dueAt._seconds * 1000) : new Date(dueAt));
    const now = new Date();
    if (dueDate < now) return 'text-red-600';
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (dueDate < tomorrow) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const formatDue = (dueAt: any) => {
    if (!dueAt) return null;
    const dueDate = dueAt?.toDate?.() || (dueAt?._seconds ? new Date(dueAt._seconds * 1000) : new Date(dueAt));
    return format(dueDate, 'MMM d');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tasks</CardTitle>
        <Button size="sm" variant="outline" onClick={onCreateTask}>
          <Plus className="mr-1 h-3 w-3" /> Add Task
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
        ) : (
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div key={task.id} className="flex items-start gap-2 py-1.5">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleToggleComplete(task)}
                  disabled={updatingId === task.id}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.type && (
                      <span className="text-xs text-muted-foreground">
                        {TASK_TYPE_LABELS[task.type]}
                      </span>
                    )}
                    {task.dueAt && (
                      <span className={cn('text-xs flex items-center gap-0.5', getDueColor(task.dueAt))}>
                        <Calendar className="h-3 w-3" />
                        {formatDue(task.dueAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {completedTasks.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Completed ({completedTasks.length})</p>
                {completedTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-start gap-2 py-1">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => handleToggleComplete(task)}
                      disabled={updatingId === task.id}
                      className="mt-0.5"
                    />
                    <p className="text-sm text-muted-foreground line-through">{task.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
