import { useMemo } from 'react';
import { createSpreadsheet, batchGet, batchUpdate, getSpreadsheetMeta } from '../services/googleSheetsService';
import { getCurrentUserRole } from '../services/googleDriveService';
import { useGoogleAuth } from './useGoogleAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SYSTEM_SCHEMA_SHEET } from '../config/constants';
import type { BatchUpdateRequest, ColumnMeta, ColumnType } from '../types/schema.types';
import { validateColumnType } from './useSchemaValidator';

export function parseSchemaMetadata(rows: string[][]): ColumnMeta[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h).trim().toUpperCase());
  const colIdxHeader = headers.indexOf('COLUMN_INDEX');
  const labelHeader = headers.indexOf('COLUMN_LABEL');
  const typeHeader = headers.indexOf('COLUMN_TYPE');
  const optsHeader = headers.indexOf('OPTIONS');
  const reqHeader = headers.indexOf('REQUIRED');

  return rows.slice(1).map((row, i) => {
    const rawType = String(row[typeHeader] ?? 'Text').trim();
    const type: ColumnType = validateColumnType(rawType) ? rawType : 'Text';
    const optionsRaw = String(row[optsHeader] ?? '').trim();
    const options = optionsRaw ? optionsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const required = ['TRUE', 'true', '1', 'yes'].includes(String(row[reqHeader] ?? '').trim().toLowerCase());

    return {
      id: `col_${i}`,
      sheetColumnIndex: Number(row[colIdxHeader]) ?? i,
      type,
      label: String(row[labelHeader] ?? `Column ${i}`).trim(),
      required,
      readonly: false,
      options,
    };
  });
}

export function useSpreadsheet(spreadsheetId: string) {
  const { accessToken, user } = useGoogleAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(accessToken && spreadsheetId);
  const userEmail = user?.email ?? '';

  const roleQuery = useQuery({
    queryKey: ['file-role', spreadsheetId, userEmail],
    queryFn: () => getCurrentUserRole(spreadsheetId, userEmail),
    enabled: Boolean(enabled && userEmail),
    staleTime: 2 * 60_000,
  });

  const isReadOnly = roleQuery.data === 'reader';

  const metaQuery = useQuery({
    queryKey: ['spreadsheet-meta', spreadsheetId],
    queryFn: () => getSpreadsheetMeta(spreadsheetId),
    enabled,
    staleTime: 5 * 60_000,
  });

  const schemaQuery = useQuery({
    queryKey: ['schema-data', spreadsheetId],
    queryFn: async () => {
      const res = await batchGet({
        spreadsheetId,
        ranges: [`'${SYSTEM_SCHEMA_SHEET}'!A:Z`],
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      return res.valueRanges[0]?.values ?? [];
    },
    enabled,
    staleTime: 60_000,
  });

  const columns: ColumnMeta[] = useMemo(
    () => parseSchemaMetadata(schemaQuery.data ?? []),
    [schemaQuery.data],
  );

  const inventoryQuery = useQuery({
    queryKey: ['inventory-data', spreadsheetId],
    queryFn: async () => {
      const res = await batchGet({
        spreadsheetId,
        ranges: ['Inventory!A:Z'],
        valueRenderOption: 'FORMATTED_VALUE',
      });
      return res.valueRanges[0]?.values ?? [];
    },
    enabled,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: BatchUpdateRequest) => batchUpdate(params),
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['inventory-data', spreadsheetId] });
      const previous = queryClient.getQueryData<string[][]>(['inventory-data', spreadsheetId]);

      if (previous) {
        const optimistic = previous.map((row) => [...row]);
        for (const vr of params.data) {
          const match = vr.range?.match(/!([A-Z]+)(\d+)/);
          if (match) {
            const colLetter = match[1];
            const rowNum = parseInt(match[2], 10);
            const colIdx = colLetter.charCodeAt(0) - 65;
            if (rowNum > 0 && colIdx >= 0 && vr.values && vr.values[0]) {
              while (optimistic.length <= rowNum) optimistic.push([]);
              const targetRow = optimistic[rowNum];
              while (targetRow.length <= colIdx) targetRow.push('');
              targetRow[colIdx] = String(vr.values[0][0] ?? '');
            }
          }
        }
        queryClient.setQueryData(['inventory-data', spreadsheetId], optimistic);
      }
      return { previous };
    },
    onError: (_err, _params, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inventory-data', spreadsheetId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-data', spreadsheetId] });
    },
  });

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (isReadOnly) throw new Error('Read-only access: cannot modify data');
    const colChar = String.fromCharCode(65 + colIndex);
    const range = `Inventory!${colChar}${rowIndex + 1}`;
    return updateMutation.mutateAsync({
      spreadsheetId,
      data: [{ range, majorDimension: 'ROWS', values: [[value]] }],
      valueInputOption: 'USER_ENTERED',
    });
  };

  const updateCells = (rowIndex: number, updates: { colIndex: number; value: string }[]) => {
    if (isReadOnly) throw new Error('Read-only access: cannot modify data');
    const data = updates.map(({ colIndex, value }) => {
      const colChar = String.fromCharCode(65 + colIndex);
      const range = `Inventory!${colChar}${rowIndex + 1}`;
      return { range, majorDimension: 'ROWS' as const, values: [[value]] };
    });
    return updateMutation.mutateAsync({
      spreadsheetId,
      data,
      valueInputOption: 'USER_ENTERED',
    });
  };

  return {
    meta: metaQuery,
    schema: schemaQuery,
    columns,
    inventory: inventoryQuery,
    role: roleQuery,
    isReadOnly,
    updateCell,
    updateCells,
    updateSheet: updateMutation,
    isSaving: updateMutation.isPending,
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['spreadsheet-meta', spreadsheetId] });
      queryClient.invalidateQueries({ queryKey: ['schema-data', spreadsheetId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-data', spreadsheetId] });
      queryClient.invalidateQueries({ queryKey: ['file-role', spreadsheetId] });
    },
  };
}

export function useCreateSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, columns: cols }: { title: string; columns: { label: string; type: string }[] }) =>
      createSpreadsheet(title, cols),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spreadsheets-list'] });
    },
  });
}

export function useSpreadsheetsList() {
  const { accessToken } = useGoogleAuth();
  const enabled = Boolean(accessToken);

  return useQuery({
    queryKey: ['spreadsheets-list'],
    queryFn: async () => {
      const token = accessToken!;
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and 'me' in owners");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      return (data.files ?? []) as { id: string; name: string; createdTime: string; modifiedTime: string }[];
    },
    enabled,
    staleTime: 60_000,
  });
}
