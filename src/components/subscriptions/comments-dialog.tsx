
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const formSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty.').max(2000, 'Comment is too long.'),
});

interface Subscription {
    id: string;
    customerId: string;
}

interface Comment {
    id: string;
    text: string;
    authorName: string;
    createdAt: any;
}

type CommentsDialogProps = {
  subscription: Subscription;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function CommentsDialog({ subscription, isOpen, onOpenChange }: CommentsDialogProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: '',
    },
  });

  useEffect(() => {
    if (!firestore || !subscription || !isOpen) return;

    setLoadingComments(true);
    const commentsRef = collection(firestore, 'customers', subscription.customerId, 'subscriptions', subscription.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const commentsData: Comment[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        setComments(commentsData);
        setLoadingComments(false);
    }, (error) => {
        console.error("Error fetching comments: ", error);
        toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
        setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [firestore, subscription, isOpen, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user || !subscription) return;

    setIsSubmitting(true);
    try {
      const commentsRef = collection(firestore, 'customers', subscription.customerId, 'subscriptions', subscription.id, 'comments');
      await addDoc(commentsRef, {
        text: values.text,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        createdAt: serverTimestamp(),
      });

      form.reset();
      toast({
        title: 'Comment Added',
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Subscription Comments</DialogTitle>
          <DialogDescription>
            Notes and history for this subscription.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6 max-h-[50vh] overflow-y-auto pr-6">
            {loadingComments ? (
                <div className="flex justify-center items-center h-24">
                    <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                    <p>No comments yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="flex-grow bg-muted p-3 rounded-lg">
                                <p className="text-sm">{comment.text}</p>
                                <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                    <span>&mdash; {comment.authorName}</span>
                                     <span>
                                        {comment.createdAt?.toDate ? 
                                            formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) :
                                            'just now'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-6">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add a new comment</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 'Customer requested an ad update...'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Comment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    