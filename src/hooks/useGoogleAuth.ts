import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, getAccessToken } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  accessToken: string | null;
}

export function useGoogleAuth(): AuthState & {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string>;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    accessToken: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            const accessToken = await getAccessToken();
            setState({ user, loading: false, error: null, accessToken });
          } catch (err) {
            setState({ user, loading: false, error: err as Error, accessToken: null });
          }
        } else {
          setState({ user: null, loading: false, error: null, accessToken: null });
        }
      },
      (err) => {
        setState({ user: null, loading: false, error: err as Error, accessToken: null });
      },
    );

    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const accessToken = await signInWithGoogle();
      if (accessToken) {
        setState((prev) => ({ ...prev, accessToken }));
      }
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await signOutUser();
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string> => {
    const token = await getAccessToken();
    setState((prev) => ({ ...prev, accessToken: token }));
    return token;
  }, []);

  return { ...state, signIn, signOut, refreshToken };
}
