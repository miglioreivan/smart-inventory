import type { ColumnType } from './schema.types';

export interface Product {
  id: string;
  rowIndex: number;
  cells: Record<string, string | number | boolean | null>;
  metadata: ProductMeta;
}

export interface ProductMeta {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Location {
  id: string;
  barcode: string;
  label: string;
  parentId: string | null;
  children: Location[];
  productCount: number;
  totalValue: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  productCount: number;
}

export interface InventoryView {
  spreadsheetId: string;
  sheetName: string;
  columns: ColumnDef[];
  filters: FilterRule[];
  sortKey: string | null;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  page: number;
  pageSize: number;
}

export interface ColumnDef {
  index: number;
  type: ColumnType;
  label: string;
  visible: boolean;
  width: number;
  frozen: boolean;
  options?: string[];
  format?: ColumnFormat;
}

export interface ColumnFormat {
  currencySymbol?: string;
  decimalPlaces?: number;
  dateFormat?: string;
  colorFormat?: 'hex' | 'rgb';
}

export interface FilterRule {
  columnIndex: number;
  operator: FilterOperator;
  value: string;
}

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'empty'
  | 'notEmpty';

export interface Collaborator {
  email: string;
  role: CollaboratorRole;
  permissionId: string;
  invitedAt: string;
}

export type CollaboratorRole = 'owner' | 'writer' | 'reader';

export interface ExportConfig {
  format: 'xlsx' | 'csv' | 'pdf';
  includeHidden: boolean;
  includeAttachments: boolean;
  pageOrientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'Letter' | 'Thermal';
}

export interface ScanEvent {
  barcode: string;
  source: 'camera' | 'hardware';
  timestamp: number;
}

export interface SmartBox {
  id: string;
  barcode: string;
  label: string;
  parentLocationId: string;
  products: Product[];
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  totalLocations: number;
  expiringSoon: number;
  lowStock: number;
  recentScans: number;
  categoryDistribution: { name: string; count: number }[];
  valueByLocation: { name: string; value: number }[];
}
