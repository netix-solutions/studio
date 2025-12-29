'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import {
  collection,
  collectionGroup,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Mail,
  MessageSquare,
  Send,
  PhoneCall,
  Users,
  TrendingUp,
  Target,
  CheckCircle2,
  FileText,
  User,
  Eye,
  LogIn,
  Activity,
  UserPlus,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Unified event type for the activity feed
type EventType =
  | 'note'
  | 'email_sent'
  | 'email_received'
  | 'call'
  | 'meeting'
  | 'priority_change'
  | 'score_change'
  | 'conversion'
  | 'task_created'
  | 'task_completed'
  | 'assignment_change'
  | 'page_visit'
  | 'login'
  | 'sent_email_record'
  | 'lead_created'
  | 'subscription_event';

// Activity type icon and color mapping
const eventConfig: Record<EventType, { icon: any; bgColor: string; textColor: string; label: string }> = {
  note: { icon: MessageSquare, bgColor: 'bg-slate-100', textColor: 'text-slate-600', label: 'Note' },
  email_sent: { icon: Send, bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: 'Email Sent' },
  email_received: { icon: Mail, bgColor: 'bg-green-100', textColor: 'text-green-600', label: 'Email Received' },
  call: { icon: PhoneCall, bgColor: 'bg-amber-100', textColor: 'text-amber-600', label: 'Call' },
  meeting: { icon: Users, bgColor: 'bg-purple-100', textColor: 'text-purple-600', label: 'Meeting' },
  priority_change: { icon: Target, bgColor: 'bg-orange-100', textColor: 'text-orange-600', label: 'Priority Changed' },
  score_change: { icon: TrendingUp, bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', label: 'Score Updated' },
  conversion: { icon: CheckCircle2, bgColor: 'bg-green-100', textColor: 'text-green-600', label: 'Converted' },
  task_created: { icon: FileText, bgColor: 'bg-slate-100', textColor: 'text-slate-600', label: 'Task Created' },
  task_completed: { icon: CheckCircle2, bgColor: 'bg-green-100', textColor: 'text-green-600', label: 'Task Completed' },
  assignment_change: { icon: User, bgColor: 'bg-violet-100', textColor: 'text-violet-600', label: 'Assignment Changed' },
  page_visit: { icon: Eye, bgColor: 'bg-sky-100', textColor: 'text-sky-600', label: 'Page Visit' },
  login: { icon: LogIn, bgColor: 'bg-teal-100', textColor: 'text-teal-600', label: 'Login' },
  sent_email_record: { icon: Mail, bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: 'Email' },
  lead_created: { icon: UserPlus, bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: 'New Lead' },
  subscription_event: { icon: CreditCard, bgColor: 'bg-green-100', textColor: 'text-green-600', label: 'Subscription' },
};

// Unified activity item
interface UnifiedActivityItem {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  createdAt: Date;
  createdByName: string;
  // For linking to related entities
  leadId?: string;
  leadName?: string;
  customerId?: string;
  customerName?: string;
  // For expandable email content
  emailHtml?: string;
  emailSubject?: string;
  isEmail?: boolean;
  // Metadata
  metadata?: Record<string, any>;
}

interface LeadActivity {
  id: string;
  leadId?: string;
  type: string;
  title: string;
  description?: string;
  metadata?: {
    pageUrl?: string;
    pageTitle?: string;
    [key: string]: any;
  };
  createdBy: string;
  createdByName: string;
  createdAt: any;
}

interface SentEmail {
  id: string;
  subject: string;
  html: string;
  sentAt: any;
  recipientId: string;
  recipientEmail?: string;
  recipientName?: string;
}

export function RecentActivity({ className }: { className?: string }) {
  const { firestore } = useFirebase();
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);

  // Subscribe to all activities across leads using collection group
  useEffect(() => {
    if (!firestore) {
      setLoadingActivities(false);
      return;
    }

    const activitiesQuery = query(
      collectionGroup(firestore, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData: LeadActivity[] = snapshot.docs.map(doc => {
        // Extract leadId from the document path (leads/{leadId}/activities/{activityId})
        const pathParts = doc.ref.path.split('/');
        const leadId = pathParts[1]; // Index 1 is the leadId

        return {
          id: doc.id,
          leadId,
          ...doc.data(),
        } as LeadActivity;
      });
      setActivities(activitiesData);
      setLoadingActivities(false);
    }, (error) => {
      console.error('Error fetching activities:', error);
      setLoadingActivities(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Subscribe to sent emails
  useEffect(() => {
    if (!firestore) {
      setLoadingEmails(false);
      return;
    }

    const emailsQuery = query(
      collection(firestore, 'sent_emails'),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(emailsQuery, (snapshot) => {
      const emailsData: SentEmail[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as SentEmail));
      setEmails(emailsData);
      setLoadingEmails(false);
    }, (error) => {
      console.error('Error fetching emails:', error);
      setLoadingEmails(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Merge and sort all events
  const unifiedItems = useMemo(() => {
    const items: UnifiedActivityItem[] = [];

    // Add lead activities
    activities.forEach(activity => {
      const createdAt = activity.createdAt?.toDate
        ? activity.createdAt.toDate()
        : activity.createdAt
        ? new Date(activity.createdAt)
        : new Date();

      let title = activity.title;
      let description = activity.description;

      // Enhance title based on activity type
      if (activity.type === 'page_visit' && activity.metadata?.pageTitle) {
        title = `Visited: ${activity.metadata.pageTitle}`;
        description = activity.metadata.pageUrl;
      }

      items.push({
        id: `activity-${activity.id}`,
        type: activity.type as EventType,
        title,
        description,
        createdAt,
        createdByName: activity.createdByName || 'System',
        leadId: activity.leadId,
        metadata: activity.metadata,
      });
    });

    // Add sent emails
    emails.forEach(email => {
      const createdAt = email.sentAt?.toDate
        ? email.sentAt.toDate()
        : email.sentAt
        ? new Date(email.sentAt)
        : new Date();

      items.push({
        id: `email-${email.id}`,
        type: 'sent_email_record',
        title: `Email: ${email.subject}`,
        description: email.recipientName
          ? `To: ${email.recipientName}`
          : email.recipientEmail
          ? `To: ${email.recipientEmail}`
          : undefined,
        createdAt,
        createdByName: 'System',
        emailHtml: email.html,
        emailSubject: email.subject,
        isEmail: true,
        leadId: email.recipientId,
      });
    });

    // Sort by date (newest first) and limit to 50
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return items.slice(0, 50);
  }, [activities, emails]);

  const loading = loadingActivities || loadingEmails;

  // Group events by date for better organization
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: UnifiedActivityItem[] }[] = [];
    const dateMap = new Map<string, UnifiedActivityItem[]>();

    unifiedItems.forEach(item => {
      const dateKey = format(item.createdAt, 'yyyy-MM-dd');
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(item);
    });

    dateMap.forEach((items, date) => {
      groups.push({ date, items });
    });

    return groups;
  }, [unifiedItems]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    } else {
      return format(date, 'EEEE, MMMM d');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest 50 events across leads and customers
            </CardDescription>
          </div>
          {!loading && (
            <Badge variant="outline" className="text-xs">
              {unifiedItems.length} events
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : unifiedItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm">Events will appear here as they happen</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <Accordion type="single" collapsible className="space-y-4">
              {groupedByDate.map((group, groupIndex) => (
                <div key={group.date} className="space-y-2">
                  {/* Date header */}
                  <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {getDateLabel(group.date)}
                    </p>
                  </div>

                  {/* Events for this date */}
                  {group.items.map((item, index) => {
                    const config = eventConfig[item.type] || eventConfig.note;
                    const IconComponent = config.icon;

                    return (
                      <div key={item.id} className="flex gap-3">
                        {/* Icon */}
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center",
                            config.bgColor
                          )}>
                            <IconComponent className={cn("h-4 w-4", config.textColor)} />
                          </div>
                          {index < group.items.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-[calc(100%+0.5rem)] bg-border" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-3">
                          {item.isEmail ? (
                            <AccordionItem value={item.id} className="border-none">
                              <AccordionTrigger className="py-0 hover:no-underline">
                                <div className="flex flex-col items-start text-left w-full pr-4">
                                  <div className="flex items-center gap-2 w-full">
                                    <p className="font-medium text-sm truncate flex-1">{item.title}</p>
                                    <Badge variant="outline" className={cn("text-xs flex-shrink-0", config.bgColor, config.textColor)}>
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{format(item.createdAt, 'h:mm a')}</span>
                                    {item.description && (
                                      <>
                                        <span>·</span>
                                        <span className="truncate">{item.description}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-muted/50 overflow-hidden"
                                  dangerouslySetInnerHTML={{ __html: item.emailHtml || '' }}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate flex-1">{item.title}</p>
                                <Badge variant="outline" className={cn("text-xs flex-shrink-0", config.bgColor, config.textColor)}>
                                  {config.label}
                                </Badge>
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>{format(item.createdAt, 'h:mm a')}</span>
                                <span>·</span>
                                <span>{item.createdByName}</span>
                                {item.leadId && (
                                  <>
                                    <span>·</span>
                                    <Link
                                      href={`/leads?id=${item.leadId}`}
                                      className="text-primary hover:underline"
                                    >
                                      View Lead
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivity;
