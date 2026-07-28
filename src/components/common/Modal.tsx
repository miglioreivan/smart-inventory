import { useState, useEffect, useCallback, useRef, type ReactNode, type MouseEvent } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleOverlayClick = useCallback((e: MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 sm:p-4 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`w-full max-w-full sm:${SIZE_CLASSES[size]} rounded-xl border border-slate-700 bg-slate-900 shadow-2xl transition-transform duration-200 mx-auto ${
          visible ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-base sm:text-lg font-semibold text-slate-100 truncate mr-2">{title}</h2>
          <button onClick={onClose} className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} className="sm:size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] sm:max-h-[75vh] overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
