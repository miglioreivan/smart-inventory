import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  availableCameras: string[];
  activeCameraId: string | null;
  flipCamera: () => Promise<void>;
}

const CAMERA_ELEMENT_ID = 'hybrid-scanner-camera';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
];

export function useHybridScanner({
  onGlobalScan,
  mode = 'search',
  enabled = true,
  scanDebounceMs = 500,
}: UseHybridScannerOptions = {}): UseHybridScannerResult {
  const [lastScan, setLastScan] = useState<ScanEvent | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  const isMounted = useRef(true);
  const onGlobalScanRef = useRef(onGlobalScan);
  const modeRef = useRef(mode);
  const debounceRef = useRef(scanDebounceMs);
  const enabledRef = useRef(enabled);
  const lastScanTimeRef = useRef(0);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraIndexRef = useRef(0);

  onGlobalScanRef.current = onGlobalScan;
  modeRef.current = mode;
  debounceRef.current = scanDebounceMs;
  enabledRef.current = enabled;

  const safeSetState = useCallback(<T>(setter: (value: T) => void, value: T) => {
    if (isMounted.current) setter(value);
  }, []);

  const emitScan = useCallback((barcode: string, source: 'camera' | 'hardware') => {
    if (!isMounted.current) return;
    const now = Date.now();
    if (now - lastScanTimeRef.current < debounceRef.current) return;
    if (barcode.length < HARDWARE_SCAN_MIN_LENGTH || barcode.length > HARDWARE_SCAN_MAX_LENGTH) return;

    lastScanTimeRef.current = now;
    const event: ScanEvent = { barcode, source, timestamp: now };
    safeSetState(setLastScan, event);

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
  }, [safeSetState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current || !isMounted.current) return;

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName ?? '')) {
        if (modeRef.current !== 'form') return;
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

  const doStartCamera = useCallback(async (cameraId: string) => {
    if (scannerRef.current?.isScanning) {
      try { await scannerRef.current.stop(); } catch {}
    }

    const existing = document.getElementById(CAMERA_ELEMENT_ID);
    if (!existing) {
      const div = document.createElement('div');
      div.id = CAMERA_ELEMENT_ID;
      div.style.display = 'none';
      document.body.appendChild(div);
    }

    scannerRef.current = new Html5Qrcode(CAMERA_ELEMENT_ID, {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false,
    });

    await scannerRef.current.start(
      { deviceId: { exact: cameraId } },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      (decodedText) => {
        if (isMounted.current) emitScan(decodedText, 'camera');
      },
      () => {},
    );

    safeSetState(setIsCameraActive, true);
    safeSetState(setActiveCameraId, cameraId);
  }, [emitScan, safeSetState]);

  const startCamera = useCallback(async () => {
    safeSetState(setCameraError, null);
    try {
      const cameras = await Html5Qrcode.getCameras();
      const ids = cameras.map((c) => c.id);
      if (ids.length === 0) throw new Error('No cameras found');
      safeSetState(setAvailableCameras, ids);

      const backIdx = ids.findIndex((id) =>
        id.toLowerCase().includes('back') || id.toLowerCase().includes('environment'),
      );
      cameraIndexRef.current = backIdx >= 0 ? backIdx : 0;
      await doStartCamera(ids[cameraIndexRef.current]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied or unavailable';
      safeSetState(setCameraError, message);
      safeSetState(setIsCameraActive, false);
    }
  }, [doStartCamera, safeSetState]);

  const flipCamera = useCallback(async () => {
    if (availableCameras.length < 2) return;
    cameraIndexRef.current = (cameraIndexRef.current + 1) % availableCameras.length;
    try {
      await doStartCamera(availableCameras[cameraIndexRef.current]);
    } catch {
      // fall back to first camera
    }
  }, [availableCameras, doStartCamera]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {}
    scannerRef.current = null;
    safeSetState(setIsCameraActive, false);
    safeSetState(setActiveCameraId, null);
    safeSetState(setAvailableCameras, []);

    try {
      const el = document.getElementById(CAMERA_ELEMENT_ID);
      if (el) el.remove();
    } catch {}
  }, [safeSetState]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      try {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {}
      scannerRef.current = null;
      try {
        const el = document.getElementById(CAMERA_ELEMENT_ID);
        if (el) el.remove();
      } catch {}
    };
  }, []);

  const clearLastScan = useCallback(() => {
    if (isMounted.current) setLastScan(null);
  }, []);

  return {
    isCameraActive,
    startCamera,
    stopCamera,
    lastScan,
    clearLastScan,
    cameraError,
    availableCameras,
    activeCameraId,
    flipCamera,
  };
}
