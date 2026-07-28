import { useState, useCallback, useEffect, useRef } from 'react';
import { CameraStream } from './CameraStream';
import { useHybridScanner } from '../../hooks/useHybridScanner';
import type { ScanEvent } from '../../types/inventory.types';
import { Camera, Scan, QrCode, Keyboard, X, Check, Search } from 'lucide-react';
import { Badge } from '../common/Badge';

interface SmartBoxScannerProps {
  onProductScanned: (barcode: string) => void;
  onBoxScanned: (barcode: string) => void;
  mode: 'product' | 'box';
  onModeChange: (mode: 'product' | 'box') => void;
}

export function SmartBoxScanner({ onProductScanned, onBoxScanned, mode, onModeChange }: SmartBoxScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(
    (event: ScanEvent) => {
      if (mode === 'product') {
        onProductScanned(event.barcode);
      } else {
        onBoxScanned(event.barcode);
      }
    },
    [mode, onProductScanned, onBoxScanned],
  );

  const { lastScan, clearLastScan, cameraError } = useHybridScanner({
    onGlobalScan: handleScan,
    enabled: true,
  });

  const handleManualSubmit = useCallback(() => {
    const value = manualInput.trim();
    if (!value) return;
    if (mode === 'product') {
      onProductScanned(value);
    } else {
      onBoxScanned(value);
    }
    setManualInput('');
    setShowManual(false);
  }, [manualInput, mode, onProductScanned, onBoxScanned]);

  useEffect(() => {
    if (showManual && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showManual]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onModeChange('product')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === 'product'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Scan size={16} />
            Product
          </div>
        </button>
        <button
          onClick={() => onModeChange('box')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === 'box'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <QrCode size={16} />
            Box
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (cameraActive) {
              setCameraActive(false);
            } else {
              setCameraActive(true);
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            cameraActive
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          <Camera size={16} />
          {cameraActive ? 'Stop Camera' : 'Start Camera'}
        </button>
        <button
          onClick={() => setShowManual(!showManual)}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            showManual
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          <Keyboard size={16} />
          Manual
        </button>
      </div>

      <CameraStream
        active={cameraActive}
        onScan={(barcode) => handleScan({ barcode, source: 'camera', timestamp: Date.now() })}
        onError={() => setCameraActive(false)}
      />

      {cameraError && (
        <p className="text-xs text-red-400">{cameraError}</p>
      )}

      {showManual && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-500/5 p-3">
          <input
            ref={inputRef}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleManualSubmit();
              if (e.key === 'Escape') { setShowManual(false); setManualInput(''); }
            }}
            placeholder={`Enter ${mode === 'product' ? 'product' : 'box'} barcode...`}
            className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => { setShowManual(false); setManualInput(''); }}
            className="rounded-md p-2 text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {lastScan && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-500/10 p-3">
          <Check size={16} className="text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-emerald-300">{lastScan.barcode}</p>
            <p className="text-xs text-emerald-500/70">
              via {lastScan.source} &middot; {new Date(lastScan.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <Badge variant={lastScan.source === 'hardware' ? 'brand' : 'yellow'}>
            {lastScan.source}
          </Badge>
          <button onClick={clearLastScan} className="rounded p-1 text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
        </div>
      )}

      {!cameraActive && !lastScan && (
        <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
          <Scan size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-xs text-slate-500">
            Start camera or use a hardware scanner
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            Hardware scanners are auto-detected
          </p>
        </div>
      )}
    </div>
  );
}
