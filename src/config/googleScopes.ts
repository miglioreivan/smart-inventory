export const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
] as const;

export const GOOGLE_API_DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
] as const;

export const GOOGLE_AUTH_SCOPES_STRING = GOOGLE_API_SCOPES.join(' ');
