import { GOOGLE_API_SCOPES } from './googleScopes';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let currentToken: string | null = null;
let tokenExpiry = 0;

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!id) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  return id;
}

function initTokenClient(): google.accounts.oauth2.TokenClient {
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: GOOGLE_API_SCOPES.join(' '),
      callback: (response) => {
        if (response.access_token) {
          currentToken = response.access_token;
          tokenExpiry = Date.now() + 50 * 60 * 1000;
        }
      },
    });
  }
  return tokenClient;
}

export async function getGoogleAccessToken(): Promise<string> {
  if (currentToken && Date.now() < tokenExpiry - 60_000) {
    return currentToken;
  }
  return requestAccessToken();
}

export function setGoogleAccessToken(token: string | null): void {
  currentToken = token;
  if (token) tokenExpiry = Date.now() + 50 * 60 * 1000;
}

export function clearGoogleAccessToken(): void {
  currentToken = null;
  tokenExpiry = 0;
}

export async function requestAccessToken(): Promise<string> {
  const client = initTokenClient();

  return new Promise<string>((resolve, reject) => {
    try {
      client.requestAccessToken({ prompt: '' });
    } catch {
      reject(new Error('Failed to request token'));
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (currentToken) {
        clearInterval(interval);
        resolve(currentToken);
      } else if (Date.now() - start > 30_000) {
        clearInterval(interval);
        reject(new Error('Token request timed out'));
      }
    }, 100);
  });
}

export async function requestAccessTokenWithPrompt(): Promise<string> {
  const client = initTokenClient();
  clearGoogleAccessToken();

  return new Promise<string>((resolve, reject) => {
    try {
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (currentToken) {
        clearInterval(interval);
        resolve(currentToken);
      } else if (Date.now() - start > 120_000) {
        clearInterval(interval);
        reject(new Error('Token request timed out'));
      }
    }, 100);
  });
}
