export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const SYSTEM_SCHEMA_SHEET = '_SYSTEM_SCHEMA';

export const HARDWARE_SCAN_THRESHOLD_MS = 30;
export const HARDWARE_SCAN_MIN_LENGTH = 3;
export const HARDWARE_SCAN_MAX_LENGTH = 128;
export const HARDWARE_SCAN_SUFFIX = 'Enter';

export const QUERY_STALE_TIME = 30_000;
export const QUERY_GC_TIME = 5 * 60_000;
export const MAX_REQUESTS_PER_MINUTE = 58;

export const PAGINATION_DEFAULT_SIZE = 50;
export const PAGINATION_MAX_SIZE = 200;

export const COLUMN_DEFAULT_WIDTHS: Record<string, number> = {
  Text: 180,
  Number: 100,
  Date: 130,
  Barcode: 160,
  QRCode: 140,
  List: 150,
  Checkbox: 60,
  Email: 200,
  Attachment: 120,
  Location: 200,
  Color: 80,
  Currency: 120,
  Percentage: 100,
};

export const FILE_EXTENSIONS_ALLOWED = [
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.xlsx', '.csv', '.docx', '.txt',
];

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
