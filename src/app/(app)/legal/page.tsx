
'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { collection, doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, Save, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  lastUpdated: any;
}

const defaultDocuments: Omit<LegalDocument, 'lastUpdated'>[] = [
  {
    id: 'terms-of-service',
    title: 'Terms of Service',
    content: `<h2>1. Agreement to Terms</h2><p>These Terms of Service (Terms) govern your access to and use of the Community-Websites.com websites, dashboards, and related services (the Service), operated by Community-Websites.com (Company, we, us, our). By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>...`
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    content: `<h2>1. Overview</h2><p>This Privacy Policy explains how Community-Websites.com (Company, we, us, our) collects, uses, shares, and protects information when you use our websites, dashboards, and services (the Service).</p>...`
  }
];

export default function LegalDocsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!firestore) {
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }

    const docsQuery = collection(firestore, 'legalDocuments');
    const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalDocument));
      setDocuments(docsData);
      setLoading(false);
    }, (err) => {
      setError("You do not have permission to view this data. Please contact an administrator.");
      setLoading(false);
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: '/legalDocuments', operation: 'list' }));
    });

    return () => unsubscribe();
  }, [firestore]);
  
  const handleSeedDocuments = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
        for (const docData of defaultDocuments) {
            const docRef = doc(firestore, 'legalDocuments', docData.id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                await setDoc(docRef, {
                    ...docData,
                    lastUpdated: serverTimestamp()
                });
            }
        }
        toast({ title: 'Success', description: 'Default legal documents have been seeded.' });
    } catch (e) {
        toast({ title: 'Error', description: 'Could not seed documents.', variant: 'destructive' });
    } finally {
        setIsSeeding(false);
    }
  }

  const handleSave = async () => {
    if (!firestore || !editingDoc) return;
    setIsSaving(true);
    try {
      const docRef = doc(firestore, 'legalDocuments', editingDoc.id);
      await updateDoc(docRef, {
        content: editingDoc.content,
        lastUpdated: serverTimestamp()
      });
      toast({ title: 'Saved!', description: `${editingDoc.title} has been updated.` });
      setEditingDoc(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/legalDocuments/${editingDoc.id}`, operation: 'update' }));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (editingDoc) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Editing: {editingDoc.title}</CardTitle>
                <CardDescription>Paste your HTML content below. The page will be updated in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
                <RichTextEditor 
                    content={editingDoc.content}
                    onChange={(newContent) => setEditingDoc({...editingDoc, content: newContent})}
                />
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingDoc(null)} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                </Button>
            </CardFooter>
        </Card>
     )
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Legal Documents</CardTitle>
                <CardDescription>Manage the content for your Terms of Service and Privacy Policy pages.</CardDescription>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="mb-4 text-muted-foreground">No legal documents found.</p>
                        <Button onClick={handleSeedDocuments} disabled={isSeeding}>
                            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Seed Default Documents
                        </Button>
                    </div>
                ) : (
                     <div className="grid gap-4 md:grid-cols-2">
                        {documents.map((doc) => (
                            <Card key={doc.id}>
                                <CardHeader>
                                    <CardTitle>{doc.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Last updated: {doc.lastUpdated ? new Date(doc.lastUpdated.seconds * 1000).toLocaleString() : 'N/A'}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={() => setEditingDoc(doc)}>Edit Content</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

    