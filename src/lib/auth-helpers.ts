import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from './firebase-admin';

export interface AuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
}

/**
 * Verify authentication and admin status from request headers
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AuthResult> {
  const result: AuthResult = {
    isAuthenticated: false,
    isAdmin: false,
    userId: null,
    email: null,
  };

  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return result;
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await getAuth().verifyIdToken(token);
    
    result.isAuthenticated = true;
    result.userId = decodedToken.uid;
    result.email = decodedToken.email || null;

    // Check if user is admin
    const db = getAdminFirestore();
    const adminDoc = await db.collection('roles_admin').doc(decodedToken.uid).get();
    
    if (adminDoc.exists) {
      result.isAdmin = true;
    }

    return result;

  } catch (error) {
    console.error('Auth verification error:', error);
    return result;
  }
}

/**
 * Verify user authentication (no admin check)
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const result: AuthResult = {
    isAuthenticated: false,
    isAdmin: false,
    userId: null,
    email: null,
  };

  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return result;
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await getAuth().verifyIdToken(token);
    
    result.isAuthenticated = true;
    result.userId = decodedToken.uid;
    result.email = decodedToken.email || null;

    return result;

  } catch (error) {
    console.error('Auth verification error:', error);
    return result;
  }
}
