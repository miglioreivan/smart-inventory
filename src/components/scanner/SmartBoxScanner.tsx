import { useState, useCallback, useEffect, useRef } from 'react';
import { CameraStream } from './CameraStream';
import { useHybridScanner } from '../../hooks/useHybridScanner';
import type { ScanEvent } from '../../types/inventory.types';
import { Camera, Scan, QrCode, Keyboard, X, Check, Search, Repeat } from 'lucide-react';
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

  const { lastScan, clearLastScan, cameraError, startCamera, stopCamera, availableCameras, flipCamera, activeCameraId } = useHybridScanner({
    onGlobalScan: handleScan,
    enabled: true,
  });

  const handleToggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
      setCameraActive(false);
    } else {
      startCamera();
      setCameraActive(true);
    }
  }, [cameraActive, startCamera, stopCamera]);

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

  const showFlipButton = availableCameras.length > 1;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onModeChange('product')}
          className={`flex-1 rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
            mode === 'product'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <Scan size={14} className="sm:size-4" />
            <span className="hidden sm:inline">Product</span>
          </div>
        </button>
        <button
          onClick={() => onModeChange('box')}
          className={`flex-1 rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
            mode === 'box'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <QrCode size={14} className="sm:size-4" />
            <span className="hidden sm:inline">Box</span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={handleToggleCamera}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
            cameraActive
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          <Camera size={14} className="sm:size-4" />
          <span className="hidden sm:inline">{cameraActive ? 'Stop' : 'Start'} Camera</span>
        </button>
        {showFlipButton && cameraActive && (
          <button
            onClick={flipCamera}
            className="flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-colors"
            title="Flip camera"
          >
            <Repeat size={14} className="sm:size-4" />
          </button>
        )}
        <button
          onClick={() => setShowManual(!showManual)}
          className={`flex items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
            showManual
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
          }`}
        >
          <Keyboard size={14} className="sm:size-4" />
        </button>
      </div>

      <CameraStream
        active={cameraActive}
        onScan={(barcode) => handleScan({ barcode, source: 'camera', timestamp: Date.now() })}
        onError={() => setCameraActive(false)}
        cameraId={activeCameraId}
      />

      {cameraError && (
        <p className="text-xs text-red-400">{cameraError}</p>
      )}

      {showManual && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-500/5 p-2 sm:p-3">
          <input
            ref={inputRef}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleManualSubmit();
              if (e.key === 'Escape') { setShowManual(false); setManualInput(''); }
            }}
            placeholder={`Enter ${mode === 'product' ? 'product' : 'box'} barcode...`}
            className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="rounded-md bg-brand-600 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            <Search size={14} className="sm:size-4" />
          </button>
          <button
            onClick={() => { setShowManual(false); setManualInput(''); }}
            className="rounded-md p-1.5 sm:p-2 text-slate-500 hover:text-slate-300"
          >
            <X size={14} className="sm:size-4" />
          </button>
        </div>
      )}

      {lastScan && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-500/10 p-2 sm:p-3">
          <Check size={14} className="sm:size-4 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs sm:text-sm text-emerald-300">{lastScan.barcode}</p>
            <p className="text-[10px] sm:text-xs text-emerald-500/70">
              via {lastScan.source} &middot; {new Date(lastScan.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <Badge variant={lastScan.source === 'hardware' ? 'brand' : 'yellow'}>
            {lastScan.source}
          </Badge>
          <button onClick={clearLastScan} className="rounded p-1 text-slate-500 hover:text-slate-300">
            <X size={12} className="sm:size-3.5" />
          </button>
        </div>
      )}

      {!cameraActive && !lastScan && (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 sm:p-6 text-center">
          <Scan size={20} className="sm:size-6 mx-auto mb-2 text-slate-600" />
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
