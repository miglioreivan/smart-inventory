import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { Printer, QrCode, Barcode, Hash, X, Plus, MapPin } from 'lucide-react';

interface LocationDef {
  name: string;
  code: string;
  createdAt: number;
}

function BarcodeCanvas1D({ value, height = 50 }: { value: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width: 2,
          height,
          displayValue: false,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.font = '10px monospace';
          ctx.fillText(value, 4, 28);
        }
      }
    }
  }, [value, height]);

  return <canvas ref={canvasRef} className="w-full" style={{ height }} />;
}

const STORAGE_KEY = 'smart-inventory-locations';

function loadLocations(): LocationDef[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocations(locs: LocationDef[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(locs));
}

export function getGlobalLocationCodes(): string[] {
  const locs = loadLocations();
  return locs.map((l) => l.code);
}

export function LocationManager() {
  const [locations, setLocations] = useState<LocationDef[]>(loadLocations);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [printingIndex, setPrintingIndex] = useState<number | null>(null);
  const [printFormat, setPrintFormat] = useState<'qr' | 'barcode'>('qr');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const addLocation = useCallback(() => {
    const name = locName.trim();
    const code = locCode.trim();
    if (!name || !code) return;

    setLocations((prev) => {
      const next = [...prev, { name, code, createdAt: Date.now() }];
      saveLocations(next);
      return next;
    });
    setLocName('');
    setLocCode('');
    nameInputRef.current?.focus();
  }, [locName, locCode]);

  const removeLocation = useCallback((index: number) => {
    setLocations((prev) => {
      const next = prev.filter((_, i) => i !== index);
      saveLocations(next);
      return next;
    });
    if (printingIndex === index) setPrintingIndex(null);
  }, [printingIndex]);

  const handlePrint = useCallback((index: number) => {
    setPrintingIndex(index);
    setTimeout(() => window.print(), 100);
  }, []);

  useEffect(() => {
    const handler = () => setPrintingIndex(null);
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  const loc = printingIndex !== null ? locations[printingIndex] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Locations & Boxes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Create QR and Barcode labels for physical storage locations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">New Location</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  ref={nameInputRef}
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && locCode.trim()) addLocation(); }}
                  placeholder="e.g. Scaffale A - Ripiano 3, Magazzino Nord"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Code</label>
                <div className="flex items-center gap-2">
                  <input
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && locName.trim()) addLocation(); }}
                    placeholder="e.g. LOC-A03, SHELF-B12"
                    className="input-field font-mono"
                  />
                  <button
                    onClick={() => setLocCode(`LOC-${String(locations.length + 1).padStart(3, '0')}`)}
                    className="flex-shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200"
                    title="Auto-generate"
                  >
                    <Hash size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={addLocation}
                disabled={!locName.trim() || !locCode.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                <Plus size={16} />
                Add Location
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Saved ({locations.length})
            </h3>
            {locations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
                <MapPin size={32} />
                <p className="text-xs">No locations yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {locations.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 group">
                    <span className="text-[10px] font-mono text-slate-600 w-5">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-300 truncate">{l.name}</p>
                      <p className="text-xs font-mono text-slate-500">{l.code}</p>
                    </div>
                    <button
                      onClick={() => handlePrint(i)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-brand-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                      title="Print label"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => removeLocation(i)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Preview</h3>
            {locations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-slate-600">
                <QrCode size={48} />
                <p className="text-xs">Add a location to preview the label</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {locations.map((l, i) => (
                  <div key={i} className="rounded-lg border border-slate-700 bg-white p-4">
                    <div className="flex gap-4 items-center">
                      <QRCodeSVG value={l.code} size={72} level="M" includeMargin />
                      <div className="flex-1 min-w-0 space-y-2">
                        <BarcodeCanvas1D value={l.code} />
                        <div>
                          <p className="text-xs font-bold text-black truncate">{l.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{l.code}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loc && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950 print:bg-white">
          <div className="print:hidden flex items-center justify-between w-full max-w-lg px-6 py-4">
            <h2 className="text-sm font-medium text-slate-300">Stampa Etichetta</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-slate-800 p-0.5">
                <button
                  onClick={() => setPrintFormat('qr')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    printFormat === 'qr' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
                  }`}
                >
                  <QrCode size={12} /> QR
                </button>
                <button
                  onClick={() => setPrintFormat('barcode')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    printFormat === 'barcode' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
                  }`}
                >
                  <Barcode size={12} /> 1D
                </button>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
              >
                <Printer size={14} />
                Stampa Etichetta
              </button>
              <button
                onClick={() => setPrintingIndex(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-20 print:mt-0 print:absolute print:inset-0 print:flex print:items-center print:justify-center">
            <div className="w-[90mm] bg-white rounded-lg p-4 border-2 border-dashed border-gray-400 print:border-black print:rounded-none">
              {printFormat === 'qr' ? (
                <div className="flex gap-4 items-center">
                  <QRCodeSVG value={loc.code} size={96} level="H" includeMargin />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-black leading-tight">{loc.name}</p>
                    <p className="text-xs font-mono text-gray-600 mt-1">{loc.code}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <canvas
                    ref={(el) => {
                      if (el) {
                        try {
                          JsBarcode(el, loc.code, {
                            format: 'CODE128',
                            width: 2,
                            height: 80,
                            displayValue: true,
                            fontSize: 12,
                            margin: 2,
                            background: '#ffffff',
                            lineColor: '#000000',
                          });
                        } catch {}
                      }
                    }}
                    className="w-full"
                  />
                  <div className="text-center">
                    <p className="text-sm font-extrabold text-black leading-tight">{loc.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @media print {
              @page { size: 100mm ${printFormat === 'qr' ? '80mm' : '100mm'}; margin: 0; }
              body * { visibility: hidden; }
              .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
              .print\\:hidden { display: none !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
