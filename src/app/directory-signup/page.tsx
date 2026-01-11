'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { DirectoryPricingTiers } from '@/components/directory/DirectoryPricingTiers';
import { DirectoryListingForm } from '@/components/directory/DirectoryListingForm';
import { DirectoryListingPreview } from '@/components/directory/DirectoryListingPreview';
import { useToast } from '@/hooks/use-toast';
import { createCheckout } from '@/lib/stripe';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import type { BusinessCategory, DirectoryDraft } from '@/lib/types';

const STEPS = [
  { id: 1, name: 'Choose Plan', description: 'Select your listing tier' },
  { id: 2, name: 'Business Info', description: 'Tell us about your business' },
  { id: 3, name: 'Review & Purchase', description: 'Preview and complete payment' },
];

export default function DirectorySignupPage() {
  const router = useRouter();
  const { auth, firestore, storage, user } = useFirebase();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'featured' | 'premium'>('basic');
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listingData, setListingData] = useState<Partial<DirectoryDraft>>({
    businessName: '',
    contactEmail: '',
    contactName: '',
    phone: '',
    websiteUrl: '',
    description: '',
    category: 'other' as BusinessCategory,
    logoUrl: '',
  });

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      // Pre-fill with user data if available
      // This will be fetched from Firestore in a real implementation
    }
  }, [user]);

  const handleTierSelect = (tierId: string, tier: 'basic' | 'featured' | 'premium', priceId?: string) => {
    setSelectedTier(tier);
    if (priceId) {
      setSelectedPriceId(priceId);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedPriceId) {
      toast({
        title: 'Select a plan',
        description: 'Please select a pricing tier to continue',
        variant: 'destructive',
      });
      return;
    }

    if (currentStep === 2) {
      // Validate required fields
      if (!listingData.businessName || !listingData.contactEmail || !listingData.phone) {
        toast({
          title: 'Missing information',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePurchase = async () => {
    if (!auth || !firestore || !selectedPriceId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Create or sign in user
      let userId = user?.uid;
      
      if (!user) {
        // Create temporary password for new user
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            listingData.contactEmail!,
            tempPassword
          );
          userId = userCredential.user.uid;

          // Send password reset email so user can set their own password
          // This will be handled by Firebase automatically
          
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            // User exists, ask them to sign in
            toast({
              title: 'Account exists',
              description: 'An account with this email already exists. Please sign in.',
              variant: 'destructive',
            });
            setError('Please sign in with your existing account to continue');
            return;
          }
          throw authError;
        }
      }

      if (!userId) {
        throw new Error('Failed to create or get user ID');
      }

      // Step 2: Save draft listing data
      const draftRef = collection(firestore, 'directory_drafts');
      await addDoc(draftRef, {
        ...listingData,
        userId,
        selectedTier,
        selectedPriceId,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      });

      // Step 3: Create user document if new user
      if (!user) {
        const userRef = doc(firestore, 'users', userId);
        await setDoc(userRef, {
          email: listingData.contactEmail,
          displayName: listingData.contactName,
          businessName: listingData.businessName,
          phone: listingData.phone,
          createdAt: serverTimestamp(),
        });
      }

      // Step 4: Create Stripe checkout session
      const successUrl = `${window.location.origin}/directory-signup/success`;
      const cancelUrl = `${window.location.origin}/directory-signup?step=3`;

      await createCheckout(
        firestore,
        userId,
        listingData.contactEmail!,
        selectedPriceId,
        successUrl
      );

      // createCheckout redirects to Stripe, so if we get here something went wrong
      
    } catch (err: any) {
      console.error('Error initiating purchase:', err);
      setError(err.message || 'Failed to initiate purchase. Please try again.');
      toast({
        title: 'Purchase failed',
        description: err.message || 'Failed to initiate purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">List Your Business</h1>
          <p className="text-lg text-muted-foreground">
            Get discovered by thousands of local customers
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center flex-1"
              >
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <div className="text-sm font-medium">{step.name}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-200 mx-4">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: currentStep > step.id ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {/* Step 1: Choose Plan */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Listing Tier</h2>
              <DirectoryPricingTiers
                selectedTier={selectedTier}
                onSelectTier={(tierId, tier, priceId) => {
                  handleTierSelect(tierId, tier, priceId);
                  if (priceId) {
                    // Auto-advance after selection
                    setTimeout(() => handleNext(), 300);
                  }
                }}
              />
            </div>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>
                      Tell customers about your business
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DirectoryListingForm
                      listing={listingData}
                      onChange={(updated) => setListingData(updated)}
                      disabled={isProcessing}
                      showAdvancedOptions={true}
                    />
                  </CardContent>
                </Card>
              </div>
              <div>
                <div className="sticky top-4">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <DirectoryListingPreview listing={listingData} tier={selectedTier} />
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    This is how your listing will appear in the directory
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Purchase */}
          {currentStep === 3 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Review Your Listing</CardTitle>
                    <CardDescription>
                      Make sure everything looks good before purchasing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Selected Plan</h4>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-semibold capitalize">{selectedTier} Listing</div>
                          <div className="text-sm text-muted-foreground">Billed monthly</div>
                        </div>
                        <div className="text-2xl font-bold">
                          ${selectedTier === 'basic' ? '49' : selectedTier === 'featured' ? '99' : '149'}/mo
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Business Information</h4>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Business Name</dt>
                          <dd className="font-medium">{listingData.businessName}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Contact Email</dt>
                          <dd className="font-medium">{listingData.contactEmail}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Phone</dt>
                          <dd className="font-medium">{listingData.phone}</dd>
                        </div>
                        {listingData.websiteUrl && (
                          <div>
                            <dt className="text-muted-foreground">Website</dt>
                            <dd className="font-medium truncate">{listingData.websiteUrl}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <Alert>
                      <AlertDescription>
                        After payment, you'll receive an email with login credentials to manage your listing.
                        Your subscription will renew automatically each month.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
              <div>
                <div className="sticky top-4">
                  <h3 className="text-lg font-semibold mb-4">Final Preview</h3>
                  <DirectoryListingPreview listing={listingData} tier={selectedTier} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} disabled={isProcessing}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handlePurchase} disabled={isProcessing} size="lg">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Complete Purchase
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
