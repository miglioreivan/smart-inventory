import { useState, useMemo, useCallback } from 'react';
import { useHybridScanner } from '../../hooks/useHybridScanner';
import type { ScanEvent } from '../../types/inventory.types';
import { getGlobalLocationCodes } from './LocationManager';
import {
  Search, Camera, Keyboard, X, Check, MapPin, Hash, ChevronRight,
  Package, Repeat,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { CameraStream } from './CameraStream';

interface UnifiedSearchProps {
  allRows: { tabTitle: string; rows: string[][]; columns: { label: string; type: string }[] }[];
}

interface SearchResult {
  type: 'location' | 'product';
  locationCode?: string;
  locationName?: string;
  tabTitle?: string;
  rowIndex?: number;
  cells?: string[];
  barcode?: string;
  name?: string;
  matchField?: string;
}

export function UnifiedSearch({ allRows }: UnifiedSearchProps) {
  const [query, setQuery] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const handleGlobalScan = useCallback((event: ScanEvent) => {
    setQuery(event.barcode);
    setCameraActive(false);
  }, []);

  const { lastScan, clearLastScan, cameraError, startCamera, stopCamera, availableCameras, flipCamera, activeCameraId } = useHybridScanner({
    onGlobalScan: handleGlobalScan,
    mode: 'search',
    enabled: true,
  });

  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
      setCameraActive(false);
    } else {
      startCamera();
      setCameraActive(true);
    }
  }, [cameraActive, startCamera, stopCamera]);

  const locations = useMemo(() => getGlobalLocationCodes(), []);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: SearchResult[] = [];

    for (const loc of locations) {
      if (loc.toLowerCase().includes(q)) {
        items.push({ type: 'location', locationCode: loc });
      }
    }

    for (const tab of allRows) {
      const rows = tab.rows;
      for (let ri = 1; ri < rows.length; ri++) {
        const row = rows[ri];
        const match = row.some((cell) => String(cell ?? '').toLowerCase().includes(q));
        if (match) {
          const barcodeCol = tab.columns.findIndex((c) => c.type === 'Barcode' || c.type === 'QRCode');
          const nameCol = tab.columns.findIndex((c) => c.label.toLowerCase().includes('name'));
          const locCol = tab.columns.findIndex((c) => c.type === 'Location');
          items.push({
            type: 'product',
            tabTitle: tab.tabTitle,
            rowIndex: ri,
            cells: row,
            barcode: barcodeCol >= 0 ? String(row[barcodeCol] ?? '') : '',
            name: nameCol >= 0 ? String(row[nameCol] ?? '') : String(row[0] ?? ''),
            matchField: locCol >= 0 ? String(row[locCol] ?? '') : '',
          });
        }
      }
    }

    return items;
  }, [query, locations, allRows]);

  const locationMatches = results.filter((r) => r.type === 'location');
  const productMatches = results.filter((r) => r.type === 'product');

  const showFlip = availableCameras.length > 1 && cameraActive;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan or type a barcode, location, or item name..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-8 pr-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleCamera}
            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              cameraActive
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            <Camera size={14} />
            <span className="hidden sm:inline">Scan</span>
          </button>
          {showFlip && (
            <button
              onClick={flipCamera}
              className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-slate-400 hover:text-slate-200"
              title="Flip camera"
            >
              <Repeat size={14} />
            </button>
          )}
          <button
            onClick={() => setShowManual(!showManual)}
            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              showManual
                ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            <Keyboard size={14} />
          </button>
        </div>
      </div>

      {showManual && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-500/5 p-2 sm:p-3">
          <input
            autoFocus
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setQuery(manualInput.trim()); setManualInput(''); setShowManual(false); }
              if (e.key === 'Escape') { setShowManual(false); setManualInput(''); }
            }}
            placeholder="Type barcode manually..."
            className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={() => { setQuery(manualInput.trim()); setManualInput(''); setShowManual(false); }}
            disabled={!manualInput.trim()}
            className="rounded-md bg-brand-600 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            <Search size={14} />
          </button>
          <button
            onClick={() => { setShowManual(false); setManualInput(''); }}
            className="rounded-md p-1.5 sm:p-2 text-slate-500 hover:text-slate-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <CameraStream
        active={cameraActive}
        onScan={(barcode) => handleGlobalScan({ barcode, source: 'camera', timestamp: Date.now() })}
        onError={() => setCameraActive(false)}
        cameraId={activeCameraId}
      />

      {cameraError && <p className="text-xs text-red-400">{cameraError}</p>}

      {lastScan && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-500/10 p-2 sm:p-3">
          <Check size={14} className="text-emerald-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs sm:text-sm text-emerald-300">{lastScan.barcode}</p>
            <p className="text-[10px] sm:text-xs text-emerald-500/70">
              via {lastScan.source} &middot; {new Date(lastScan.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <Badge variant={lastScan.source === 'hardware' ? 'brand' : 'yellow'}>{lastScan.source}</Badge>
          <button onClick={clearLastScan} className="rounded p-1 text-slate-500 hover:text-slate-300"><X size={12} /></button>
        </div>
      )}

      {!query && !cameraActive && !lastScan && (
        <div className="rounded-lg border border-dashed border-slate-700 p-6 sm:p-8 text-center">
          <Search size={28} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-500">Search across all items and locations</p>
          <p className="mt-1 text-[10px] text-slate-600">
            Scan a barcode with camera or hardware scanner to instantly find items
          </p>
        </div>
      )}

      {query && results.length === 0 && !cameraActive && (
        <div className="rounded-lg border border-slate-700 p-6 text-center">
          <p className="text-sm text-slate-500">No results for "{query}"</p>
        </div>
      )}

      {locationMatches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <MapPin size={14} className="text-amber-400" />
            Location Matches ({locationMatches.length})
          </h3>
          {locationMatches.map((loc, i) => (
            <div key={i} className="rounded-lg border border-amber-700/50 bg-amber-500/5 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Location: {loc.locationCode}</p>
                  <p className="text-xs text-slate-500">
                    Scan this location code into any "Location" field to assign items here.
                    {loc.locationName && <> &mdash; {loc.locationName}</>}
                  </p>
                </div>
              </div>
              {productMatches.filter((p) => p.matchField?.includes(loc.locationCode ?? '')).length > 0 && (
                <div className="mt-3 ml-7 space-y-1">
                  <p className="text-[10px] text-slate-500 mb-1">Items in this location:</p>
                  {productMatches
                    .filter((p) => p.matchField?.includes(loc.locationCode ?? ''))
                    .map((p, j) => (
                      <div key={j} className="flex items-center gap-2 rounded bg-slate-800/50 px-2 py-1">
                        <Hash size={12} className="text-slate-600" />
                        <span className="text-xs text-slate-300">{p.name}</span>
                        <Badge variant="default">{p.tabTitle}</Badge>
                        {p.barcode && <span className="text-[10px] font-mono text-slate-600">{p.barcode}</span>}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {productMatches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <Package size={14} className="text-brand-400" />
            Product Matches ({productMatches.length})
          </h3>
          {productMatches.map((p, i) => (
            <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="brand">{p.tabTitle}</Badge>
                    {p.barcode && <span className="text-[10px] font-mono text-slate-500">{p.barcode}</span>}
                    {p.matchField && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> {p.matchField}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
