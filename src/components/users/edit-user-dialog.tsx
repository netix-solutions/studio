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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { formatPhoneNumber, fixUrl } from '@/lib/utils';
import { AppUser } from '@/app/(app)/users/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  // User fields
  contactName: z.string().min(1, 'Contact name is required').max(100),
  role: z.enum(['user', 'admin']),
  
  // Ad details fields
  businessName: z.string().optional(),
  phone: z.string().optional(),
  adWebsiteUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  adText: z.string().optional(),
  adNotes: z.string().optional(),
});

type EditUserDialogProps = {
  user: AppUser;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function EditUserDialog({ user, isOpen, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactName: '',
      role: 'user',
      businessName: '',
      phone: '',
      adWebsiteUrl: '',
      adText: '',
      adNotes: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        contactName: user.contactName || '',
        role: user.role || 'user',
        businessName: user.businessName || '',
        phone: user.phone || '',
        adWebsiteUrl: user.adWebsiteUrl || '',
        adText: user.adText || '',
        adNotes: user.adNotes || '',
      });
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) return;

    setIsSubmitting(true);
    try {
      const userDocRef = doc(firestore, 'users', user.id);
      
      // Update user details in one go
      await setDoc(userDocRef, {
        contactName: values.contactName,
        businessName: values.businessName,
        phone: values.phone,
        adWebsiteUrl: values.adWebsiteUrl,
        adText: values.adText,
        adNotes: values.adNotes,
      }, { merge: true });

      // Update role separately
      const adminDocRef = doc(firestore, 'roles_admin', user.id);
      if (values.role === 'admin' && user.role !== 'admin') {
        await setDoc(adminDocRef, { uid: user.id });
      } else if (values.role === 'user' && user.role === 'admin') {
        await deleteDoc(adminDocRef);
      }

      toast({
        title: 'User Updated',
        description: `${values.contactName}'s profile has been updated.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user profile. Please check console for details.',
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
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update details for {user.email}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <h3 className="text-lg font-semibold">User Details</h3>
             <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator className="my-6" />

            <h3 className="text-lg font-semibold">Ad Information</h3>
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                        <Input placeholder="The Local Cafe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                        <Input
                            placeholder="(555) 123-4567"
                            {...field}
                            onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="adWebsiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Link URL</FormLabel>
                  <FormControl>
                    <Input
                        placeholder="https://example.com"
                        {...field}
                        onBlur={(e) => {
                            field.onBlur();
                            if (e.target.value) {
                                field.onChange(fixUrl(e.target.value));
                            }
                        }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Text / Slogan</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 'Serving Pasco County for 20 years!'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Notes / Special Offers</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 'Mention this ad for 10% off your first visit.'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    