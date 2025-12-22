
'use client';
import React, { useState, useEffect } from 'react';
import { LegalPageLayout } from "@/components/layout/legal-page-layout";
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface LegalDoc {
    title: string;
    content: string;
}

export default function TermsOfServicePage() {
    const { firestore } = useFirebase();
    const [document, setDocument] = useState<LegalDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!firestore) return;
        
        const docRef = doc(firestore, 'legalDocuments', 'terms-of-service');
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                setDocument(docSnap.data() as LegalDoc);
            } else {
                setError("Document not found.");
            }
        }).catch(err => {
            console.error(err);
            setError("Could not load the document.");
        }).finally(() => {
            setLoading(false);
        });

    }, [firestore]);

    return (
        <LegalPageLayout title={document?.title || "Terms of Service"}>
            {loading ? (
                 <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : error ? (
                <p className="text-destructive">{error}</p>
            ) : (
                <div 
                    className="prose prose-sm md:prose-base dark:prose-invert max-w-none" 
                    dangerouslySetInnerHTML={{ __html: document?.content || '' }} 
                />
            )}
        </LegalPageLayout>
    );
}
