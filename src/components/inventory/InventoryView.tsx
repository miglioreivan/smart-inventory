import { useState, useCallback, useMemo } from 'react';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import { DynamicTable } from './DynamicTable';
import { ProductDetailModal } from './ProductDetailModal';
import { SpreadsheetSelector } from './SpreadsheetSelector';
import { SmartBoxView } from '../scanner/SmartBoxView';
import { BarcodePrinter } from '../scanner/BarcodePrinter';
import { Loader2, Sheet, Table2, Scan, Printer, EyeOff } from 'lucide-react';

type TabKey = 'inventory' | 'scanner';

export function InventoryView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const spreadsheet = useSpreadsheet(selectedId ?? '');
  const [detailRowIndex, setDetailRowIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>('inventory');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showPrinter, setShowPrinter] = useState(false);

  const handleRowClick = useCallback((rowIndex: number) => {
    setDetailRowIndex(rowIndex);
  }, []);

  const handleSave = useCallback(
    async (rowIndex: number, updates: { colIndex: number; value: string }[]) => {
      if (!selectedId) return;
      await spreadsheet.updateCells(rowIndex, updates);
    },
    [selectedId, spreadsheet],
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

  const locationColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex(
      (c) => c.type === 'Location' || c.label.toLowerCase().includes('location'),
    );
  }, [spreadsheet.columns]);

  const handleScanProductToBox = useCallback(
    (productBarcode: string, boxBarcode: string) => {
      const rows = spreadsheet.inventory.data ?? [];
      const rowIndex = rows.findIndex(
        (row) => row[barcodeColIndex]?.toString().trim() === productBarcode,
      );
      if (rowIndex >= 0 && locationColIndex >= 0) {
        const existingLocation = rows[rowIndex][locationColIndex]?.toString() ?? '';
        const newLocation = boxBarcode
          ? `${existingLocation ? existingLocation + ' > ' : ''}BOX-${boxBarcode.slice(-6)}`
          : existingLocation;
        spreadsheet.updateCell(rowIndex, locationColIndex, newLocation);
      }
    },
    [spreadsheet, barcodeColIndex, locationColIndex],
  );

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

  if (!selectedId) {
    return (
      <div className="mx-auto max-w-md py-12">
        <SpreadsheetSelector selectedId={null} onSelect={setSelectedId} />
      </div>
    );
  }

  const isLoading = spreadsheet.schema.isLoading || spreadsheet.inventory.isLoading;
  const hasError = spreadsheet.schema.isError || spreadsheet.inventory.isError;

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
    <div className="flex gap-6">
      <aside className="w-64 flex-shrink-0">
        <SpreadsheetSelector selectedId={selectedId} onSelect={setSelectedId} />
      </aside>

      <main className="min-w-0 flex-1">
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

          <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-0.5">
            <button
              onClick={() => setTab('inventory')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'inventory'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table2 size={14} />
              Inventory
            </button>
            <button
              onClick={() => setTab('scanner')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'scanner'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scan size={14} />
              Smart Box
            </button>
            {tab === 'inventory' && selectedRows.size > 0 && (
              <button
                onClick={() => setShowPrinter(true)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-slate-700"
              >
                <Printer size={14} />
                {selectedRows.size}
              </button>
            )}
          </div>
        </div>

        {tab === 'inventory' && (
          <>
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
          </>
        )}

        {tab === 'scanner' && (
          <SmartBoxView
            data={spreadsheet.inventory.data ?? []}
            columns={spreadsheet.columns}
            barcodeColIndex={barcodeColIndex >= 0 ? barcodeColIndex : 0}
            locationColIndex={locationColIndex >= 0 ? locationColIndex : 0}
            nameColIndex={nameColIndex >= 0 ? nameColIndex : 0}
            onScanProductToBox={handleScanProductToBox}
            onClose={() => setTab('inventory')}
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
      </main>
    </div>
  );
}
