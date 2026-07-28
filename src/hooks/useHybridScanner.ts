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

const REAR_CAMERA_KEYWORDS = ['back', 'rear', 'environment', 'posteriore', 'facing back', 'facing rear'];

function isRearCamera(label: string): boolean {
  return REAR_CAMERA_KEYWORDS.some((kw) => label.toLowerCase().includes(kw));
}

export function useHybridScanner({
  onGlobalScan,
  mode = 'search',
  enabled = true,
  scanDebounceMs = 500,
}: UseHybridScannerOptions = {}) {
  const [lastScan, setLastScan] = useState<ScanEvent | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{id: string, label: string}[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  const isMounted = useRef(true);
  const onGlobalScanRef = useRef(onGlobalScan);
  const modeRef = useRef(mode);
  const debounceRef = useRef(scanDebounceMs);
  const enabledRef = useRef(enabled);
  const lastScanTimeRef = useRef(0);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  onGlobalScanRef.current = onGlobalScan;
  modeRef.current = mode;
  debounceRef.current = scanDebounceMs;
  enabledRef.current = enabled;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const emitScan = useCallback((barcode: string, source: 'camera' | 'hardware') => {
    if (!isMounted.current) return;
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

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) throw new Error('No cameras found');

      setAvailableCameras(devices.map(d => ({ id: d.id, label: d.label })));
      
      let rearIdx = devices.findIndex((d) => isRearCamera(d.label));
      if (rearIdx < 0) rearIdx = devices.length - 1;

      setActiveCameraId(devices[rearIdx].id);
      setIsCameraActive(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Camera access denied');
      setIsCameraActive(false);
    }
  }, []);

  const flipCamera = useCallback(async () => {
    if (availableCameras.length < 2) return;
    const currentIdx = availableCameras.findIndex(c => c.id === activeCameraId);
    const nextIdx = (currentIdx + 1) % availableCameras.length;
    setActiveCameraId(availableCameras[nextIdx].id);
  }, [availableCameras, activeCameraId]);

  const stopCamera = useCallback(() => {
    setIsCameraActive(false);
    // Non azzeriamo l'activeCameraId così alla riaccensione ricorda l'ultima fotocamera usata
  }, []);

  return {
    isCameraActive,
    startCamera,
    stopCamera,
    lastScan,
    clearLastScan: () => setLastScan(null),
    cameraError,
    availableCameras: availableCameras.map(c => c.id), // backward compat per i componenti parent
    activeCameraId,
    flipCamera,
  };
}
