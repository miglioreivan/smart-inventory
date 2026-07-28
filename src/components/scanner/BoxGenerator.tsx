import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { Printer, QrCode, Box, Hash, X, Plus } from 'lucide-react';

interface BoxDef {
  name: string;
  code: string;
  createdAt: number;
}

function BarcodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 50,
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
  }, [value]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 50 }} />;
}

export function BoxGenerator() {
  const [boxes, setBoxes] = useState<BoxDef[]>([]);
  const [boxName, setBoxName] = useState('');
  const [boxCode, setBoxCode] = useState('');
  const [printingIndex, setPrintingIndex] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const addBox = useCallback(() => {
    const name = boxName.trim();
    const code = boxCode.trim();
    if (!name || !code) return;

    setBoxes((prev) => [...prev, { name, code, createdAt: Date.now() }]);
    setBoxName('');
    setBoxCode('');
    nameInputRef.current?.focus();
  }, [boxName, boxCode]);

  const removeBox = useCallback((index: number) => {
    setBoxes((prev) => prev.filter((_, i) => i !== index));
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

  const box = printingIndex !== null ? boxes[printingIndex] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gestione Box & Etichette</h2>
          <p className="text-xs text-slate-500 mt-0.5">Create QR/Barcode labels for physical storage boxes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">New Box</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Box Name</label>
                <input
                  ref={nameInputRef}
                  value={boxName}
                  onChange={(e) => setBoxName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && boxCode.trim()) addBox(); }}
                  placeholder="e.g. Scatola A1, Shelf 3-C, Magazzino Nord"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Box Code</label>
                <div className="flex items-center gap-2">
                  <input
                    value={boxCode}
                    onChange={(e) => setBoxCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && boxName.trim()) addBox(); }}
                    placeholder="e.g. BOX-8001, SCAN-ME-001"
                    className="input-field font-mono"
                  />
                  <button
                    onClick={() => setBoxCode(`BOX-${String(boxes.length + 1).padStart(4, '0')}`)}
                    className="flex-shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200"
                    title="Auto-generate code"
                  >
                    <Hash size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={addBox}
                disabled={!boxName.trim() || !boxCode.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                <Plus size={16} />
                Add Box
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Saved Boxes ({boxes.length})
            </h3>
            {boxes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
                <Box size={32} />
                <p className="text-xs">No boxes yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {boxes.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 group"
                  >
                    <span className="text-[10px] font-mono text-slate-600 w-5">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-300 truncate">{b.name}</p>
                      <p className="text-xs font-mono text-slate-500">{b.code}</p>
                    </div>
                    <button
                      onClick={() => handlePrint(i)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-brand-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                      title="Print label"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => removeBox(i)}
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
            {boxes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-slate-600">
                <QrCode size={48} />
                <p className="text-xs">Add a box to see the QR/Barcode preview</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {boxes.map((b, i) => (
                  <div key={i} className="rounded-lg border border-slate-700 bg-white p-4">
                    <div className="flex gap-4 items-center">
                      <QRCodeSVG value={b.code} size={72} level="M" includeMargin />
                      <div className="flex-1 min-w-0 space-y-2">
                        <BarcodeCanvas value={b.code} />
                        <div>
                          <p className="text-xs font-bold text-black truncate">{b.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{b.code}</p>
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

      {box && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950 print:bg-white">
          <div className="print:hidden flex items-center justify-between w-full max-w-lg px-6 py-4">
            <h2 className="text-sm font-medium text-slate-300">Print Label</h2>
            <div className="flex items-center gap-2">
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
              <div className="flex gap-4 items-center">
                <QRCodeSVG value={box.code} size={96} level="H" includeMargin />
                <div className="flex-1 min-w-0 space-y-2">
                  <canvas
                    ref={(el) => {
                      if (el) {
                        try {
                          JsBarcode(el, box.code, {
                            format: 'CODE128',
                            width: 2,
                            height: 60,
                            displayValue: false,
                            margin: 0,
                            background: '#ffffff',
                            lineColor: '#000000',
                          });
                        } catch {}
                      }
                    }}
                    className="w-full"
                    style={{ height: 60 }}
                  />
                  <div className="mt-1">
                    <p className="text-sm font-extrabold text-black leading-tight">{box.name}</p>
                    <p className="text-xs font-mono text-gray-600 mt-0.5">{box.code}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @media print {
              @page { size: 100mm 80mm; margin: 0; }
              body * { visibility: hidden; }
              .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
              .print\\:hidden { display: none !important; }
              .print\\:bg-white { background: #fff !important; }
              .print\\:absolute { position: absolute !important; }
              .print\\:inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
              .print\\:flex { display: flex !important; }
              .print\\:items-center { align-items: center !important; }
              .print\\:justify-center { justify-content: center !important; }
              .print\\:mt-0 { margin-top: 0 !important; }
              .print\\:rounded-none { border-radius: 0 !important; }
              .print\\:border-black { border-color: #000 !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
