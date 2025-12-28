'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useUser, useFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit as firestoreLimit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Info, Palette, History, CheckCircle, Send, Sparkles, HelpCircle, X, Smartphone, Monitor, Mail, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AD_DIMENSIONS } from '@/lib/types';
import type { DesignElement } from '@/components/ad-designer';
import {
  saveDesignVersion,
  getLatestVersion,
  loadVersionElements,
  updateAdWithVersion,
  type AdDraftVersion,
} from '@/lib/workflow/ad-draft-versions';

// Helper to detect mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  // Check for mobile user agents
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  // Also check screen width
  const isSmallScreen = window.innerWidth < 768;
  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
}

// Dynamically import AdDesigner to avoid SSR issues with Konva
const AdDesigner = dynamic(
  () => import('@/components/ad-designer/AdDesigner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

interface SavedDesign {
  elements: DesignElement[];
  backgroundColor: string;
  savedAt: any;
}

export default function DesignAdPage() {
  const { user, isUserLoading: userLoading } = useUser();
  const { firestore, storage } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Check for admin mode (userId param indicates admin editing customer's design)
  const targetUserId = searchParams.get('userId');
  const adId = searchParams.get('adId');
  const isAdminMode = !!targetUserId && !!adId;
  const effectiveUserId = targetUserId || user?.uid;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [initialElements, setInitialElements] = useState<DesignElement[]>([]);
  const [initialBackgroundColor, setInitialBackgroundColor] = useState('#FFFFFF');
  const [userData, setUserData] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<AdDraftVersion | null>(null);
  const [advertisementId, setAdvertisementId] = useState<string | null>(adId);
  const [hasSavedDesign, setHasSavedDesign] = useState(false);
  const [showHelpOffer, setShowHelpOffer] = useState(true);
  const [isRequestingDesign, setIsRequestingDesign] = useState(false);

  // Mobile detection state
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [mobileWarningDismissed, setMobileWarningDismissed] = useState(false);
  const [emailForLink, setEmailForLink] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Check for mobile device on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !mobileWarningDismissed) {
      const isMobile = isMobileDevice();
      if (isMobile) {
        setShowMobileWarning(true);
      }
    }
  }, [mobileWarningDismissed]);

  // Handle sending email with desktop link
  const handleSendDesktopLink = async () => {
    if (!emailForLink || !emailForLink.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      // Build the current URL for the desktop link
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

      const response = await fetch('/api/send-desktop-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailForLink,
          designUrl: currentUrl,
          userName: userData?.contactName || userData?.firstName || 'there',
          businessName: userData?.businessName || '',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }

      setEmailSent(true);
      toast({
        title: 'Email Sent!',
        description: `We've sent a link to ${emailForLink}. Check your inbox!`,
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Failed to Send Email',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Check for active subscription and load saved design
  useEffect(() => {
    const checkSubscriptionAndLoadDesign = async () => {
      if (!effectiveUserId || !firestore) {
        setIsLoading(false);
        return;
      }

      try {
        // In admin mode, skip subscription check (admin can edit any ad)
        if (!isAdminMode) {
          // Check for active subscriptions
          const subsRef = collection(firestore, 'customers', effectiveUserId, 'subscriptions');
          const subsSnapshot = await getDocs(subsRef);
          const activeSubs = subsSnapshot.docs.filter(doc =>
            doc.data().status === 'active' || doc.data().status === 'trialing'
          );
          setHasActiveSubscription(activeSubs.length > 0);
        } else {
          setHasActiveSubscription(true); // Admin mode always has access
        }

        // Load user data
        const userDocRef = doc(firestore, 'users', effectiveUserId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Find the advertisement if not provided
        let adIdToUse = advertisementId;
        let hasExistingAd = false;
        if (!adIdToUse) {
          const adsRef = collection(firestore, 'users', effectiveUserId, 'advertisements');
          const adsQuery = query(adsRef, orderBy('createdAt', 'desc'), firestoreLimit(1));
          const adsSnapshot = await getDocs(adsQuery);
          if (!adsSnapshot.empty) {
            adIdToUse = adsSnapshot.docs[0].id;
            setAdvertisementId(adIdToUse);
            hasExistingAd = true;
          }
        } else {
          hasExistingAd = true;
        }

        // Try to load from versions subcollection first
        if (adIdToUse) {
          try {
            const latestVersion = await getLatestVersion(firestore, effectiveUserId, adIdToUse);
            if (latestVersion) {
              setCurrentVersion(latestVersion);
              setHasSavedDesign(true); // Existing design available
              const elementsWithImages = await loadVersionElements(latestVersion);
              setInitialElements(elementsWithImages as DesignElement[]);
              setInitialBackgroundColor(latestVersion.backgroundColor || '#FFFFFF');
              setIsLoading(false);
              return;
            }
          } catch (versionError) {
            // If there's a permission error loading versions for an existing ad, log it
            // but continue to try legacy design or create defaults
            console.warn('Could not load design versions, trying legacy design:', versionError);
          }
        }

        // Fall back to legacy design in user document
        if (userDoc.exists()) {
          const savedDesign = userDoc.data().adDesign as SavedDesign | undefined;
          if (savedDesign) {
            // Need to reload images for ImageElements
            const elementsWithImages = await Promise.all(
              savedDesign.elements.map(async (element) => {
                if (element.type === 'image' && 'src' in element) {
                  return new Promise<DesignElement>((resolve) => {
                    const img = new window.Image();
                    img.crossOrigin = 'anonymous';
                    img.src = element.src as string;
                    img.onload = () => {
                      resolve({
                        ...element,
                        imageObj: img,
                      } as DesignElement);
                    };
                    img.onerror = () => {
                      resolve(element);
                    };
                  });
                }
                return element;
              })
            );
            setInitialElements(elementsWithImages);
            setInitialBackgroundColor(savedDesign.backgroundColor || '#FFFFFF');
          } else {
            // Create initial elements from user's business info
            const businessName = userDoc.data().businessName;
            const adText = userDoc.data().adText;
            const designPrefs = userDoc.data().designPreferences || {};

            const defaultElements: DesignElement[] = [];

            if (businessName) {
              defaultElements.push({
                id: 'title-1',
                type: 'text',
                x: 220,
                y: 40,
                text: businessName,
                fontSize: 32,
                fontFamily: designPrefs.fontStyle === 'elegant' ? 'Playfair Display' :
                           designPrefs.fontStyle === 'bold' ? 'Arial Black' :
                           designPrefs.fontStyle === 'classic' ? 'Georgia' : 'Inter',
                fontStyle: 'bold',
                fill: designPrefs.primaryColor || '#1F2937',
                align: 'left',
                width: 360,
              });
            }

            if (adText) {
              defaultElements.push({
                id: 'tagline-1',
                type: 'text',
                x: 220,
                y: 90,
                text: adText,
                fontSize: 18,
                fontFamily: 'Inter',
                fontStyle: 'normal',
                fill: designPrefs.textColor || '#4B5563',
                align: 'left',
                width: 360,
              });
            }

            // Add call to action
            defaultElements.push({
              id: 'cta-1',
              type: 'text',
              x: 220,
              y: 140,
              text: 'Click to Learn More',
              fontSize: 16,
              fontFamily: 'Inter',
              fontStyle: 'bold',
              fill: designPrefs.secondaryColor || '#3B82F6',
              align: 'left',
              width: 200,
            });

            setInitialElements(defaultElements);
            setInitialBackgroundColor(designPrefs.backgroundColor || '#FFFFFF');
          }
        }
      } catch (error: any) {
        // Only log the error; don't show a toast for new users who don't have saved designs
        // This is expected behavior - they're starting fresh
        console.warn('Error during design load (may be expected for new users):', error);

        // Only show an error toast if this looks like an unexpected error
        // (e.g., network issues, not permission errors for non-existent data)
        const isPermissionError = error?.code === 'permission-denied' ||
          error?.message?.includes('Missing or insufficient permissions');

        if (!isPermissionError) {
          toast({
            title: 'Error',
            description: 'Could not load your saved design. Starting fresh.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) {
      checkSubscriptionAndLoadDesign();
    }
  }, [effectiveUserId, firestore, userLoading, toast, isAdminMode, advertisementId]);

  // Handle save
  const handleSave = async (imageDataUrl: string, elements: DesignElement[], backgroundColor: string) => {
    if (!user || !firestore || !storage || !effectiveUserId) {
      toast({
        title: 'Error',
        description: 'Not signed in. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Find or create advertisement
      let adIdToUse = advertisementId;

      if (!adIdToUse) {
        const adsRef = collection(firestore, 'users', effectiveUserId, 'advertisements');
        const adsQuery = query(adsRef, orderBy('createdAt', 'desc'), firestoreLimit(1));
        const adsSnapshot = await getDocs(adsQuery);
        if (!adsSnapshot.empty) {
          adIdToUse = adsSnapshot.docs[0].id;
          setAdvertisementId(adIdToUse);
        }
      }

      if (adIdToUse) {
        // Save as a new version in the versions subcollection
        const newVersion = await saveDesignVersion(
          firestore,
          storage,
          effectiveUserId,
          adIdToUse,
          {
            elements: elements as any, // Cast to AdDesignElement[]
            backgroundColor,
            previewImageDataUrl: imageDataUrl,
            createdBy: isAdminMode ? 'admin' : 'customer',
            createdByUserId: user.uid,
            notes: currentVersion
              ? `Updated from version ${currentVersion.versionNumber}`
              : 'Initial design',
          }
        );

        // Update the advertisement with the latest version
        await updateAdWithVersion(firestore, effectiveUserId, adIdToUse, newVersion, isAdminMode);

        setCurrentVersion(newVersion);
        setHasSavedDesign(true);

        toast({
          title: 'Design Saved!',
          description: `Version ${newVersion.versionNumber} saved successfully. You can now submit for review.`,
        });
      } else {
        // Fallback: Save to user document (legacy behavior for users without ads yet)
        const elementsToSave = elements.map(el => {
          if (el.type === 'image') {
            const { imageObj, ...rest } = el as any;
            return rest;
          }
          return el;
        });

        const userDocRef = doc(firestore, 'users', effectiveUserId);

        // Upload the generated image to storage
        const imagePath = `advertisements/${effectiveUserId}/designed-ad-${Date.now()}.png`;
        const imageRef = storageRef(storage, imagePath);
        await uploadString(imageRef, imageDataUrl, 'data_url');
        const imageUrl = await getDownloadURL(imageRef);

        // Save design state and image URL to user document
        await setDoc(userDocRef, {
          adDesign: {
            elements: elementsToSave,
            backgroundColor,
            savedAt: serverTimestamp(),
          },
          customerSampleAdUrl: imageUrl,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        setHasSavedDesign(true);

        toast({
          title: 'Design Saved!',
          description: 'Your ad design has been saved. You can now submit for review.',
        });
      }
    } catch (error: any) {
      console.error('Error saving design:', error);
      toast({
        title: 'Save Error',
        description: error.message || 'Could not save your design. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export
  const handleExport = (imageDataUrl: string) => {
    // Download the image
    const link = document.createElement('a');
    link.download = `my-ad-design-${Date.now()}.png`;
    link.href = imageDataUrl;
    link.click();

    toast({
      title: 'Ad Exported!',
      description: 'Your ad design has been downloaded as a PNG file.',
    });
  };

  // Handle request for custom design (let us design it for them)
  const handleRequestCustomDesign = async () => {
    if (!firestore || !effectiveUserId) {
      toast({
        title: 'Error',
        description: 'Unable to process request. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsRequestingDesign(true);

    try {
      // Find or create advertisement
      let adIdToUse = advertisementId;

      if (!adIdToUse) {
        const adsRef = collection(firestore, 'users', effectiveUserId, 'advertisements');
        const adsQuery = query(adsRef, orderBy('createdAt', 'desc'), firestoreLimit(1));
        const adsSnapshot = await getDocs(adsQuery);
        if (!adsSnapshot.empty) {
          adIdToUse = adsSnapshot.docs[0].id;
          setAdvertisementId(adIdToUse);
        }
      }

      if (adIdToUse) {
        const adRef = doc(firestore, 'users', effectiveUserId, 'advertisements', adIdToUse);
        await updateDoc(adRef, {
          requestCustomDesign: true,
          status: 'pending_design',
          designRequestedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Design Request Submitted!',
          description: 'Our team will create a custom ad design for you. We\'ll notify you when it\'s ready.',
        });

        // Navigate back to account page
        router.push('/account');
      } else {
        // Update user document if no ad exists yet
        const userDocRef = doc(firestore, 'users', effectiveUserId);
        await updateDoc(userDocRef, {
          requestCustomDesign: true,
          designRequestedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Design Request Submitted!',
          description: 'Our team will create a custom ad design for you. We\'ll notify you when it\'s ready.',
        });

        router.push('/account');
      }
    } catch (error: any) {
      console.error('Error requesting custom design:', error);
      toast({
        title: 'Request Error',
        description: error.message || 'Could not submit your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingDesign(false);
    }
  };

  // Handle submit for review
  const handleSubmitForReview = async () => {
    if (!firestore || !effectiveUserId || !advertisementId) {
      toast({
        title: 'Error',
        description: 'Unable to submit. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const adRef = doc(firestore, 'users', effectiveUserId, 'advertisements', advertisementId);
      await updateDoc(adRef, {
        requestCustomDesign: false,
        status: 'in_review',
        designSubmittedAt: serverTimestamp(),
        sentForReviewAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActionBy: isAdminMode ? 'admin' : 'customer',
        lastActionAt: serverTimestamp(),
      });

      toast({
        title: 'Submitted for Review!',
        description: 'Your ad has been submitted for review. We\'ll review it shortly.',
      });

      // Navigate back to account page
      router.push('/account');
    } catch (error: any) {
      console.error('Error submitting for review:', error);
      toast({
        title: 'Submission Error',
        description: error.message || 'Could not submit for review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading ad designer...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to access the ad designer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/account">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Ad Designer</h1>
            <p className="text-muted-foreground">Create your custom advertisement</p>
          </div>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Subscription Required</CardTitle>
            <CardDescription>
              You need an active subscription to use the ad designer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Subscribe to our advertising plan to create custom ads that will be displayed on our community websites.
            </p>
            <Link href="/pricing">
              <Button className="w-full">View Pricing Plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Mobile Warning Dialog */}
      <Dialog open={showMobileWarning} onOpenChange={setShowMobileWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <Smartphone className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Better on Desktop</DialogTitle>
            <DialogDescription className="text-center">
              The Ad Designer works best on a larger screen. For the best experience with shapes, colors, and gradients, we recommend using a desktop or laptop computer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!emailSent ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Mail className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Want to continue on your computer? We'll send you a link!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-link" className="text-sm font-medium">
                    Your email address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-link"
                      type="email"
                      placeholder="you@example.com"
                      value={emailForLink}
                      onChange={(e) => setEmailForLink(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendDesktopLink}
                      disabled={isSendingEmail || !emailForLink}
                      className="shrink-0"
                    >
                      {isSendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="text-center">
                  <p className="font-medium text-green-800">Email Sent!</p>
                  <p className="text-sm text-green-700">
                    Check your inbox for the link to continue designing on your computer.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowMobileWarning(false);
                setMobileWarningDismissed(true);
              }}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Continue Anyway
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => router.push('/account')}
            >
              Go Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={isAdminMode ? `/advertisements/${advertisementId}?userId=${effectiveUserId}` : '/account'}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6" />
              Ad Designer
            </h1>
            {isAdminMode && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                Admin Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isAdminMode
              ? `Editing design for ${userData?.businessName || userData?.contactName || 'customer'}`
              : `Create your custom ${AD_DIMENSIONS.WIDTH}x${AD_DIMENSIONS.HEIGHT} advertisement`}
          </p>
        </div>
        {currentVersion && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            <span>Version {currentVersion.versionNumber}</span>
            {currentVersion.isApproved && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Help Offer - Design for Me */}
      {showHelpOffer && !isAdminMode && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
          <button
            onClick={() => setShowHelpOffer(false)}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Need help designing your ad?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No worries! Our team can create a professional ad design for you at no extra cost.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestCustomDesign}
                disabled={isRequestingDesign}
                className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 whitespace-nowrap"
              >
                {isRequestingDesign ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <HelpCircle className="mr-2 h-3 w-3" />
                    Let Us Design It
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to use the Ad Designer</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Edit Text:</strong> Click any text on the canvas and start typing in the panel on the right.</li>
            <li><strong>Add Elements:</strong> Use the "Text" and "Image" buttons above the canvas to add new elements.</li>
            <li><strong>Move & Resize:</strong> Drag elements to move them. Use corner handles to resize.</li>
            <li><strong>Style Your Ad:</strong> Select an element to customize font, color, size, and alignment.</li>
            <li><strong>Save & Submit:</strong> Click "Save" when done, then submit for review.</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Ad Designer Component */}
      <Card>
        <CardHeader>
          <CardTitle>Design Canvas</CardTitle>
          <CardDescription>
            Your ad will be displayed at 300x100 pixels on websites (saved at 600x200 for high quality)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdDesigner
            width={AD_DIMENSIONS.WIDTH}
            height={AD_DIMENSIONS.HEIGHT}
            initialElements={initialElements}
            initialBackgroundColor={initialBackgroundColor}
            onSave={handleSave}
            onExport={handleExport}
            isSaving={isSaving}
          />
        </CardContent>
      </Card>

      {/* Submit for Review section */}
      {hasSavedDesign && !isAdminMode && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Ready to Submit?
            </CardTitle>
            <CardDescription>
              Your design has been saved. Submit it for review to proceed with your advertisement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Review
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Design Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Keep it Simple</h4>
              <p className="text-sm text-muted-foreground">
                Use clear, readable text and avoid cluttering your ad. Less is more!
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Use Your Logo</h4>
              <p className="text-sm text-muted-foreground">
                Upload your business logo to build brand recognition with viewers.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Clear Call-to-Action</h4>
              <p className="text-sm text-muted-foreground">
                Include text that tells viewers what to do, like "Learn More" or "Visit Today".
              </p>
            </div>
          </div>

          {/* Always-visible help option */}
          {!isAdminMode && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  <span>Finding it difficult? We're here to help!</span>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleRequestCustomDesign}
                  disabled={isRequestingDesign}
                  className="text-primary"
                >
                  {isRequestingDesign ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request Free Design Help'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
