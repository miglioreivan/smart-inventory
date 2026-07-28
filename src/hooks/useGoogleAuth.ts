import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, getGoogleAccessToken, handleRedirectResult } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  accessToken: string | null;
}

export function useGoogleAuth(): AuthState & {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => string | null;
} {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    loading: true,
    error: null,
    accessToken: getGoogleAccessToken(),
  }));

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const token = await handleRedirectResult();
        if (token && !cancelled) {
          setState((prev) => ({ ...prev, accessToken: token }));
        }
      } catch {}
    };
    init();

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          const token = getGoogleAccessToken();
          if (!cancelled) {
            setState({ user, loading: false, error: null, accessToken: token });
          }
        } else {
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
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as Error, accessToken: null }));
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

  const refreshToken = useCallback((): string | null => {
    const token = getGoogleAccessToken();
    setState((prev) => ({ ...prev, accessToken: token }));
    return token;
  }, []);

  return { ...state, signIn, signOut, refreshToken };
}
