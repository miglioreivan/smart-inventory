import type { ColumnMeta } from '../../types/schema.types';
import { formatCurrency, formatPercentage, formatISODate, parseISODate } from '../../utils/formatters';
import { Check, Link, QrCode, Image, Mail, MapPin, Palette, Hash, Calendar, Barcode, List, Banknote, Percent } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import type { ReactNode } from 'react';

interface CellRendererProps {
  type: ColumnMeta['type'];
  value: string | number | boolean | null;
  meta: ColumnMeta;
}

const ICON_CLASSES = 'h-3.5 w-3.5 flex-shrink-0';

export function CellRenderer({ type, value, meta }: CellRendererProps): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-600">—</span>;
  }

  switch (type) {
    case 'Text': {
      const str = String(value);
      return (
        <Tooltip content={str}>
          <span className="block max-w-[160px] truncate text-slate-200">{str}</span>
        </Tooltip>
      );
    }

    case 'Number': {
      const num = Number(value);
      const decimals = meta.decimalPlaces ?? 0;
      if (isNaN(num)) return <span className="text-red-500">N/A</span>;
      return (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-200">
          <Hash className={ICON_CLASSES + ' text-slate-500'} />
          {num.toFixed(decimals)}
        </span>
      );
    }

    case 'Date': {
      const d = parseISODate(String(value));
      if (!d) return <span className="text-red-500">Invalid</span>;
      return (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-200">
          <Calendar className={ICON_CLASSES + ' text-slate-500'} />
          {formatISODate(d)}
        </span>
      );
    }

    case 'Barcode':
    case 'QRCode': {
      const str = String(value);
      const Icon = type === 'QRCode' ? QrCode : Barcode;
      return (
        <span className="inline-flex items-center gap-1 font-mono text-sm text-slate-200">
          <Icon className={ICON_CLASSES + ' text-brand-400'} />
          <span className="max-w-[120px] truncate">{str}</span>
        </span>
      );
    }

    case 'List': {
      const str = String(value);
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
          <List className={ICON_CLASSES + ' text-slate-500'} />
          {str}
        </span>
      );
    }

    case 'Checkbox': {
      const checked = ['TRUE', 'true', '1', 'yes'].includes(String(value).toLowerCase());
      return checked
        ? <Check className="h-4 w-4 text-emerald-400" />
        : <span className="text-slate-600">—</span>;
    }

    case 'Email': {
      const email = String(value);
      return (
        <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300">
          <Mail className={ICON_CLASSES} />
          <span className="max-w-[140px] truncate">{email}</span>
        </a>
      );
    }

    case 'Attachment': {
      const str = String(value);
      try {
        const ids: string[] = JSON.parse(str);
        if (!Array.isArray(ids) || ids.length === 0) return <span className="text-slate-600">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-slate-300">
            <Image className={ICON_CLASSES + ' text-slate-500'} />
            <span className="text-xs">{ids.length} file{ids.length > 1 ? 's' : ''}</span>
          </span>
        );
      } catch {
        return (
          <span className="inline-flex items-center gap-1 text-slate-300">
            <Link className={ICON_CLASSES + ' text-slate-500'} />
            <span className="max-w-[80px] truncate">{str}</span>
          </span>
        );
      }
    }

    case 'Location': {
      const parts = String(value).split('>').map((p) => p.trim());
      return (
        <div className="flex items-center gap-0.5">
          <MapPin className={ICON_CLASSES + ' text-slate-500'} />
          <div className="flex items-center gap-0.5">
            {parts.map((part, i) => (
              <span key={i} className="inline-flex items-center">
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">{part}</span>
                {i < parts.length - 1 && <span className="text-slate-600 text-xs mx-0.5">&rsaquo;</span>}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case 'Color': {
      const hex = String(value).startsWith('#') ? String(value) : `#${value}`;
      return (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-slate-600" style={{ backgroundColor: hex }} />
          <span className="text-xs font-mono text-slate-400">{hex}</span>
        </span>
      );
    }

    case 'Currency': {
      const num = Number(String(value).replace(/[^\d.,\-]/g, '').replace(',', '.'));
      if (isNaN(num)) return <span className="text-red-500">N/A</span>;
      const symbol = meta.currencySymbol || 'EUR';
      return (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-200">
          <Banknote className={ICON_CLASSES + ' text-slate-500'} />
          {formatCurrency(num, symbol)}
        </span>
      );
    }

    case 'Percentage': {
      const num = parseFloat(String(value).replace('%', ''));
      if (isNaN(num)) return <span className="text-red-500">N/A</span>;
      const decimals = meta.decimalPlaces ?? 0;
      return (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-200">
          <Percent className={ICON_CLASSES + ' text-slate-500'} />
          {formatPercentage(num / 100, decimals)}
        </span>
      );
    }

    default:
      return <span className="text-slate-400">{String(value)}</span>;
  }
}
