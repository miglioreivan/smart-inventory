import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut, getRedirectResult } from 'firebase/auth';
import { GOOGLE_API_SCOPES } from './googleScopes';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const TOKEN_KEY = 'smart-inventory-google-token';

export function getGoogleAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  for (const scope of GOOGLE_API_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

export async function handleRedirectResult(): Promise<string | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken ?? null;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      return token;
    }
    return null;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    throw err;
  }
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  await signOut(auth);
}

export { auth };
export type { User } from 'firebase/auth';
