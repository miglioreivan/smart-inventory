import { useState, useMemo, useCallback } from 'react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { InventoryView } from './components/inventory/InventoryView';
import { UnifiedSearch } from './components/scanner/UnifiedSearch';
import { LocationManager } from './components/scanner/LocationManager';
import { SpreadsheetSelector } from './components/inventory/SpreadsheetSelector';
import { useSpreadsheet } from './hooks/useSpreadsheet';
import { useHybridScanner } from './hooks/useHybridScanner';
import type { ScannerMode } from './hooks/useHybridScanner';
import type { ScanEvent } from './types/inventory.types';
import { PackageSearch, Table2, Search, MapPin, LogOut, Menu, X } from 'lucide-react';

type ViewKey = 'inventory' | 'search' | 'locations';

export default function App() {
  const { user, loading, error, signIn, signOut } = useGoogleAuth();
  const [view, setView] = useState<ViewKey>('inventory');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const spreadsheet = useSpreadsheet(selectedId ?? '');

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">SmartInventory</h1>
        <p className="text-sm text-slate-400 text-center">Manage inventory with Google Sheets</p>
        <button onClick={signIn} className="btn-primary">Sign in with Google</button>
      </div>
    );
  }

  }

  const handleDeleteWorkbook = async () => {
    if (!selectedId) return;
    try {
      await spreadsheet.deleteWorkbook.mutateAsync();
      setSelectedId(null);
    } catch {}
  };

  const allRows = useMemo(() => {
    const tabs = spreadsheet.tabs.data ?? [];
    return tabs
      .filter((t: { title: string }) => t.title !== '_SYSTEM_SCHEMA')
      .map((t: { title: string }) => ({
        tabTitle: t.title,
        rows: (spreadsheet.inventory.data ?? []),
        columns: spreadsheet.columns,
      }));
  }, [spreadsheet.tabs.data, spreadsheet.inventory.data, spreadsheet.columns]);

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      <button
        onClick={() => { setView('inventory'); onClick?.(); }}
        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs sm:text-sm transition-colors ${
          view === 'inventory'
            ? 'bg-slate-800 text-slate-100'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }`}
      >
        <Table2 size={15} /> Inventory
      </button>
      <button
        onClick={() => { setView('search'); onClick?.(); }}
        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs sm:text-sm transition-colors ${
          view === 'search'
            ? 'bg-slate-800 text-slate-100'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }`}
      >
        <Search size={15} /> Search & Boxes
      </button>
      <button
        onClick={() => { setView('locations'); onClick?.(); }}
        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs sm:text-sm transition-colors ${
          view === 'locations'
            ? 'bg-slate-800 text-slate-100'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }`}
      >
        <MapPin size={15} /> Locations & Boxes
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-56 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <h1 className="text-sm font-bold tracking-tight text-slate-200">
            <PackageSearch size={18} className="inline mr-2 -mt-0.5 text-brand-400" />
            SmartInventory
          </h1>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1">
          <NavItems />
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

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
              <h1 className="text-sm font-bold text-slate-200">SmartInventory</h1>
              <button onClick={() => setSidebarOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-1">
              <NavItems onClick={() => setSidebarOpen(false)} />
            </nav>
            <div className="px-2 py-3 border-t border-slate-800">
              <SpreadsheetSelector selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setSidebarOpen(false); }} />
            </div>
            <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
              <span className="truncate text-xs text-slate-500 mr-2">{user.email}</span>
              <button onClick={signOut} className="rounded p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950">
          <button onClick={() => setSidebarOpen(true)} className="rounded p-1 text-slate-400 hover:text-slate-200">
            <Menu size={20} />
          </button>
          <h1 className="text-sm font-bold text-slate-200">SmartInventory</h1>
          <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{user.email}</span>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {view === 'inventory' && (
            <InventoryView
              spreadsheetId={selectedId}
              globalSearch={globalSearch}
              onFormModalChange={setFormModalOpen}
              onDeleteWorkbook={handleDeleteWorkbook}
            />
          )}
          {view === 'search' && (
            <UnifiedSearch allRows={allRows} />
          )}
          {view === 'locations' && <LocationManager />}
        </main>
      </div>
    </div>
  );
}
