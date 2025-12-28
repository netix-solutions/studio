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
import { Loader2, ArrowLeft, Info, Palette, History, CheckCircle, Send } from 'lucide-react';
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

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to use the Ad Designer</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Add Text:</strong> Click "Add Text" to add text elements. Double-click text to edit.</li>
            <li><strong>Add Images:</strong> Click "Add Image" to upload your logo or images.</li>
            <li><strong>Move & Resize:</strong> Drag elements to move them. Use corner handles to resize.</li>
            <li><strong>Edit Properties:</strong> Select an element to change font, color, size, and more.</li>
            <li><strong>Save:</strong> Click "Save" to save your design and submit it for review.</li>
            <li><strong>Export:</strong> Download your design as a PNG file.</li>
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
        </CardContent>
      </Card>
    </div>
  );
}
