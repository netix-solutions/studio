
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Loader2, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface SentEmail {
  id: string;
  subject: string;
  html: string;
  sentAt: any;
}

interface Recipient {
    id: string;
    email: string;
}

type EmailHistoryDialogProps = {
  recipient: Recipient;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  renderAsCard?: boolean;
};

function EmailHistoryContent({ recipient }: { recipient: Recipient }) {
    const { firestore } = useFirebase();
    const [history, setHistory] = useState<SentEmail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        setLoading(true);
        // Modified query: Removed orderBy to avoid needing a composite index.
        // Sorting will be handled on the client.
        const historyQuery = query(
            collection(firestore, 'sent_emails'),
            where('recipientId', '==', recipient.id)
        );

        const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
            const historyData: SentEmail[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SentEmail));
            
            // Sort the emails by date on the client side.
            historyData.sort((a, b) => {
                const dateA = a.sentAt?.toDate ? a.sentAt.toDate().getTime() : 0;
                const dateB = b.sentAt?.toDate ? b.sentAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
            
            setHistory(historyData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching email history: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, recipient.id]);

    return (
         <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Mail className="mx-auto h-12 w-12 mb-4" />
              <p>No emails have been sent to this recipient yet.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {history.map((email) => (
                <AccordionItem value={email.id} key={email.id}>
                  <AccordionTrigger>
                    <div className='flex justify-between items-center w-full pr-4'>
                        <span className='truncate'>{email.subject}</span>
                        <span className='text-xs text-muted-foreground font-normal flex items-center gap-2'>
                           <Calendar className='h-3 w-3'/>
                           {email.sentAt ? format(email.sentAt.toDate(), 'MMM d, yyyy, h:mm a') : 'Date N/A'}
                        </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-muted/50" 
                      dangerouslySetInnerHTML={{ __html: email.html }} 
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
    )
}


export function EmailHistoryDialog({ recipient, isOpen, onOpenChange, renderAsCard = false }: EmailHistoryDialogProps) {
  
  if (renderAsCard) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Email History</CardTitle>
                <CardDescription>A log of all emails sent to {recipient.email}.</CardDescription>
            </CardHeader>
            <CardContent>
                <EmailHistoryContent recipient={recipient} />
            </CardContent>
        </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email History</DialogTitle>
          <DialogDescription>
            A log of all emails sent to {recipient.email}.
          </DialogDescription>
        </DialogHeader>
        <EmailHistoryContent recipient={recipient} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
