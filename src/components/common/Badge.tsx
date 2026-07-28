import type { ReactNode } from 'react';

const VARIANT_CLASSES = {
  default: 'bg-slate-800 text-slate-300 border-slate-700',
  brand: 'bg-brand-600/20 text-brand-400 border-brand-600/30',
  green: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
  yellow: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
} as const;

type Variant = keyof typeof VARIANT_CLASSES;

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </span>
  );
}
