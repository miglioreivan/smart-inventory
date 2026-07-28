import { useRef, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { Printer, Download } from 'lucide-react';

interface LabelItem {
  barcode: string;
  label: string;
  subtitle?: string;
}

interface BarcodePrinterProps {
  items: LabelItem[];
  title?: string;
  format: 'A4' | 'Thermal';
  onClose: () => void;
}

function BarcodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 40,
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
          ctx.fillText(value, 4, 20);
        }
      }
    }
  }, [value]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 40 }} />;
}

export function BarcodePrinter({ items, title, format, onClose }: BarcodePrinterProps) {
  const safeTitle = title || 'SmartInventory Labels';

  const labels = useMemo(() => {
    const count = items.length;
    if (count === 0) {
      return [{ barcode: '000000', label: 'Empty', subtitle: '' }];
    }

    return items.map((item) => ({
      barcode: item.barcode,
      label: item.label.length > 28 ? item.label.slice(0, 25) + '...' : item.label,
      subtitle: item.subtitle ?? '',
    }));
  }, [items]);

  const isThermal = format === 'Thermal';
  const cols = isThermal ? 1 : 2;
  const labelWidth = isThermal ? '58mm' : '48%';
  const labelHeight = isThermal ? '35mm' : undefined;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">
      <div className="print:hidden flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <h2 className="text-sm font-medium text-slate-300">{safeTitle}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{items.length} label{items.length !== 1 ? 's' : ''}</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="mx-auto flex flex-wrap gap-3 justify-center"
          style={isThermal ? { maxWidth: '62mm' } : { maxWidth: '210mm' }}
        >
          {labels.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 rounded-lg border border-slate-700 p-3 bg-white text-black print:border-black print:border-dashed"
              style={{ width: labelWidth, minHeight: labelHeight }}
            >
              <div className="flex gap-3 items-center justify-center w-full">
                <QRCodeSVG
                  value={item.barcode}
                  size={isThermal ? 48 : 64}
                  level="M"
                  includeMargin
                />
                <div className="flex-1 min-w-0">
                  <BarcodeCanvas value={item.barcode} />
                </div>
              </div>
              <div className="text-center w-full mt-1">
                <p className="text-[10px] font-bold leading-tight truncate" style={{ color: '#000' }}>
                  {item.label}
                </p>
                {item.subtitle && (
                  <p className="text-[8px] leading-tight truncate" style={{ color: '#555' }}>
                    {item.subtitle}
                  </p>
                )}
                <p className="text-[8px] font-mono mt-0.5" style={{ color: '#333' }}>
                  {item.barcode}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: ${isThermal ? '58mm auto' : 'A4'};
            margin: ${isThermal ? '2mm' : '8mm'};
          }
          body * {
            visibility: hidden;
          }
          .fixed.inset-0,
          .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 .print\\:hidden {
            display: none !important;
          }
          .print\\:border-black {
            border-color: #000 !important;
          }
          .print\\:border-dashed {
            border-style: dashed !important;
          }
        }
      `}</style>
    </div>
  );
}
