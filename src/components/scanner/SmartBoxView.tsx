import { useState, useCallback, useMemo } from 'react';
import { SmartBoxScanner } from './SmartBoxScanner';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { searchIcon, Select, Check } from 'lucide-react';
import { Package, PackageCheck, Box, X, Plus, Hash, MapPin, ArrowLeft } from 'lucide-react';

interface BoxItem {
  barcode: string;
  name: string;
  location: string;
  scannedAt: number;
}

interface SmartBox {
  id: string;
  barcode: string;
  label: string;
  items: BoxItem[];
  createdAt: number;
}

interface SmartBoxViewProps {
  data: string[][];
  columns: { label: string; type: string }[];
  barcodeColIndex: number;
  locationColIndex: number;
  nameColIndex: number;
  onScanProductToBox: (productBarcode: string, boxBarcode: string) => void;
  onClose: () => void;
}

export function SmartBoxView({
  data,
  columns,
  barcodeColIndex,
  locationColIndex,
  nameColIndex,
  onScanProductToBox,
  onClose,
}: SmartBoxViewProps) {
  const [mode, setMode] = useState<'product' | 'box'>('box');
  const [boxes, setBoxes] = useState<SmartBox[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [boxLabel, setBoxLabel] = useState('');

  const activeBox = useMemo(() => boxes.find((b) => b.id === activeBoxId) ?? null, [boxes, activeBoxId]);

  const findProduct = useCallback(
    (barcode: string): BoxItem | null => {
      const row = data.slice(1).find((r) => String(r[barcodeColIndex] ?? '').trim() === barcode);
      if (!row) return null;
      return {
        barcode,
        name: String(row[nameColIndex] ?? 'Unknown'),
        location: String(row[locationColIndex] ?? '—'),
        scannedAt: Date.now(),
      };
    },
    [data, barcodeColIndex, nameColIndex, locationColIndex],
  );

  const handleBoxScanned = useCallback(
    (barcode: string) => {
      const existing = boxes.find((b) => b.barcode === barcode);
      if (existing) {
        setActiveBoxId(existing.id);
        setMode('product');
        return;
      }
      const newBox: SmartBox = {
        id: crypto.randomUUID(),
        barcode,
        label: `Box ${boxes.length + 1}`,
        items: [],
        createdAt: Date.now(),
      };
      setBoxes((prev) => [...prev, newBox]);
      setActiveBoxId(newBox.id);
      setBoxLabel(newBox.label);
      setMode('product');
    },
    [boxes],
  );

  const handleProductScanned = useCallback(
    (barcode: string) => {
      if (!activeBoxId) return;
      const product = findProduct(barcode);
      if (!product) return;
      onScanProductToBox(barcode, boxes.find((b) => b.id === activeBoxId)?.barcode ?? '');

      setBoxes((prev) =>
        prev.map((box) => {
          if (box.id !== activeBoxId) return box;
          const exists = box.items.some((i) => i.barcode === barcode);
          if (exists) return box;
          return { ...box, items: [...box.items, product] };
        }),
      );
    },
    [activeBoxId, boxes, findProduct, onScanProductToBox],
  );

  const removeItem = useCallback((boxId: string, barcode: string) => {
    setBoxes((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, items: box.items.filter((i) => i.barcode !== barcode) }
          : box,
      ),
    );
  }, []);

  const removeBox = useCallback((boxId: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== boxId));
    if (activeBoxId === boxId) setActiveBoxId(null);
  }, [activeBoxId]);

  const totalItems = boxes.reduce((sum, b) => sum + b.items.length, 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Smart Boxes</h3>
          <span className="text-xs text-slate-500">{boxes.length} box{boxes.length !== 1 ? 'es' : ''} &middot; {totalItems} items</span>
        </div>

        <SmartBoxScanner
          onProductScanned={handleProductScanned}
          onBoxScanned={handleBoxScanned}
          mode={mode}
          onModeChange={setMode}
        />

        {activeBox && (
          <div className="rounded-lg border border-brand-700/50 bg-brand-600/5 p-3">
            <div className="flex items-center gap-2">
              <input
                value={boxLabel}
                onChange={(e) => {
                  setBoxLabel(e.target.value);
                  setBoxes((prev) =>
                    prev.map((b) => (b.id === activeBoxId ? { ...b, label: e.target.value } : b)),
                  );
                }}
                className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm font-medium text-slate-200 focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={() => { setActiveBoxId(null); setMode('box'); }}
                className="rounded p-1 text-slate-500 hover:text-slate-300"
              >
                <ArrowLeft size={14} />
              </button>
            </div>
            <p className="mt-1 text-xs font-mono text-slate-500">{activeBox.barcode}</p>
            <p className="mt-1 text-xs text-slate-500">{activeBox.items.length} item{activeBox.items.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {boxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Box size={40} className="text-slate-700" />
            <p className="text-sm text-slate-500">No boxes created</p>
            <p className="text-xs text-slate-600">Scan a box barcode to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {boxes.map((box) => {
              const isActive = box.id === activeBoxId;
              return (
                <div
                  key={box.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isActive ? 'border-brand-700/50 bg-brand-600/5' : 'border-slate-800 bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => { setActiveBoxId(box.id); setMode('product'); }}
                    >
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <PackageCheck size={18} className="text-brand-400" />
                        ) : (
                          <Package size={18} className="text-slate-500" />
                        )}
                        <span className={`font-medium ${isActive ? 'text-brand-300' : 'text-slate-300'}`}>
                          {box.label}
                        </span>
                        <Badge variant={isActive ? 'brand' : 'default'}>
                          {box.items.length} items
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-mono text-slate-600">{box.barcode}</p>
                    </div>
                    <button
                      onClick={() => removeBox(box.id)}
                      className="rounded p-1 text-slate-600 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {box.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {box.items.map((item) => (
                        <div
                          key={item.barcode}
                          className="flex items-center gap-2 rounded-md bg-slate-800/50 px-3 py-1.5"
                        >
                          <Hash size={12} className="text-slate-600" />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{item.name}</span>
                          <span className="text-xs font-mono text-slate-600">{item.barcode}</span>
                          <MapPin size={12} className="text-slate-600" />
                          <span className="text-xs text-slate-500">{item.location}</span>
                          <button
                            onClick={() => removeItem(box.id, item.barcode)}
                            className="rounded p-0.5 text-slate-600 hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {box.items.length === 0 && (
                    <p className="mt-2 text-xs text-slate-600">No items scanned yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
