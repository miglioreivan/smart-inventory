import { useState, useCallback, useMemo } from 'react';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import { DynamicTable } from './DynamicTable';
import { ProductDetailModal } from './ProductDetailModal';
import { BarcodePrinter } from '../scanner/BarcodePrinter';
import { Loader2, Sheet, Printer, EyeOff } from 'lucide-react';

interface InventoryViewProps {
  spreadsheetId: string | null;
}

export function InventoryView({ spreadsheetId }: InventoryViewProps) {
  const spreadsheet = useSpreadsheet(spreadsheetId ?? '');
  const [detailRowIndex, setDetailRowIndex] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showPrinter, setShowPrinter] = useState(false);

  const handleRowClick = useCallback((rowIndex: number) => {
    setDetailRowIndex(rowIndex);
  }, []);

  const handleSave = useCallback(
    async (rowIndex: number, updates: { colIndex: number; value: string }[]) => {
      if (!spreadsheetId) return;
      await spreadsheet.updateCells(rowIndex, updates);
    },
    [spreadsheetId, spreadsheet],
  );

  const barcodeColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex(
      (c) => c.type === 'Barcode' || c.type === 'QRCode',
    );
  }, [spreadsheet.columns]);

  const nameColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex(
      (c) => c.label.toLowerCase().includes('name') || c.label.toLowerCase().includes('product'),
    );
  }, [spreadsheet.columns]);

  const toggleRowSelection = useCallback((rowIndex: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
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

  const selectedRow = detailRowIndex !== null ? spreadsheet.inventory.data?.[detailRowIndex] : undefined;

  const isLoading = spreadsheet.schema.isLoading || spreadsheet.inventory.isLoading;
  const hasError = spreadsheet.schema.isError || spreadsheet.inventory.isError;

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
        <button onClick={() => spreadsheet.invalidateAll()} className="btn-primary text-xs">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sheet size={20} className="text-brand-400" />
          <h2 className="text-lg font-semibold text-slate-100">
            {spreadsheet.meta.data?.title ?? 'Inventory'}
          </h2>
          {spreadsheet.isReadOnly && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-400">
              <EyeOff size={12} />
              Read-only
            </span>
          )}
          {spreadsheet.isSaving && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-400">
              <Loader2 size={12} className="animate-spin" />
              Saving
            </span>
          )}
        </div>

        {selectedRows.size > 0 && (
          <button
            onClick={() => setShowPrinter(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
          >
            <Printer size={14} />
            Print {selectedRows.size} label{selectedRows.size !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <DynamicTable
        columns={spreadsheet.columns}
        rows={spreadsheet.inventory.data ?? []}
        loading={isLoading}
        onRowClick={handleRowClick}
        selectedRows={selectedRows}
        onToggleSelection={toggleRowSelection}
      />

      {selectedRow && detailRowIndex !== null && (
        <ProductDetailModal
          open
          onClose={() => setDetailRowIndex(null)}
          rowIndex={detailRowIndex}
          row={selectedRow}
          columns={spreadsheet.columns}
          onSave={handleSave}
          saving={spreadsheet.isSaving}
          readOnly={spreadsheet.isReadOnly}
        />
      )}

      {showPrinter && (
        <BarcodePrinter
          items={printerLabels}
          title={spreadsheet.meta.data?.title ?? 'Labels'}
          format="A4"
          onClose={() => setShowPrinter(false)}
        />
      )}
    </div>
  );
}
