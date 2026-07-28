import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    localStorage.setItem(TOKEN_KEY, credential.accessToken);
  }
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  await signOut(auth);
}

export { auth };
export type { User } from 'firebase/auth';
