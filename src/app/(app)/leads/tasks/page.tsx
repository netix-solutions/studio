'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, ArrowLeft, Calendar, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskCreateDialog } from '@/components/leads/task-create-dialog';
import { TASK_TYPE_LABELS, type TaskType } from '@/lib/types';

interface TaskItem {
  id: string;
  leadId?: string;
  title: string;
  description?: string;
  status: string;
  type?: TaskType;
  dueAt?: any;
  completedAt?: any;
  assignedToName?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleToggle = async (task: TaskItem) => {
    setUpdatingId(task.id);
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          userId: user?.uid,
          userName: user?.displayName || user?.email || 'Unknown',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const getDueDate = (dueAt: any): Date | null => {
    if (!dueAt) return null;
    if (dueAt?.toDate) return dueAt.toDate();
    if (dueAt?._seconds) return new Date(dueAt._seconds * 1000);
    return new Date(dueAt);
  };

  const { overdue, dueToday, upcoming, completed } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);

    const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'canceled');
    const done = tasks.filter(t => t.status === 'completed');

    const overdue = active.filter(t => {
      const due = getDueDate(t.dueAt);
      return due && due < todayStart;
    });

    const dueToday = active.filter(t => {
      const due = getDueDate(t.dueAt);
      return due && due >= todayStart && due < tomorrowEnd;
    });

    const upcoming = active.filter(t => {
      const due = getDueDate(t.dueAt);
      return !due || due >= tomorrowEnd;
    });

    return { overdue, dueToday, upcoming, completed: done };
  }, [tasks]);

  const renderTask = (task: TaskItem) => {
    const dueDate = getDueDate(task.dueAt);

    return (
      <div key={task.id} className="flex items-start gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={() => handleToggle(task)}
          disabled={updatingId === task.id}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {task.type && (
              <Badge variant="outline" className="text-xs">{TASK_TYPE_LABELS[task.type]}</Badge>
            )}
            {dueDate && (
              <span className={cn('text-xs flex items-center gap-1',
                isPast(dueDate) && task.status !== 'completed' ? 'text-red-600' :
                isToday(dueDate) ? 'text-amber-600' : 'text-muted-foreground'
              )}>
                <Calendar className="h-3 w-3" />
                {format(dueDate, 'MMM d, yyyy')}
              </span>
            )}
            {task.assignedToName && (
              <span className="text-xs text-muted-foreground">{task.assignedToName}</span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
          )}
        </div>
        {task.leadId && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push(`/leads/${task.leadId}`)}>
            View Lead
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/leads')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Leads
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground text-sm">Manage follow-up tasks and reminders</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-1 h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{dueToday.length}</p>
                <p className="text-xs text-muted-foreground">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue ({overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">{overdue.map(renderTask)}</CardContent>
            </Card>
          )}

          {dueToday.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Due Today ({dueToday.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">{dueToday.map(renderTask)}</CardContent>
            </Card>
          )}

          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Upcoming ({upcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">{upcoming.map(renderTask)}</CardContent>
            </Card>
          )}

          {completed.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Completed ({completed.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCompleted(!showCompleted)}>
                  {showCompleted ? 'Hide' : 'Show'}
                </Button>
              </CardHeader>
              {showCompleted && (
                <CardContent className="pt-0">{completed.slice(0, 20).map(renderTask)}</CardContent>
              )}
            </Card>
          )}

          {tasks.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No tasks yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Create tasks to track follow-ups and reminders</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Create Task
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <TaskCreateDialog
        isOpen={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        userId={user?.uid || ''}
        userName={user?.displayName || user?.email || 'Unknown'}
        onCreated={fetchTasks}
      />
    </div>
  );
}
