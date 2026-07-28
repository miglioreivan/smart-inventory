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

async function authFetchRaw(url: string, init?: RequestInit): Promise<Response> {
  enforceRateLimit();

  const token = getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated: missing Google OAuth access token');

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
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

export interface SheetTabInfo {
  sheetId: number;
  title: string;
}

export async function discoverSheetTabs(spreadsheetId: string): Promise<SheetTabInfo[]> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`;
  const response = await authFetch(url);
  const data = await response.json();
  return (data.sheets ?? []).map((s: { properties: SheetTabInfo }) => s.properties);
}

export function pickDataSheet(tabs: SheetTabInfo[], schemaTabName = '_SYSTEM_SCHEMA'): string | null {
  const dataTabs = tabs.filter((t) => t.title !== schemaTabName);
  return dataTabs.length > 0 ? dataTabs[0].title : null;
}

export function pickAllDataSheets(tabs: SheetTabInfo[], schemaTabName = '_SYSTEM_SCHEMA'): string[] {
  return tabs.filter((t) => t.title !== schemaTabName).map((t) => t.title);
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

function buildSchemaHeaderRows(): Record<string, unknown>[] {
  return ['TAB_TITLE', 'COLUMN_INDEX', 'COLUMN_LABEL', 'COLUMN_TYPE', 'OPTIONS', 'REQUIRED'].map((h) => ({
    userEnteredValue: { stringValue: h },
    userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.13, green: 0.14, blue: 0.17 } },
  }));
}

function buildSchemaRow(tabTitle: string, idx: number, label: string, type: string, options: string, required: boolean) {
  return {
    values: [
      { userEnteredValue: { stringValue: tabTitle } },
      { userEnteredValue: { numberValue: idx } },
      { userEnteredValue: { stringValue: label } },
      { userEnteredValue: { stringValue: type } },
      { userEnteredValue: { stringValue: options } },
      { userEnteredValue: { boolValue: required } },
    ],
  };
}

export async function createSpreadsheet(
  title: string,
  sheetName: string,
  columns: { label: string; type: string; required?: boolean; options?: string }[],
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated: missing Google OAuth access token');

  const body = {
    properties: { title },
    sheets: [{ properties: { title: sheetName } }],
  };

  const createResponse = await authFetch(SHEETS_API_BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await createResponse.json();
  const spreadsheetId = data.spreadsheetId;

  const tabs = await discoverSheetTabs(spreadsheetId);
  const dataSheet = tabs.find((t) => t.title === sheetName);
  const schemaTabId = 2;
  const dataSheetId = dataSheet?.sheetId ?? 0;

  const batchRequests: Record<string, unknown>[] = [
    {
      addSheet: {
        properties: {
          title: '_SYSTEM_SCHEMA',
          sheetId: schemaTabId,
          hidden: true,
          gridProperties: { rowCount: 1000, columnCount: 6 },
        },
      },
    },
    {
      updateCells: {
        rows: [
          {
            values: columns.map((c) => ({
              userEnteredValue: { stringValue: c.label },
              userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.13, green: 0.14, blue: 0.17 } },
            })),
          },
        ],
        fields: 'userEnteredValue,userEnteredFormat',
        start: { sheetId: dataSheetId, rowIndex: 0, columnIndex: 0 },
      },
    },
    {
      updateCells: {
        rows: [
          { values: buildSchemaHeaderRows() },
          ...columns.map((c, idx) =>
            buildSchemaRow(sheetName, idx, c.label, c.type, c.options ?? '', c.required ?? false),
          ),
        ],
        fields: 'userEnteredValue,userEnteredFormat',
        start: { sheetId: schemaTabId, rowIndex: 0, columnIndex: 0 },
      },
    },
  ];

  await authFetchRaw(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: batchRequests }),
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {});

  return { spreadsheetId, spreadsheetUrl: data.spreadsheetUrl };
}

export async function addSheetTab(
  spreadsheetId: string,
  tabTitle: string,
  columns: { label: string; type: string; required?: boolean; options?: string }[],
): Promise<void> {
  const tabs = await discoverSheetTabs(spreadsheetId);
  const existing = tabs.find((t) => t.title === tabTitle);
  if (existing) throw new Error(`Tab "${tabTitle}" already exists`);

  const maxId = tabs.reduce((max, t) => Math.max(max, t.sheetId), 0);
  const newSheetId = maxId + 1;

  const requests: Record<string, unknown>[] = [
    {
      addSheet: {
        properties: {
          title: tabTitle,
          sheetId: newSheetId,
          gridProperties: { rowCount: 1000, columnCount: columns.length },
        },
      },
    },
    {
      updateCells: {
        rows: [
          {
            values: columns.map((c) => ({
              userEnteredValue: { stringValue: c.label },
              userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.13, green: 0.14, blue: 0.17 } },
            })),
          },
        ],
        fields: 'userEnteredValue,userEnteredFormat',
        start: { sheetId: newSheetId, rowIndex: 0, columnIndex: 0 },
      },
    },
  ];

  const schemaTab = tabs.find((t) => t.title === '_SYSTEM_SCHEMA');
  if (schemaTab) {
    const schemaData = await batchGet({
      spreadsheetId,
      ranges: [`'_SYSTEM_SCHEMA'!A:F`],
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const currentRows = schemaData.valueRanges[0]?.values ?? [];
    const nextRow = currentRows.length;

    requests.push({
      appendCells: {
        sheetId: schemaTab.sheetId,
        rows: columns.map((c, idx) => ({
          values: [
            { userEnteredValue: { stringValue: tabTitle } },
            { userEnteredValue: { numberValue: idx } },
            { userEnteredValue: { stringValue: c.label } },
            { userEnteredValue: { stringValue: c.type } },
            { userEnteredValue: { stringValue: c.options ?? '' } },
            { userEnteredValue: { boolValue: c.required ?? false } },
          ],
        })),
        fields: 'userEnteredValue',
      },
    });
  }

  await authFetchRaw(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteSheetTab(
  spreadsheetId: string,
  tabTitle: string,
): Promise<void> {
  const tabs = await discoverSheetTabs(spreadsheetId);
  const target = tabs.find((t) => t.title === tabTitle);
  if (!target) throw new Error(`Tab "${tabTitle}" not found`);

  const dataTabs = tabs.filter((t) => t.title !== '_SYSTEM_SCHEMA');
  if (dataTabs.length <= 1) throw new Error('Cannot delete the last visible tab');

  const requests: Record<string, unknown>[] = [
    { deleteSheet: { sheetId: target.sheetId } },
  ];

  const schemaTab = tabs.find((t) => t.title === '_SYSTEM_SCHEMA');
  if (schemaTab) {
    const schemaData = await batchGet({
      spreadsheetId,
      ranges: [`'_SYSTEM_SCHEMA'!A:F`],
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const schemaRows = schemaData.valueRanges[0]?.values ?? [];
    const tabTitleIdx = schemaRows[0]?.findIndex((h: string) => String(h).trim().toUpperCase() === 'TAB_TITLE');

    if (tabTitleIdx >= 0) {
      const rowsToDelete: number[] = [];
      schemaRows.forEach((row: string[], i: number) => {
        if (i > 0 && String(row[tabTitleIdx] ?? '').trim() === tabTitle) {
          rowsToDelete.push(i);
        }
      });

      if (rowsToDelete.length > 0) {
        requests.push({
          deleteDimension: {
            range: {
              sheetId: schemaTab.sheetId,
              dimension: 'ROWS',
              startIndex: rowsToDelete[0],
              endIndex: rowsToDelete[rowsToDelete.length - 1] + 1,
            },
          },
        });
      }
    }
  }

  await authFetchRaw(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export class SheetsApiError extends Error {
  public readonly apiError: GoogleSheetsError;

  constructor(error: GoogleSheetsError) {
    super(error.message);
    this.name = 'SheetsApiError';
    this.apiError = error;
  }
}
