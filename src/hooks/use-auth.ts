'use client';
import { useFirebase, UserHookResult } from '@/firebase';

export const useAuth = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
