'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Activity, ACTIVITY_TYPES } from '@/lib/types';

// Activity type icon mapping
const activityIcons: Record<string, any> = {
  note: MessageSquare,
  email_sent: Send,
  email_received: Mail,
  call: PhoneCall,
  meeting: Users,
  stage_change: TrendingUp,
  priority_change: Target,
  score_change: TrendingUp,
  conversion: CheckCircle2,
  task_created: FileText,
  task_completed: CheckCircle2,
  assignment_change: User,
  page_visit: Eye,
  login: LogIn,
  // Special type for sent emails from the sent_emails collection
  sent_email_record: Mail,
};

// Unified activity item that can represent either an activity or an email
interface UnifiedActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: Date;
  createdByName: string;
  // For emails
  emailHtml?: string;
  emailSubject?: string;
  // Original data reference
  isEmail?: boolean;
}

interface SentEmail {
  id: string;
  subject: string;
  html: string;
  sentAt: any;
  recipientId: string;
}

interface CustomerActivityProps {
  // Either leadId for leads or recipientId for customers
  leadId?: string;
  recipientId?: string;
  recipientEmail?: string;
  className?: string;
}

export function CustomerActivity({
  leadId,
  recipientId,
  recipientEmail,
  className,
}: CustomerActivityProps) {
  const { firestore } = useFirebase();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);

  // Subscribe to activities (only if leadId is provided)
  useEffect(() => {
    if (!firestore || !leadId) {
      setLoadingActivities(false);
      return;
    }

    const activitiesQuery = query(
      collection(firestore, 'leads', leadId, 'activities'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData: Activity[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Activity));
      setActivities(activitiesData);
      setLoadingActivities(false);
    }, (error) => {
      console.error('Error fetching activities:', error);
      setLoadingActivities(false);
    });

    return () => unsubscribe();
  }, [firestore, leadId]);

  // Subscribe to sent emails
  useEffect(() => {
    // Use recipientId if provided, otherwise use leadId
    const emailRecipientId = recipientId || leadId;

    if (!firestore || !emailRecipientId) {
      setLoadingEmails(false);
      return;
    }

    const emailsQuery = query(
      collection(firestore, 'sent_emails'),
      where('recipientId', '==', emailRecipientId)
    );

    const unsubscribe = onSnapshot(emailsQuery, (snapshot) => {
      const emailsData: SentEmail[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as SentEmail));

      // Sort emails by date (newest first)
      emailsData.sort((a, b) => {
        const dateA = a.sentAt?.toDate ? a.sentAt.toDate().getTime() : 0;
        const dateB = b.sentAt?.toDate ? b.sentAt.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setEmails(emailsData);
      setLoadingEmails(false);
    }, (error) => {
      console.error('Error fetching emails:', error);
      setLoadingEmails(false);
    });

    return () => unsubscribe();
  }, [firestore, leadId, recipientId]);

  // Merge and sort activities and emails
  const unifiedItems = useMemo(() => {
    const items: UnifiedActivityItem[] = [];

    // Add activities
    activities.forEach(activity => {
      const createdAt = activity.createdAt?.toDate
        ? activity.createdAt.toDate()
        : activity.createdAt
        ? new Date(activity.createdAt)
        : new Date();

      items.push({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        createdAt,
        createdByName: activity.createdByName,
        isEmail: false,
      });
    });

    // Add emails as unified items
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
        description: undefined,
        createdAt,
        createdByName: 'System',
        emailHtml: email.html,
        emailSubject: email.subject,
        isEmail: true,
      });
    });

    // Sort by date (newest first)
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return items;
  }, [activities, emails]);

  const loading = loadingActivities || loadingEmails;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Complete history of interactions, emails, and visits
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : unifiedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity recorded yet</p>
            <p className="text-sm">Add a note or send an email to get started</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <Accordion type="single" collapsible className="space-y-2">
              {unifiedItems.map((item, index) => {
                const IconComponent = activityIcons[item.type] || MessageSquare;
                const isEmail = item.isEmail;

                return (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        isEmail ? "bg-blue-100" : "bg-muted"
                      )}>
                        <IconComponent className={cn(
                          "h-4 w-4",
                          isEmail ? "text-blue-600" : "text-muted-foreground"
                        )} />
                      </div>
                      {index < unifiedItems.length - 1 && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      {isEmail ? (
                        // Email item with expandable content
                        <AccordionItem value={item.id} className="border-none">
                          <AccordionTrigger className="py-0 hover:no-underline">
                            <div className="flex flex-col items-start text-left w-full pr-4">
                              <div className="flex items-center justify-between w-full">
                                <p className="font-medium truncate">{item.title}</p>
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                  {format(item.createdAt, 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                by {item.createdByName}
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2">
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-muted/50"
                              dangerouslySetInnerHTML={{ __html: item.emailHtml || '' }}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      ) : (
                        // Regular activity item
                        <>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(item.createdAt, 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            by {item.createdByName}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
