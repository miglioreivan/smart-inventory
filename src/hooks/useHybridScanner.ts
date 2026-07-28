import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { ScanEvent } from '../types/inventory.types';
import {
  HARDWARE_SCAN_THRESHOLD_MS,
  HARDWARE_SCAN_MIN_LENGTH,
  HARDWARE_SCAN_MAX_LENGTH,
  HARDWARE_SCAN_SUFFIX,
} from '../config/constants';

const LOG_PREFIX = '[SCANNER-DEBUG]';
const LOG_STYLES = {
  info: 'color: #60a5fa',
  warn: 'color: #fbbf24',
  error: 'color: #f87171',
  success: 'color: #34d399',
};

function log(level: keyof typeof LOG_STYLES, ...args: unknown[]) {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(`%c${LOG_PREFIX}`, LOG_STYLES[level], ...args);
}

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
];

const REAR_CAMERA_KEYWORDS = ['back', 'rear', 'environment', 'posteriore', 'facing back', 'facing rear'];

function isRearCamera(label: string): boolean {
  const lower = label.toLowerCase();
  return REAR_CAMERA_KEYWORDS.some((kw) => lower.includes(kw));
}

const FLIP_DEBOUNCE_MS = 600;

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
  const cameraLabelsRef = useRef<string[]>([]);
  const lastFlipRef = useRef(0);
  const flippingRef = useRef(false);
  const cameraDevicesRef = useRef<{ id: string; label: string }[]>([]);

  onGlobalScanRef.current = onGlobalScan;
  modeRef.current = mode;
  debounceRef.current = scanDebounceMs;
  enabledRef.current = enabled;

  log('info', `hook initialized | mode=${mode} | enabled=${enabled} | debounce=${scanDebounceMs}ms`);

  const safeSetState = useCallback(<T>(setter: (value: T) => void, value: T) => {
    if (isMounted.current) setter(value);
  }, []);

  const emitScan = useCallback((barcode: string, source: 'camera' | 'hardware') => {
    if (!isMounted.current) return;
    const now = Date.now();
    if (now - lastScanTimeRef.current < debounceRef.current) {
      log('warn', `scan debounced | barcode="${barcode}" | source=${source} | cooldown=${now - lastScanTimeRef.current}ms`);
      return;
    }
    if (barcode.length < HARDWARE_SCAN_MIN_LENGTH || barcode.length > HARDWARE_SCAN_MAX_LENGTH) {
      log('warn', `scan rejected (length) | barcode="${barcode}" | len=${barcode.length} | min=${HARDWARE_SCAN_MIN_LENGTH} max=${HARDWARE_SCAN_MAX_LENGTH}`);
      return;
    }

    lastScanTimeRef.current = now;
    const event: ScanEvent = { barcode, source, timestamp: now };
    safeSetState(setLastScan, event);
    log('success', `scan emitted | barcode="${barcode}" | source=${source} | mode=${modeRef.current}`);

    if (modeRef.current === 'form') {
      const el = document.activeElement;
      if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        el.value = barcode;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        log('info', `form mode: injected into focused element <${el.tagName.toLowerCase()}>`);
        return;
      }
      log('warn', 'form mode: no focused input element found');
    }

    if (modeRef.current === 'search' && onGlobalScanRef.current) {
      log('info', 'search mode: dispatching to onGlobalScan');
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
          log('success', `hardware scanner detected | barcode="${barcode}" | interval=${interval}ms`);
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

    log('info', 'hardware keydown listener attached (capture phase)');
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      log('info', 'hardware keydown listener removed');
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [emitScan]);

  const doStartCamera = useCallback(async (cameraId: string, label?: string) => {
    if (!isMounted.current) { log('warn', 'doStartCamera aborted: component unmounted'); return; }

    log('info', `doStartCamera | cameraId=${cameraId} | label="${label ?? 'unknown'}"`);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          log('info', 'stopping previous camera stream...');
          await scannerRef.current.stop();
          log('info', 'previous camera stream stopped');
        }
      } catch (err) {
        log('error', 'error stopping previous stream', err);
      }
      try {
        scannerRef.current.clear();
      } catch (err) {
        log('error', 'error clearing scanner', err);
      }
      scannerRef.current = null;
    }

    const existing = document.getElementById(CAMERA_ELEMENT_ID);
    if (!existing) {
      const div = document.createElement('div');
      div.id = CAMERA_ELEMENT_ID;
      div.style.display = 'none';
      document.body.appendChild(div);
      log('info', 'created hidden camera DOM element');
    }

    log('info', `initializing Html5Qrcode with ${SUPPORTED_FORMATS.length} format(s)`);
    scannerRef.current = new Html5Qrcode(CAMERA_ELEMENT_ID, {
      formatsToSupport: SUPPORTED_FORMATS,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });

    await scannerRef.current.start(
      { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] },
      {
        fps: 10,
        qrbox: { width: 300, height: 150 },
      },
      (decodedText) => {
        if (isMounted.current) {
          log('success', `camera decoded | text="${decodedText}"`);
          emitScan(decodedText, 'camera');
        }
      },
      () => {
        log('warn', 'camera scan attempt produced no result (default callback)');
      },
    );

    if (isMounted.current) {
      log('success', `camera started successfully | cameraId=${cameraId}`);
      safeSetState(setIsCameraActive, true);
      safeSetState(setActiveCameraId, cameraId);
    }
  }, [emitScan, safeSetState]);

  const startCamera = useCallback(async () => {
    log('info', 'startCamera() called');
    safeSetState(setCameraError, null);
    try {
      const devices = await Html5Qrcode.getCameras();
      log('info', `getCameras() returned ${devices.length} device(s)`);
      devices.forEach((d, i) => log('info', `  device[${i}] id="${d.id}" label="${d.label}"`));

      if (devices.length === 0) throw new Error('No cameras found');

      cameraDevicesRef.current = devices.map((d) => ({ id: d.id, label: d.label }));
      const ids = devices.map((d) => d.id);
      const labels = devices.map((d) => d.label);
      safeSetState(setAvailableCameras, ids);
      cameraLabelsRef.current = labels;

      let rearIdx = labels.findIndex((l) => isRearCamera(l));
      if (rearIdx < 0) {
        rearIdx = ids.length - 1;
        log('warn', `no rear camera detected by label, defaulting to last device index=${rearIdx} label="${labels[rearIdx]}"`);
      } else {
        log('info', `rear camera selected: index=${rearIdx} label="${labels[rearIdx]}" id="${ids[rearIdx]}"`);
      }
      cameraIndexRef.current = rearIdx;

      await doStartCamera(ids[rearIdx], labels[rearIdx]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied or unavailable';
      log('error', `startCamera FAILED | message="${message}"`, err);
      safeSetState(setCameraError, message);
      safeSetState(setIsCameraActive, false);
    }
  }, [doStartCamera, safeSetState]);

  const flipCamera = useCallback(async () => {
    const now = Date.now();
    if (flippingRef.current || now - lastFlipRef.current < FLIP_DEBOUNCE_MS) {
      log('warn', `flipCamera debounced (${now - lastFlipRef.current}ms since last flip)`);
      return;
    }
    if (availableCameras.length < 2) {
      log('warn', 'flipCamera: only 1 camera available, cannot flip');
      return;
    }

    log('info', `flipCamera: switching from index=${cameraIndexRef.current}`);
    flippingRef.current = true;
    lastFlipRef.current = now;

    try {
      cameraIndexRef.current = (cameraIndexRef.current + 1) % availableCameras.length;
      const label = cameraLabelsRef.current[cameraIndexRef.current] ?? '';
      log('info', `flipCamera: switching to index=${cameraIndexRef.current} label="${label}"`);
      await doStartCamera(availableCameras[cameraIndexRef.current], label);
    } catch (err) {
      log('error', 'flipCamera FAILED, attempting fallback', err);
      try {
        cameraIndexRef.current = (cameraIndexRef.current - 1 + availableCameras.length) % availableCameras.length;
        await doStartCamera(availableCameras[cameraIndexRef.current]);
      } catch (err2) {
        log('error', 'flipCamera fallback also FAILED', err2);
      }
    } finally {
      flippingRef.current = false;
      log('info', 'flipCamera completed');
    }
  }, [availableCameras, doStartCamera]);

  const stopCamera = useCallback(async () => {
    log('info', 'stopCamera() called');
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
          log('info', 'camera stream stopped');
        }
        scannerRef.current.clear();
        log('info', 'scanner cleared');
      }
    } catch (err) {
      log('error', 'stopCamera error', err);
    }
    scannerRef.current = null;
    safeSetState(setIsCameraActive, false);
    safeSetState(setActiveCameraId, null);
    safeSetState(setAvailableCameras, []);

    try {
      const el = document.getElementById(CAMERA_ELEMENT_ID);
      if (el) {
        el.remove();
        log('info', 'camera DOM element removed');
      }
    } catch (err) {
      log('error', 'error removing camera DOM element', err);
    }
  }, [safeSetState]);

  useEffect(() => {
    isMounted.current = true;
    log('info', 'useHybridScanner mounted');
    return () => {
      log('info', 'useHybridScanner unmounting — cleaning up');
      isMounted.current = false;
      try {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
            log('info', 'unmount: camera stream stopped');
          }
          scannerRef.current.clear();
          log('info', 'unmount: scanner cleared');
        }
      } catch (err) {
        log('error', 'unmount cleanup error', err);
      }
      scannerRef.current = null;
      try {
        const el = document.getElementById(CAMERA_ELEMENT_ID);
        if (el) {
          el.remove();
          log('info', 'unmount: camera DOM element removed');
        }
      } catch (err) {
        log('error', 'unmount: error removing DOM element', err);
      }
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
