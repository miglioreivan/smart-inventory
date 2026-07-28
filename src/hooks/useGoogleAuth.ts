import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../config/firebase';
import {
  requestAccessToken,
  requestAccessTokenWithPrompt,
  getGoogleAccessToken,
  clearGoogleAccessToken,
} from '../config/googleAuth';

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
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            const token = await requestAccessToken();
            if (!cancelled) {
              setState({ user, loading: false, error: null, accessToken: token });
            }
          } catch {
            if (!cancelled) {
              setState({ user, loading: false, error: null, accessToken: null });
            }
          }
        } else {
          clearGoogleAccessToken();
          if (!cancelled) {
            setState({ user: null, loading: false, error: null, accessToken: null });
          }
        }
      },
      (err) => {
        if (!cancelled) {
          setState({ user: null, loading: false, error: err as Error, accessToken: null });
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithGoogle();
      const token = await requestAccessTokenWithPrompt();
      setState((prev) => ({ ...prev, accessToken: token }));
    } catch (err) {
      clearGoogleAccessToken();
      setState((prev) => ({ ...prev, loading: false, error: err as Error, accessToken: null }));
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      clearGoogleAccessToken();
      await signOutUser();
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as Error }));
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string> => {
    const token = await getGoogleAccessToken();
    setState((prev) => ({ ...prev, accessToken: token }));
    return token;
  }, []);

  return { ...state, signIn, signOut, refreshToken };
}
