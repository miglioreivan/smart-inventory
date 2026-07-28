import { useState, useMemo, useCallback } from 'react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { InventoryView } from './components/inventory/InventoryView';
import { SmartBoxView } from './components/scanner/SmartBoxView';
import { BoxGenerator } from './components/scanner/BoxGenerator';
import { SpreadsheetSelector } from './components/inventory/SpreadsheetSelector';
import { useSpreadsheet } from './hooks/useSpreadsheet';
import { useHybridScanner } from './hooks/useHybridScanner';
import type { ScannerMode } from './hooks/useHybridScanner';
import type { ScanEvent } from './types/inventory.types';
import { PackageSearch, Table2, Search, LogOut } from 'lucide-react';

type ViewKey = 'inventory' | 'search';

export default function App() {
  const { user, loading, error, signIn, signOut } = useGoogleAuth();
  const [view, setView] = useState<ViewKey>('inventory');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<'smartbox' | 'labels'>('smartbox');

  const spreadsheet = useSpreadsheet(selectedId ?? '');

  const barcodeColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex((c) => c.type === 'Barcode' || c.type === 'QRCode');
  }, [spreadsheet.columns]);

  const locationColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex((c) => c.type === 'Location' || c.label.toLowerCase().includes('location'));
  }, [spreadsheet.columns]);

  const nameColIndex = useMemo(() => {
    return spreadsheet.columns.findIndex((c) => c.label.toLowerCase().includes('name') || c.label.toLowerCase().includes('product'));
  }, [spreadsheet.columns]);

  const handleGlobalScan = useCallback((event: ScanEvent) => {
    setGlobalSearch(event.barcode);
  }, []);

  const activeMode: ScannerMode = formModalOpen ? 'form' : 'search';

  useHybridScanner({
    onGlobalScan: handleGlobalScan,
    mode: activeMode,
    enabled: true,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-400">Authentication error</p>
        <button onClick={signIn} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-2xl font-bold tracking-tight">SmartInventory</h1>
        <p className="text-sm text-slate-400">Manage inventory with Google Sheets</p>
        <button onClick={signIn} className="btn-primary">Sign in with Google</button>
      </div>
    );
  }

  const handleScanProductToBox = (productBarcode: string, boxBarcode: string) => {
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
  };

  const handleDeleteWorkbook = async () => {
    if (!selectedId) return;
    try {
      await spreadsheet.deleteWorkbook.mutateAsync();
      setSelectedId(null);
    } catch {
      // deletion failed silently
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <h1 className="text-sm font-bold tracking-tight text-slate-200">
            <PackageSearch size={18} className="inline mr-2 -mt-0.5 text-brand-400" />
            SmartInventory
          </h1>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1">
          <button
            onClick={() => setView('inventory')}
            className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              view === 'inventory'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Table2 size={16} />
            Inventory
          </button>
          <button
            onClick={() => setView('search')}
            className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              view === 'search'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Search size={16} />
            Search & Boxes
          </button>
        </nav>

        <div className="px-2 py-3 border-t border-slate-800">
          <SpreadsheetSelector selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{user.email}</span>
            <button onClick={signOut} className="rounded p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {view === 'inventory' && (
          <InventoryView
            spreadsheetId={selectedId}
            globalSearch={globalSearch}
            onFormModalChange={setFormModalOpen}
            onDeleteWorkbook={handleDeleteWorkbook}
          />
        )}
        {view === 'search' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 mb-4 rounded-lg bg-slate-800 p-0.5 w-fit">
              <button
                onClick={() => setSearchTab('smartbox')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  searchTab === 'smartbox' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scanner & Boxes
              </button>
              <button
                onClick={() => setSearchTab('labels')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  searchTab === 'labels' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Box Labels
              </button>
            </div>

            {searchTab === 'smartbox' && (
              <SmartBoxView
                data={spreadsheet.inventory.data ?? []}
                columns={spreadsheet.columns}
                barcodeColIndex={barcodeColIndex >= 0 ? barcodeColIndex : 0}
                locationColIndex={locationColIndex >= 0 ? locationColIndex : 0}
                nameColIndex={nameColIndex >= 0 ? nameColIndex : 0}
                onScanProductToBox={handleScanProductToBox}
                onClose={() => setView('inventory')}
              />
            )}
            {searchTab === 'labels' && <BoxGenerator />}
          </div>
        )}
      </main>
    </div>
  );
}
