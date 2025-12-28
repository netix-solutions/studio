/**
 * Ad Draft Versions System
 *
 * Manages versioned storage of ad designer state, allowing both customers
 * and admins to load, edit, and save design versions.
 *
 * Collection structure:
 * /users/{userId}/advertisements/{adId}/versions/{versionId}
 *   - versionNumber: number (auto-incremented)
 *   - elements: DesignElement[] (the canvas elements)
 *   - backgroundColor: string
 *   - previewImageUrl: string (exported PNG)
 *   - createdAt: Timestamp
 *   - createdBy: 'customer' | 'admin'
 *   - createdByUserId: string
 *   - notes: string (optional version notes)
 *   - isApproved: boolean (marks the approved version)
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Firestore,
  DocumentReference,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import type { AdDesignElement } from '../types';

/**
 * Design version document structure
 */
export interface AdDraftVersion {
  id: string;
  versionNumber: number;
  elements: AdDesignElement[];
  backgroundColor: string;
  previewImageUrl: string;
  createdAt: any; // Firestore Timestamp
  createdBy: 'customer' | 'admin';
  createdByUserId: string;
  notes?: string;
  isApproved?: boolean;
  isFinal?: boolean; // Marks as the final approved version
}

/**
 * Input for creating a new version
 */
export interface CreateVersionInput {
  elements: AdDesignElement[];
  backgroundColor: string;
  previewImageDataUrl: string;
  createdBy: 'customer' | 'admin';
  createdByUserId: string;
  notes?: string;
}

/**
 * Get the versions collection reference
 */
function getVersionsCollection(
  firestore: Firestore,
  userId: string,
  adId: string
) {
  return collection(firestore, 'users', userId, 'advertisements', adId, 'versions');
}

/**
 * Get the next version number for an advertisement
 */
