import { getGoogleAccessToken } from '../config/firebase';
import type {
  BatchGetRequest,
  BatchGetResponse,
  BatchUpdateRequest,
  BatchUpdateResponse,
  GoogleSheetsError,
} from '../types/schema.types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const MAX_REQUESTS_PER_MINUTE = 58;
const COOLDOWN_MS = 1000;

let requestTimestamps: number[] = [];

function enforceRateLimit(): void {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  requestTimestamps = requestTimestamps.filter((t) => t > oneMinuteAgo);

  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = requestTimestamps[0];
    const waitMs = oldest + 60_000 - now + COOLDOWN_MS;
    throw new RateLimitError(waitMs);
  }

  requestTimestamps.push(now);
}

async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  enforceRateLimit();

  const token = getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated: missing Google OAuth access token');

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(input, { ...init, headers });

  if (!response.ok) {
    const error: GoogleSheetsError = await response.json().catch(() => ({
      code: response.status,
      message: response.statusText,
      status: response.statusText,
    }));
    throw new SheetsApiError(error);
  }

  return response;
}

export async function batchGet(params: BatchGetRequest): Promise<BatchGetResponse> {
  const { spreadsheetId, ranges, valueRenderOption = 'FORMATTED_VALUE', dateTimeRenderOption = 'FORMATTED_STRING' } = params;
  const encodedRanges = ranges.map((r) => encodeURIComponent(r)).join('&ranges=');
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values:batchGet?ranges=${encodedRanges}&valueRenderOption=${valueRenderOption}&dateTimeRenderOption=${dateTimeRenderOption}`;

  const response = await authFetch(url);
  return response.json();
}

export async function batchUpdate(params: BatchUpdateRequest): Promise<BatchUpdateResponse> {
  const { spreadsheetId, data, valueInputOption = 'USER_ENTERED', includeValuesInResponse = false } = params;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`;

  const body = {
    valueInputOption,
    includeValuesInResponse,
    data,
  };

  const response = await authFetch(url, { method: 'POST', body: JSON.stringify(body) });
  const result = await response.json();

  return {
    spreadsheetId,
    responses: result.responses ?? [],
    totalUpdatedRows: result.totalUpdatedRows ?? 0,
    totalUpdatedColumns: result.totalUpdatedColumns ?? 0,
    totalUpdatedCells: result.totalUpdatedCells ?? 0,
  };
}

export async function getSpreadsheetMeta(spreadsheetId: string) {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=properties,sheets.properties`;
  const response = await authFetch(url);
  return response.json();
}

export async function getSheetData(spreadsheetId: string, range: string): Promise<BatchGetResponse> {
  return batchGet({ spreadsheetId, ranges: [range] });
}

export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  values: (string | number | boolean)[],
): Promise<{ updatedRange: string; updatedRows: number }> {
  enforceRateLimit();

  const token = getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated: missing Google OAuth access token');

  const range = `${encodeURIComponent(sheetName)}!A1`;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values.map((v) => String(v))],
    }),
  });

  if (!response.ok) {
    const error: GoogleSheetsError = await response.json().catch(() => ({
      code: response.status,
      message: response.statusText,
      status: response.statusText,
    }));
    throw new SheetsApiError(error);
  }

  const data = await response.json();
  return {
    updatedRange: data.updates?.updatedRange ?? '',
    updatedRows: data.updates?.updatedRows ?? 0,
  };
}

export async function updateSheetData(spreadsheetId: string, range: string, values: (string | number | boolean)[][]): Promise<BatchUpdateResponse> {
  const strValues = values.map((row) => row.map((cell) => String(cell)));
  return batchUpdate({
    spreadsheetId,
    data: [{ range, majorDimension: 'ROWS', values: strValues }],
  });
}

export class RateLimitError extends Error {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export async function createSpreadsheet(
  title: string,
  columns: { label: string; type: string }[],
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = SHEETS_API_BASE;

  const headers = columns.map((col) => col.label);
  const types = columns.map((col) => col.type);

  const body = {
    properties: { title },
    sheets: [
      {
        properties: {
          title: 'Inventory',
          gridProperties: { rowCount: 1000, columnCount: headers.length },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: {
              values: headers.map((h) => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.13, green: 0.14, blue: 0.17 } },
              })),
            },
          },
        ],
      },
      {
        properties: {
          title: '_SYSTEM_SCHEMA',
          hidden: true,
          gridProperties: { rowCount: headers.length + 1, columnCount: 5 },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: {
              values: [
                'COLUMN_INDEX',
                'COLUMN_LABEL',
                'COLUMN_TYPE',
                'OPTIONS',
                'REQUIRED',
              ].map((h) => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.13, green: 0.14, blue: 0.17 } },
              })),
            },
          },
          ...headers.map((label, idx) => ({
            startRow: idx + 1,
            startColumn: 0,
            rowData: {
              values: [
                { userEnteredValue: { numberValue: idx } },
                { userEnteredValue: { stringValue: label } },
                { userEnteredValue: { stringValue: types[idx] ?? 'Text' } },
                { userEnteredValue: { stringValue: '' } },
                { userEnteredValue: { boolValue: false } },
              ],
            },
          })),
        ],
      },
    ],
  };

  const response = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

export class SheetsApiError extends Error {
  public readonly apiError: GoogleSheetsError;

  constructor(error: GoogleSheetsError) {
    super(error.message);
    this.name = 'SheetsApiError';
    this.apiError = error;
  }
}
