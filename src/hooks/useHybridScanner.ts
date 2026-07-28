import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import type { ScanEvent } from '../types/inventory.types';
import {
  HARDWARE_SCAN_THRESHOLD_MS,
  HARDWARE_SCAN_MIN_LENGTH,
  HARDWARE_SCAN_MAX_LENGTH,
  HARDWARE_SCAN_SUFFIX,
} from '../config/constants';

export type ScannerMode = 'search' | 'form';

interface UseHybridScannerOptions {
  onGlobalScan?: (event: ScanEvent) => void;
  mode?: ScannerMode;
  enabled?: boolean;
  scanDebounceMs?: number;
}

interface UseHybridScannerResult {
  isCameraActive: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  lastScan: ScanEvent | null;
  clearLastScan: () => void;
  cameraError: string | null;
}

const CAMERA_ELEMENT_ID = 'hybrid-scanner-camera';

export function useHybridScanner({
  onGlobalScan,
  mode = 'search',
  enabled = true,
  scanDebounceMs = 500,
}: UseHybridScannerOptions = {}): UseHybridScannerResult {
  const [lastScan, setLastScan] = useState<ScanEvent | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const onGlobalScanRef = useRef(onGlobalScan);
  const modeRef = useRef(mode);
  const debounceRef = useRef(scanDebounceMs);
  const enabledRef = useRef(enabled);
  const lastScanTimeRef = useRef(0);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  onGlobalScanRef.current = onGlobalScan;
  modeRef.current = mode;
  debounceRef.current = scanDebounceMs;
  enabledRef.current = enabled;

  const emitScan = useCallback((barcode: string, source: 'camera' | 'hardware') => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < debounceRef.current) return;
    if (barcode.length < HARDWARE_SCAN_MIN_LENGTH || barcode.length > HARDWARE_SCAN_MAX_LENGTH) return;

    lastScanTimeRef.current = now;
    const event: ScanEvent = { barcode, source, timestamp: now };
    setLastScan(event);

    if (modeRef.current === 'form') {
      const el = document.activeElement;
      if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        el.value = barcode;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }

    if (modeRef.current === 'search' && onGlobalScanRef.current) {
      onGlobalScanRef.current(event);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName ?? '')) {
        if (modeRef.current === 'form') {
          // allow keyboard passthrough in form mode — hardware scanner still intercepted below
        } else {
          return;
        }
      }

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === HARDWARE_SCAN_SUFFIX) {
        if (interval < HARDWARE_SCAN_THRESHOLD_MS && bufferRef.current.length >= HARDWARE_SCAN_MIN_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          const barcode = bufferRef.current;
          bufferRef.current = '';
          emitScan(barcode, 'hardware');
        } else {
          bufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (interval > 0 && interval < HARDWARE_SCAN_THRESHOLD_MS) {
          bufferRef.current += e.key;
        } else {
          bufferRef.current = e.key;
        }
      } else {
        bufferRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [emitScan]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const existing = document.getElementById(CAMERA_ELEMENT_ID);
      if (!existing) {
        const div = document.createElement('div');
        div.id = CAMERA_ELEMENT_ID;
        div.style.display = 'none';
        document.body.appendChild(div);
      }

      scannerRef.current = new Html5Qrcode(CAMERA_ELEMENT_ID);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          emitScan(decodedText, 'camera');
        },
        () => {},
      );

      setIsCameraActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied or unavailable';
      setCameraError(message);
      setIsCameraActive(false);
    }
  }, [emitScan]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {
      // scanner may already be stopped
    }
    scannerRef.current = null;
    setIsCameraActive(false);

    const el = document.getElementById(CAMERA_ELEMENT_ID);
    if (el) el.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      const el = document.getElementById(CAMERA_ELEMENT_ID);
      if (el) el.remove();
    };
  }, []);

  const clearLastScan = useCallback(() => setLastScan(null), []);

  return {
    isCameraActive,
    startCamera,
    stopCamera,
    lastScan,
    clearLastScan,
    cameraError,
  };
}
