import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertTriangle } from 'lucide-react';

interface CameraStreamProps {
  active: boolean;
  onScan: (barcode: string) => void;
  onError: (error: string) => void;
}

const VIEWPORT_ID = 'camera-stream-viewport';

export function CameraStream({ active, onScan, onError }: CameraStreamProps) {
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
      setStatus('loading');
      return;
    }

    let cancelled = false;

    const start = async () => {
      const el = document.getElementById(VIEWPORT_ID);
      if (!el) return;

      try {
        scannerRef.current = new Html5Qrcode(VIEWPORT_ID);

        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) {
          throw new Error('No cameras found');
        }

        const backCamera = cameras.find((c) => c.id.toLowerCase().includes('back') || c.id.toLowerCase().includes('environment')) ?? cameras[0];

        await scannerRef.current.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!cancelled) onScanRef.current(decodedText);
          },
          () => {},
        );

        if (!cancelled) setStatus('active');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          onErrorRef.current(err instanceof Error ? err.message : 'Camera error');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [active]);

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 p-8">
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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-lg border-2 border-brand-400/50">
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
