import { useState, useRef, useEffect, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const POSITION_CLASSES: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1',
};

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const showTooltip = () => {
    timerRef.current = setTimeout(() => setShow(true), 400);
  };

  const hideTooltip = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative inline-flex" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-lg border border-slate-700 ${POSITION_CLASSES[position]}`}>
          {content}
        </div>
      )}
    </div>
  );
}
