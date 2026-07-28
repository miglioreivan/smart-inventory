export type ColumnType =
  | 'Text'
  | 'Number'
  | 'Date'
  | 'Barcode'
  | 'QRCode'
  | 'List'
  | 'Checkbox'
  | 'Email'
  | 'Attachment'
  | 'Location'
  | 'Color'
  | 'Currency'
  | 'Percentage';

export interface ColumnMeta {
  id: string;
  sheetColumnIndex: number;
  type: ColumnType;
  label: string;
  required: boolean;
  readonly: boolean;
  options?: string[];
  currencySymbol?: string;
  decimalPlaces?: number;
  dateFormat?: string;
  colorFormat?: 'hex' | 'rgb';
}

export interface SheetMeta {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
  frozenRowCount: number;
  frozenColumnCount: number;
  columns: ColumnMeta[];
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  locale: string;
  timeZone: string;
  sheets: SheetMeta[];
}

export interface CellValue {
  sheetName: string;
  row: number;
  col: number;
  value: string | number | boolean | null;
  formattedValue?: string;
}

export interface BatchGetRequest {
  spreadsheetId: string;
  ranges: string[];
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
}

export interface BatchGetResponse {
  spreadsheetId: string;
  valueRanges: ValueRange[];
}

export interface ValueRange {
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
  values: string[][] | null;
}

export interface BatchUpdateRequest {
  spreadsheetId: string;
  data: ValueRange[];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  includeValuesInResponse?: boolean;
}

export interface BatchUpdateResponse {
  spreadsheetId: string;
  responses: { updatedRange: string; updatedRows: number; updatedColumns: number; updatedCells: number }[];
  totalUpdatedRows: number;
  totalUpdatedColumns: number;
  totalUpdatedCells: number;
}

export interface GoogleSheetsError {
  code: number;
  message: string;
  status: string;
  errors?: { message: string; domain: string; reason: string }[];
}
