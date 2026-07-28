import { useState, useCallback, useMemo } from 'react';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import { DynamicTable } from './DynamicTable';
import { ProductDetailModal } from './ProductDetailModal';
import { AddProductModal } from './AddProductModal';
import { AddTabModal } from './AddTabModal';
import { TabBar } from './TabBar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { BarcodePrinter } from '../scanner/BarcodePrinter';
import { getGlobalLocationCodes } from '../scanner/LocationManager';
import { Loader2, Sheet, Printer, EyeOff, Plus, Trash2 } from 'lucide-react';

interface InventoryViewProps {
  spreadsheetId: string | null;
  globalSearch?: string;
  onFormModalChange?: (open: boolean) => void;
  onDeleteWorkbook?: () => void;
}

export function InventoryView({ spreadsheetId, globalSearch, onFormModalChange, onDeleteWorkbook }: InventoryViewProps) {
  const spreadsheet = useSpreadsheet(spreadsheetId ?? '');
  const [detailRowIndex, setDetailRowIndex] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showPrinter, setShowPrinter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [deleteTabTarget, setDeleteTabTarget] = useState<string | null>(null);
  const [showDeleteWorkbook, setShowDeleteWorkbook] = useState(false);

  const globalLocations = useMemo(() => getGlobalLocationCodes(), []);

  const handleRowClick = useCallback((rowIndex: number) => {
    setDetailRowIndex(rowIndex);
    onFormModalChange?.(true);
  }, [onFormModalChange]);

  const handleSave = useCallback(
    async (rowIndex: number, updates: { colIndex: number; value: string }[]) => {
      if (!spreadsheetId) return;
      await spreadsheet.updateCells(rowIndex, updates);
    },
    [spreadsheetId, spreadsheet],
  );

  const barcodeColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex((c) => c.type === 'Barcode' || c.type === 'QRCode');
  }, [spreadsheet.columns]);

  const nameColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex((c) => c.label.toLowerCase().includes('name') || c.label.toLowerCase().includes('product'));
  }, [spreadsheet.columns]);

  const toggleRowSelection = useCallback((rowIndex: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
      return next;
    });
  }, []);

  const printerLabels = useMemo(() => {
    const rows = spreadsheet.inventory.data ?? [];
    const colIdx = barcodeColIndex >= 0 ? barcodeColIndex : 0;
    return Array.from(selectedRows).map((ri) => {
      const row = rows[ri] ?? [];
      const barcode = (row[colIdx] ?? '').toString().trim();
      const label = (row[nameColIndex >= 0 ? nameColIndex : 0] ?? '').toString().trim() || `Item #${ri}`;
      return { barcode, label, subtitle: '' };
    });
  }, [selectedRows, spreadsheet.inventory.data, barcodeColIndex, nameColIndex]);

  const handleAddTab = useCallback(async (tabTitle: string, columns: { label: string; type: string; required: boolean; options?: string }[]) => {
    await spreadsheet.addTab.mutateAsync({ tabTitle, columns });
  }, [spreadsheet]);

  const handleDeleteTabConfirm = useCallback(async () => {
    if (!deleteTabTarget) return;
    await spreadsheet.deleteTab.mutateAsync(deleteTabTarget);
    setDeleteTabTarget(null);
  }, [deleteTabTarget, spreadsheet]);

  const selectedRow = detailRowIndex !== null ? spreadsheet.inventory.data?.[detailRowIndex] : undefined;
  const isLoading = spreadsheet.tabs.isLoading || spreadsheet.schema.isLoading || spreadsheet.inventory.isLoading;
  const hasError = spreadsheet.tabs.isError || spreadsheet.schema.isError || spreadsheet.inventory.isError;

  if (!spreadsheetId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
        <Sheet size={40} className="text-slate-700" />
        <p className="text-sm">Select a spreadsheet from the sidebar</p>
        <p className="text-xs text-slate-600">Or create a new one to get started</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={24} className="animate-spin text-brand-500" />
        <p className="text-sm text-slate-500">Loading inventory...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-red-400">Failed to load data</p>
        <button onClick={() => spreadsheet.invalidateAll()} className="btn-primary text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Sheet size={20} className="text-brand-400" />
          <h2 className="text-lg font-semibold text-slate-100">
            {spreadsheet.tabs.data && spreadsheet.tabs.data.length > 0
              ? spreadsheet.tabs.data.find((t: { title: string }) => t.title === spreadsheet.activeSheetName)?.title ?? spreadsheet.activeSheetName
              : 'Inventory'}
          </h2>
          {spreadsheet.isReadOnly && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-400">
              <EyeOff size={12} /> Read-only
            </span>
          )}
          {spreadsheet.isSaving && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-400">
              <Loader2 size={12} className="animate-spin" /> Saving
            </span>
          )}
          {!spreadsheet.isReadOnly && (
            <button
              onClick={() => { setShowAddForm(true); onFormModalChange?.(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
            >
              <Plus size={14} /> Aggiungi
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <button onClick={() => setShowPrinter(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500">
              <Printer size={14} /> Print {selectedRows.size}
            </button>
          )}
          {!spreadsheet.isReadOnly && onDeleteWorkbook && (
            <button onClick={() => setShowDeleteWorkbook(true)} className="flex items-center gap-1.5 rounded-lg border border-red-700/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10">
              <Trash2 size={14} /> Delete Workbook
            </button>
          )}
        </div>
      </div>

      {spreadsheet.sheets.length > 0 && (
        <div className="mb-4">
          <TabBar
            tabs={spreadsheet.sheets}
            activeTab={spreadsheet.activeSheetName}
            onSelect={spreadsheet.setActiveSheetName}
            onAdd={() => setShowAddTab(true)}
            onDelete={(tab) => setDeleteTabTarget(tab)}
            readOnly={spreadsheet.isReadOnly}
            tabsCount={spreadsheet.sheets.length}
          />
        </div>
      )}

      <DynamicTable
        columns={spreadsheet.columns}
        rows={spreadsheet.inventory.data ?? []}
        loading={isLoading}
        onRowClick={handleRowClick}
        selectedRows={selectedRows}
        onToggleSelection={toggleRowSelection}
        externalSearch={globalSearch}
      />

      {selectedRow && detailRowIndex !== null && (
        <ProductDetailModal
          open
          onClose={() => { setDetailRowIndex(null); onFormModalChange?.(false); }}
          rowIndex={detailRowIndex}
          row={selectedRow}
          columns={spreadsheet.columns}
          onSave={handleSave}
          saving={spreadsheet.isSaving}
          readOnly={spreadsheet.isReadOnly}
          globalLocations={globalLocations}
        />
      )}

      {showAddForm && (
        <AddProductModal
          open
          onClose={() => { setShowAddForm(false); onFormModalChange?.(false); }}
          spreadsheetId={spreadsheetId}
          sheetName={spreadsheet.activeSheetName ?? 'Sheet1'}
          columns={spreadsheet.columns}
          onSuccess={() => spreadsheet.invalidateAll()}
          globalLocations={globalLocations}
        />
      )}

      {showAddTab && (
        <AddTabModal
          open
          onClose={() => setShowAddTab(false)}
          onCreate={handleAddTab}
        />
      )}

      {deleteTabTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTabTarget(null)}
          onConfirm={handleDeleteTabConfirm}
          title="Delete Page"
          message={`Are you sure you want to delete "${deleteTabTarget}" and all its items? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}

      {showDeleteWorkbook && (
        <ConfirmDialog
          open
          onClose={() => setShowDeleteWorkbook(false)}
          onConfirm={() => {
            setShowDeleteWorkbook(false);
            onDeleteWorkbook?.();
          }}
          title="Delete Inventory"
          message="Are you sure you want to permanently delete this entire spreadsheet workbook? All data will be lost. This action cannot be undone."
          confirmLabel="Delete Workbook"
          variant="danger"
        />
      )}

      {showPrinter && (
        <BarcodePrinter
          items={printerLabels}
          title={spreadsheet.activeSheetName ?? 'Labels'}
          format="A4"
          onClose={() => setShowPrinter(false)}
        />
      )}
    </div>
  );
}
