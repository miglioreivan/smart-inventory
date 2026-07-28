import { getAccessToken } from '../config/firebase';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}

export interface DrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  displayName?: string;
}

export async function listPermissions(fileId: string): Promise<DrivePermission[]> {
  const url = `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`;
  const response = await authFetch(url);
  const data = await response.json();
  return data.permissions ?? [];
}

export async function createPermission(
  fileId: string,
  email: string,
  role: 'writer' | 'reader',
): Promise<DrivePermission> {
  const url = `${DRIVE_API_BASE}/files/${fileId}/permissions?sendNotificationEmail=true`;
  const body = {
    type: 'user',
    role,
    emailAddress: email,
  };
  const response = await authFetch(url, { method: 'POST', body: JSON.stringify(body) });
  return response.json();
}

export async function deletePermission(fileId: string, permissionId: string): Promise<void> {
  const url = `${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`;
  await authFetch(url, { method: 'DELETE' });
}

export async function getFileRole(fileId: string): Promise<DrivePermission | null> {
  const permissions = await listPermissions(fileId);
  return permissions[0] ?? null;
}
