import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, AlertTriangle } from 'lucide-react';

const LOG_PREFIX = '[CAMERA-STREAM]';

interface CameraStreamProps {
  active: boolean;
  onScan: (barcode: string) => void;
  onError: (error: string) => void;
  cameraMode?: 'environment' | 'user';
}

const VIEWPORT_ID = 'camera-stream-viewport';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
];

export function CameraStream({ active, onScan, onError, cameraMode = 'environment' }: CameraStreamProps) {
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const isMounted = useRef(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Use refs to avoid re-triggering useEffect on every render
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      try {
        if (scannerRef.current?.isScanning) {
          const p = scannerRef.current.stop();
          if (p && p.then) {
            p.then(() => {
              try { scannerRef.current?.clear(); } catch (e) {}
            }).catch(() => {});
          }
        } else {
          try { scannerRef.current?.clear(); } catch (e) {}
        }
      } catch (err) {
        console.warn(LOG_PREFIX, 'Ignored sync stop error', err);
      }
      scannerRef.current = null;
      if (isMounted.current) setStatus('loading');
      return;
    }

    let cancelled = false;

    const start = async () => {
      // Piccolo delay per dare tempo al DOM e a fotocamere precedenti di liberare la risorsa
      await new Promise(r => setTimeout(r, 200));
      if (cancelled || !isMounted.current) return;

      const el = document.getElementById(VIEWPORT_ID);
      if (!el) return;

      try {
        scannerRef.current = new Html5Qrcode(VIEWPORT_ID, {
          formatsToSupport: SUPPORTED_FORMATS,
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });

        const videoConstraints = { facingMode: cameraMode };

        await scannerRef.current.start(
          videoConstraints,
          {
            fps: 10,
            qrbox: { width: 250, height: 150 }, // Rettangolo per EAN-13, compatibile con mobile
          },
          (decodedText) => {
            if (!cancelled && isMounted.current) {
              onScanRef.current(decodedText);
            }
          },
          () => {} // Nasconde gli errori di frame vuoti
        );

        if (!cancelled && isMounted.current) {
          setStatus('active');
        }
      } catch (err) {
        console.error(LOG_PREFIX, 'camera start failed', err);
        if (!cancelled && isMounted.current) {
          setStatus('error');
          onErrorRef.current(err instanceof Error ? err.message : 'Camera error');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      try {
        if (scannerRef.current?.isScanning) {
          const p = scannerRef.current.stop();
          if (p && p.then) {
            p.then(() => {
              try { scannerRef.current?.clear(); } catch (e) {}
            }).catch(() => {});
          }
        } else {
          try { scannerRef.current?.clear(); } catch (e) {}
        }
      } catch (err) {
        console.warn(LOG_PREFIX, 'Ignored unmount stop error', err);
      }
    };
  }, [active, cameraMode]);

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 p-4 sm:p-8">
        <CameraOff size={24} className="text-slate-600" />
        <p className="text-xs text-slate-500">Camera inactive</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-900 p-8">
          <Camera size={24} className="animate-pulse text-brand-400" />
          <p className="text-xs text-slate-500">Starting camera...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-red-800/50 bg-red-500/5 p-8">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-xs text-red-400">Camera unavailable</p>
        </div>
      )}

      <div
        id={VIEWPORT_ID}
        className={`w-full overflow-hidden rounded-lg border-2 ${
          status === 'active' ? 'border-brand-600/50' : 'border-transparent'
        }`}
      />

      {status === 'active' && (
        <>
          <div className="absolute inset-0 pointer-events-none border-2 border-brand-400/30 rounded-lg" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-64 rounded-lg border-2 border-brand-400/50">
            <div className="absolute top-0 left-2 h-4 w-4 border-t-2 border-l-2 border-brand-400 rounded-tl" />
            <div className="absolute top-0 right-2 h-4 w-4 border-t-2 border-r-2 border-brand-400 rounded-tr" />
            <div className="absolute bottom-0 left-2 h-4 w-4 border-b-2 border-l-2 border-brand-400 rounded-bl" />
            <div className="absolute bottom-0 right-2 h-4 w-4 border-b-2 border-r-2 border-brand-400 rounded-br" />
            <div className="animate-scan-line absolute left-0 h-0.5 w-full bg-brand-400/60 shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]" />
          </div>
        </>
      )}
    </div>
  );
}
