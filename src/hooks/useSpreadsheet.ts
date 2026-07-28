import { useMemo, useState } from 'react';
import {
  createSpreadsheet,
  addSheetTab,
  deleteSheetTab,
  batchGet,
  batchUpdate,
  discoverSheetTabs,
  pickAllDataSheets,
} from '../services/googleSheetsService';
import { getCurrentUserRole, deleteSpreadsheet } from '../services/googleDriveService';
import { useGoogleAuth } from './useGoogleAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SYSTEM_SCHEMA_SHEET } from '../config/constants';
import type { BatchUpdateRequest, ColumnMeta, ColumnType } from '../types/schema.types';
import { validateColumnType } from './useSchemaValidator';

const SCHEMA_COLS: Record<string, number> = {
  TAB_TITLE: 0,
  COLUMN_INDEX: 1,
  COLUMN_LABEL: 2,
  COLUMN_TYPE: 3,
  OPTIONS: 4,
  REQUIRED: 5,
};

export function parseSchemaMetadata(rows: string[][], filterTab?: string): ColumnMeta[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h).trim().toUpperCase());

  return rows.slice(1)
    .filter((row) => {
      if (!filterTab) return true;
      return String(row[SCHEMA_COLS.TAB_TITLE] ?? '').trim() === filterTab;
    })
    .map((row, i) => {
      const rawType = String(row[SCHEMA_COLS.COLUMN_TYPE] ?? 'Text').trim();
      const type: ColumnType = validateColumnType(rawType) ? rawType : 'Text';
      const optionsRaw = String(row[SCHEMA_COLS.OPTIONS] ?? '').trim();
      const options = optionsRaw ? optionsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
      const required = ['TRUE', 'true', '1', 'yes'].includes(String(row[SCHEMA_COLS.REQUIRED] ?? '').trim().toLowerCase());

      return {
        id: `col_${i}`,
        sheetColumnIndex: Number(row[SCHEMA_COLS.COLUMN_INDEX]) ?? i,
        type,
        label: String(row[SCHEMA_COLS.COLUMN_LABEL] ?? `Column ${i}`).trim(),
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
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null);

  const roleQuery = useQuery({
    queryKey: ['file-role', spreadsheetId, userEmail],
    queryFn: () => getCurrentUserRole(spreadsheetId, userEmail),
    enabled: Boolean(enabled && userEmail),
    staleTime: 2 * 60_000,
  });

  const isReadOnly = roleQuery.data === 'reader';

  const tabsQuery = useQuery({
    queryKey: ['sheet-tabs', spreadsheetId],
    queryFn: () => discoverSheetTabs(spreadsheetId),
    enabled,
    staleTime: 5 * 60_000,
  });

  const allDataSheets = useMemo(() => pickAllDataSheets(tabsQuery.data ?? []), [tabsQuery.data]);

  const resolvedSheetName = useMemo(() => {
    if (activeSheetName && allDataSheets.includes(activeSheetName)) return activeSheetName;
    if (allDataSheets.length > 0) return allDataSheets[0];
    return null;
  }, [activeSheetName, allDataSheets]);

  const schemaQuery = useQuery({
    queryKey: ['schema-data', spreadsheetId],
    queryFn: async () => {
      const res = await batchGet({
        spreadsheetId,
        ranges: [`'${SYSTEM_SCHEMA_SHEET}'!A:F`],
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      return res.valueRanges[0]?.values ?? [];
    },
    enabled,
    staleTime: 60_000,
  });

  const columns: ColumnMeta[] = useMemo(
    () => parseSchemaMetadata(schemaQuery.data ?? [], resolvedSheetName ?? undefined),
    [schemaQuery.data, resolvedSheetName],
  );

  const inventoryQuery = useQuery({
    queryKey: ['inventory-data', spreadsheetId, resolvedSheetName],
    queryFn: async () => {
      if (!resolvedSheetName) return [];
      const sheetRef = resolvedSheetName.includes(' ') ? `'${resolvedSheetName}'` : resolvedSheetName;
      const res = await batchGet({
        spreadsheetId,
        ranges: [`${sheetRef}!A:Z`],
        valueRenderOption: 'FORMATTED_VALUE',
      });
      return res.valueRanges[0]?.values ?? [];
    },
    enabled: Boolean(enabled && resolvedSheetName),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: BatchUpdateRequest) => batchUpdate(params),
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['inventory-data', spreadsheetId] });
      const previous = queryClient.getQueryData<string[][]>(['inventory-data', spreadsheetId, resolvedSheetName]);

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
        queryClient.setQueryData(['inventory-data', spreadsheetId, resolvedSheetName], optimistic);
      }
      return { previous };
    },
    onError: (_err, _params, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inventory-data', spreadsheetId, resolvedSheetName], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-data', spreadsheetId] });
    },
  });

  const makeRange = (sheet: string, colIndex: number, rowIndex: number) => {
    const colChar = String.fromCharCode(65 + colIndex);
    const sheetRef = sheet.includes(' ') ? `'${sheet}'` : sheet;
    return `${sheetRef}!${colChar}${rowIndex + 1}`;
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (isReadOnly) throw new Error('Read-only access: cannot modify data');
    const sheet = resolvedSheetName ?? 'Sheet1';
    const range = makeRange(sheet, colIndex, rowIndex);
    return updateMutation.mutateAsync({
      spreadsheetId,
      data: [{ range, majorDimension: 'ROWS', values: [[value]] }],
      valueInputOption: 'USER_ENTERED',
    });
  };

  const updateCells = (rowIndex: number, updates: { colIndex: number; value: string }[]) => {
    if (isReadOnly) throw new Error('Read-only access: cannot modify data');
    const sheet = resolvedSheetName ?? 'Sheet1';
    const data = updates.map(({ colIndex, value }) => ({
      range: makeRange(sheet, colIndex, rowIndex),
      majorDimension: 'ROWS' as const,
      values: [[value]],
    }));
    return updateMutation.mutateAsync({
      spreadsheetId,
      data,
      valueInputOption: 'USER_ENTERED',
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sheet-tabs', spreadsheetId] });
    queryClient.invalidateQueries({ queryKey: ['schema-data', spreadsheetId] });
    queryClient.invalidateQueries({ queryKey: ['inventory-data', spreadsheetId] });
    queryClient.invalidateQueries({ queryKey: ['file-role', spreadsheetId] });
  };

  const addTabMutation = useMutation({
    mutationFn: ({
      tabTitle,
      columns: cols,
    }: {
      tabTitle: string;
      columns: { label: string; type: string; required?: boolean; options?: string }[];
    }) => addSheetTab(spreadsheetId, tabTitle, cols),
    onSuccess: (_, vars) => {
      setActiveSheetName(vars.tabTitle);
      invalidateAll();
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: (tabTitle: string) => deleteSheetTab(spreadsheetId, tabTitle),
    onSuccess: () => {
      setActiveSheetName(null);
      invalidateAll();
    },
  });

  const deleteWorkbookMutation = useMutation({
    mutationFn: () => deleteSpreadsheet(spreadsheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spreadsheets-list'] });
    },
  });

  return {
    sheets: allDataSheets,
    activeSheetName: resolvedSheetName,
    setActiveSheetName,
    columns,
    inventory: inventoryQuery,
    tabs: tabsQuery,
    schema: schemaQuery,
    role: roleQuery,
    isReadOnly,
    updateCell,
    updateCells,
    updateSheet: updateMutation,
    isSaving: updateMutation.isPending,
    addTab: addTabMutation,
    deleteTab: deleteTabMutation,
    deleteWorkbook: deleteWorkbookMutation,
    invalidateAll,
  };
}

export function useCreateSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      title,
      sheetName,
      columns: cols,
    }: {
      title: string;
      sheetName: string;
      columns: { label: string; type: string; required?: boolean; options?: string }[];
    }) => createSpreadsheet(title, sheetName, cols),
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