export async function getNextVersionNumber(
  firestore: Firestore,
  userId: string,
  adId: string
): Promise<number> {
  const versionsRef = getVersionsCollection(firestore, userId, adId);
  const q = query(versionsRef, orderBy('versionNumber', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return 1;
  }

  const lastVersion = snapshot.docs[0].data();
  return (lastVersion.versionNumber || 0) + 1;
}

/**
 * Save a new design version
 * Returns the created version document
 */
export async function saveDesignVersion(
  firestore: Firestore,
  storage: FirebaseStorage,
  userId: string,
  adId: string,
  input: CreateVersionInput
): Promise<AdDraftVersion> {
  const versionsRef = getVersionsCollection(firestore, userId, adId);

  // Get next version number
  const versionNumber = await getNextVersionNumber(firestore, userId, adId);

  // Upload the preview image
  const imagePath = `advertisements/${userId}/${adId}/versions/v${versionNumber}-${Date.now()}.png`;
  const imageRef = ref(storage, imagePath);
  await uploadString(imageRef, input.previewImageDataUrl, 'data_url');
  const previewImageUrl = await getDownloadURL(imageRef);

  // Prepare elements for storage (remove non-serializable properties)
  const elementsToSave = input.elements.map(el => {
    if (el.type === 'image') {
      const { imageObj, ...rest } = el as any;
      return rest;
    }
    return el;
  });

  // Create version document
  const versionData = {
    versionNumber,
    elements: elementsToSave,
    backgroundColor: input.backgroundColor,
    previewImageUrl,
    createdAt: serverTimestamp(),
    createdBy: input.createdBy,
    createdByUserId: input.createdByUserId,
    notes: input.notes || undefined,
    isApproved: false,
    isFinal: false,
  };

  const docRef = await addDoc(versionsRef, versionData);

  return {
    id: docRef.id,
    ...versionData,
  };
}

/**
 * Get all versions for an advertisement (ordered by version number)
 */
export async function getDesignVersions(
  firestore: Firestore,
  userId: string,
  adId: string
): Promise<AdDraftVersion[]> {
  const versionsRef = getVersionsCollection(firestore, userId, adId);
  const q = query(versionsRef, orderBy('versionNumber', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as AdDraftVersion));
}

/**
 * Get the latest version for an advertisement
 */
export async function getLatestVersion(
  firestore: Firestore,
  userId: string,
  adId: string
): Promise<AdDraftVersion | null> {
  const versionsRef = getVersionsCollection(firestore, userId, adId);
  const q = query(versionsRef, orderBy('versionNumber', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as AdDraftVersion;
}

/**
 * Get the approved/final version for an advertisement
 */
export async function getApprovedVersion(
  firestore: Firestore,
  userId: string,
  adId: string
): Promise<AdDraftVersion | null> {
  const versionsRef = getVersionsCollection(firestore, userId, adId);
  const q = query(versionsRef, where('isApproved', '==', true), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as AdDraftVersion;
}

/**
 * Get a specific version by ID
 */
export async function getVersionById(
  firestore: Firestore,
  userId: string,
  adId: string,
  versionId: string
): Promise<AdDraftVersion | null> {
  const versionRef = doc(firestore, 'users', userId, 'advertisements', adId, 'versions', versionId);
  const snapshot = await getDoc(versionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as AdDraftVersion;
}

/**
 * Mark a version as approved (and unmark others)
 */
export async function approveVersion(
  firestore: Firestore,
  userId: string,
  adId: string,
  versionId: string
): Promise<void> {
  const versionsRef = getVersionsCollection(firestore, userId, adId);

  // First, unmark all other versions as approved
  const q = query(versionsRef, where('isApproved', '==', true));
  const snapshot = await getDocs(q);

  const updates: Promise<void>[] = snapshot.docs.map(doc =>
    updateDoc(doc.ref, { isApproved: false, isFinal: false })
  );

  // Mark the specified version as approved
  const versionRef = doc(firestore, 'users', userId, 'advertisements', adId, 'versions', versionId);
  updates.push(updateDoc(versionRef, { isApproved: true, isFinal: true }));

  await Promise.all(updates);
}

/**
 * Load elements from a version with image objects reconstructed
 * This is needed because imageObj (HTMLImageElement) cannot be stored in Firestore
 */
export async function loadVersionElements(
  version: AdDraftVersion
): Promise<AdDesignElement[]> {
  const elements = await Promise.all(
    version.elements.map(async (element) => {
      if (element.type === 'image' && 'src' in element) {
        return new Promise<AdDesignElement>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = element.src as string;
          img.onload = () => {
            resolve({
              ...element,
              imageObj: img,
            } as AdDesignElement);
          };
          img.onerror = () => {
            // Return element without imageObj if loading fails
            resolve(element);
          };
        });
      }
      return element;
    })
  );

  return elements;
}

/**
 * Update advertisement with the latest version's preview
 * Call this after saving a version to update the main ad document
 */
export async function updateAdWithVersion(
  firestore: Firestore,
  userId: string,
  adId: string,
  version: AdDraftVersion,
  asProof: boolean = false
): Promise<void> {
  const adRef = doc(firestore, 'users', userId, 'advertisements', adId);

  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
    latestVersionId: version.id,
    latestVersionNumber: version.versionNumber,
  };

  // If this is meant to be the customer's sample ad
  if (version.createdBy === 'customer') {
    updateData.customerSampleAdUrl = version.previewImageUrl;
  }

  // If setting as the official proof (admin action)
  if (asProof) {
    updateData.adProofUrl = version.previewImageUrl;
  }

  await updateDoc(adRef, updateData);
}

/**
 * Create a new version from an existing version (for revisions)
 */
export async function createRevisionFromVersion(
  firestore: Firestore,
  storage: FirebaseStorage,
  userId: string,
  adId: string,
  sourceVersionId: string,
  modifiedElements: AdDesignElement[],
  modifiedBackgroundColor: string,
  previewImageDataUrl: string,
  createdBy: 'customer' | 'admin',
  createdByUserId: string,
  notes?: string
): Promise<AdDraftVersion> {
  return saveDesignVersion(firestore, storage, userId, adId, {
    elements: modifiedElements,
    backgroundColor: modifiedBackgroundColor,
    previewImageDataUrl,
    createdBy,
    createdByUserId,
    notes: notes || `Revision based on version ${sourceVersionId}`,
  });
}

/**
 * Migrate existing design from user document to versions collection
 * Use this to migrate existing designs to the new versioned system
 */
export async function migrateExistingDesign(
  firestore: Firestore,
  storage: FirebaseStorage,
  userId: string,
  adId: string,
  existingDesign: {
    elements: AdDesignElement[];
    backgroundColor: string;
    savedAt?: any;
  },
  existingPreviewUrl?: string
): Promise<AdDraftVersion | null> {
  // Check if versions already exist
  const existing = await getLatestVersion(firestore, userId, adId);
  if (existing) {
    // Already migrated
    return existing;
  }

  // If we have an existing preview URL, we don't need to re-upload
  // For migration, we'll create a version with the existing URL
  const versionsRef = getVersionsCollection(firestore, userId, adId);

  const elementsToSave = existingDesign.elements.map(el => {
    if (el.type === 'image') {
      const { imageObj, ...rest } = el as any;
      return rest;
    }
    return el;
  });

  const versionData = {
    versionNumber: 1,
    elements: elementsToSave,
    backgroundColor: existingDesign.backgroundColor,
    previewImageUrl: existingPreviewUrl || '',
    createdAt: existingDesign.savedAt || serverTimestamp(),
    createdBy: 'customer' as const,
    createdByUserId: userId,
    notes: 'Migrated from legacy design',
    isApproved: false,
    isFinal: false,
  };

  const docRef = await addDoc(versionsRef, versionData);

  return {
    id: docRef.id,
    ...versionData,
  };
}
