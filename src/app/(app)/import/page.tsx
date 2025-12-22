
'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Info, CheckCircle, FileUp, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';

const importSchema = z.object({
  customerFile: z.any().refine(file => file?.length > 0, 'A CSV file is required.'),
});

type ImportFormData = z.infer<typeof importSchema>;

interface StripeCustomer {
    'Customer ID': string;
    'Email': string;
    'Name': string;
    'Created (UTC)': string;
}

interface ImportResult {
    totalRows: number;
    created: number;
    skipped: number;
    errors: number;
    errorDetails: string[];
}

export default function ImportPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const form = useForm<ImportFormData>({
        resolver: zodResolver(importSchema),
    });

    const handleImport = async (data: ImportFormData) => {
        if (!firestore) {
            toast({ title: 'Error', description: 'Firestore is not available.', variant: 'destructive' });
            return;
        }

        setIsImporting(true);
        setImportProgress(0);
        setImportResult(null);

        const file = data.customerFile[0];
        let rowCount = 0;
        const results: ImportResult = { totalRows: 0, created: 0, skipped: 0, errors: 0, errorDetails: [] };

        Papa.parse<StripeCustomer>(file, {
            header: true,
            skipEmptyLines: true,
            step: async (row, parser) => {
                rowCount++;
                const customer = row.data;
                
                if (!customer['Email'] || !customer['Customer ID']) {
                    results.skipped++;
                    results.errorDetails.push(`Row ${rowCount}: Skipped due to missing Email or Customer ID.`);
                    return;
                }
                
                // Pause parsing to perform async operation
                parser.pause();

                try {
                    // A batch can handle up to 500 operations
                    const batch = writeBatch(firestore);

                    // We need a Firebase Auth UID for the /users and /customers collections.
                    // Since these users don't exist yet, we'll use a placeholder strategy.
                    // For a real migration, you'd use the Admin SDK to create auth users.
                    // Here, we'll use the Stripe Customer ID as a stand-in UID, which is NOT a real user.
                    // This is a limitation of client-side operations.
                    const pseudoUid = customer['Customer ID'];

                    // Create user document
                    const userRef = doc(firestore, 'users', pseudoUid);
                    batch.set(userRef, {
                        id: pseudoUid,
                        email: customer.Email,
                        contactName: customer.Name || customer.Email.split('@')[0],
                        stripeId: customer['Customer ID'],
                        createdAt: new Date(customer['Created (UTC)'])
                    }, { merge: true });

                    // Create customer document
                    const customerRef = doc(firestore, 'customers', pseudoUid);
                    batch.set(customerRef, {
                        email: customer.Email,
                        name: customer.Name,
                        stripeId: customer['Customer ID'],
                    }, { merge: true });

                    await batch.commit();
                    results.created++;

                } catch (error: any) {
                    results.errors++;
                    results.errorDetails.push(`Row ${rowCount} (${customer.Email}): ${error.message}`);
                } finally {
                    setImportProgress((rowCount / (results.totalRows || rowCount)) * 100);
                    parser.resume();
                }
            },
            complete: (res) => {
                results.totalRows = res.meta.cursor;
                setIsImporting(false);
                setImportResult(results);
                 toast({
                    title: 'Import Complete',
                    description: `Processed ${results.totalRows} rows. See results below.`,
                });
            },
            error: (err) => {
                console.error("CSV parsing error:", err);
                toast({ title: 'Parsing Error', description: 'Could not read the CSV file. Please check the format.', variant: 'destructive' });
                setIsImporting(false);
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Import Stripe Customers</CardTitle>
                    <CardDescription>
                        Import your existing customers from a Stripe CSV export to create user profiles and customer records in this application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <form onSubmit={form.handleSubmit(handleImport)} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="customerFile">Stripe Customers CSV File</Label>
                                    <Controller
                                        name="customerFile"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Input 
                                                id="customerFile" 
                                                type="file" 
                                                accept=".csv"
                                                onChange={(e) => field.onChange(e.target.files)}
                                            />
                                        )}
                                    />
                                    {form.formState.errors.customerFile && <p className="text-sm text-destructive mt-1">{form.formState.errors.customerFile.message?.toString()}</p>}
                                </div>
                                <Button type="submit" disabled={isImporting}>
                                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileUp className="mr-2 h-4 w-4" />}
                                    {isImporting ? 'Importing...' : 'Start Import'}
                                </Button>
                            </form>

                            {isImporting && (
                                <div className="mt-6 space-y-2">
                                    <Label>Import Progress</Label>
                                    <Progress value={importProgress} />
                                    <p className="text-sm text-muted-foreground">{Math.round(importProgress)}% complete</p>
                                </div>
                            )}

                        </div>
                        <div>
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>How to Export from Stripe</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-2 mt-2 text-sm">
                                        <li>Go to the <a href="https://dashboard.stripe.com/customers" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Customers</a> section in your Stripe Dashboard.</li>
                                        <li>Click the "Export" button on the top right.</li>
                                        <li>Under "Columns", select "Custom" and ensure you include at least: <strong>Customer ID, Email, Name, and Created (UTC)</strong>.</li>
                                        <li>Download the CSV file and upload it here.</li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                             <Alert variant="destructive" className="mt-4">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Important Limitation</AlertTitle>
                                <AlertDescription>
                                   This tool creates user profiles in your database but **cannot** create Firebase Authentication accounts for them. Imported users will not be able to log in until they use the "Forgot Password" flow to set a password for their account.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                </CardContent>
            </Card>

             {importResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Import Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground">Total Rows</div>
                                <div className="text-2xl font-bold">{importResult.totalRows}</div>
                            </div>
                             <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                                <div className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2"><CheckCircle className="h-4 w-4"/> Created</div>
                                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{importResult.created}</div>
                            </div>
                             <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">Skipped</div>
                                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{importResult.skipped}</div>
                            </div>
                              <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                                <div className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2"><XCircle className="h-4 w-4"/> Errors</div>
                                <div className="text-2xl font-bold text-red-900 dark:text-red-100">{importResult.errors}</div>
                            </div>
                        </div>

                        {importResult.errorDetails.length > 0 && (
                            <div>
                                <h4 className="font-semibold">Error & Skipped Row Details</h4>
                                <div className="mt-2 text-xs font-mono bg-muted rounded-md p-4 max-h-60 overflow-auto">
                                    {importResult.errorDetails.join('\n')}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
             )}
        </div>
    );
}

