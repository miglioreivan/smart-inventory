import { useState, useCallback, type ChangeEvent } from 'react';
import type { ColumnMeta } from '../../types/schema.types';
import { validateEmail } from '../../utils/formatters';

interface CellEditorProps {
  meta: ColumnMeta;
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

export function CellEditor({ meta, initialValue, onSave, onCancel, autoFocus = true }: CellEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback(() => {
    const trimmed = value.trim();

    if (meta.required && trimmed === '') {
      setError(`"${meta.label}" is required`);
      return;
    }

    switch (meta.type) {
      case 'Email':
        if (trimmed && !validateEmail(trimmed)) {
          setError('Invalid email address');
          return;
        }
        break;
      case 'Number':
      case 'Currency':
        if (trimmed) {
          const cleaned = trimmed.replace(/[^\d.,\-]/g, '').replace(',', '.');
          if (isNaN(Number(cleaned))) {
            setError('Must be a valid number');
            return;
          }
        }
        break;
      case 'Date':
        if (trimmed) {
          if (isNaN(new Date(trimmed + 'T00:00:00').getTime())) {
            setError('Must be a valid date (YYYY-MM-DD)');
            return;
          }
        }
        break;
      case 'Color':
        if (trimmed) {
          const hexRe = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
          if (!hexRe.test(trimmed)) {
            setError('Must be a valid HEX color (#RRGGBB)');
            return;
          }
        }
        break;
      case 'Percentage':
        if (trimmed) {
          const cleaned = trimmed.replace('%', '').trim();
          if (isNaN(parseFloat(cleaned))) {
            setError('Must be a valid percentage');
            return;
          }
        }
        break;
      default:
        break;
    }

    onSave(trimmed);
  }, [value, meta, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }, [commit, onCancel]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setError(null);
  }, []);

  const baseInputClass = 'w-full rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

  switch (meta.type) {
    case 'Text':
    case 'Number':
    case 'Date':
    case 'Barcode':
    case 'QRCode':
    case 'Email':
    case 'Currency':
    case 'Percentage':
    case 'Color':
    case 'Location':
      return (
        <div className="flex flex-col gap-1">
          <input
            autoFocus={autoFocus}
            type={meta.type === 'Number' || meta.type === 'Currency' || meta.type === 'Percentage' ? 'text' : meta.type === 'Email' ? 'email' : meta.type === 'Date' ? 'date' : 'text'}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            placeholder={`Enter ${meta.label.toLowerCase()}`}
            className={baseInputClass}
          />
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      );

    case 'List':
      return (
        <div className="flex flex-col gap-1">
          {meta.options && meta.options.length > 0 ? (
            <select
              autoFocus={autoFocus}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              className={baseInputClass}
            >
              <option value="">— Select —</option>
              {meta.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus={autoFocus}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              className={baseInputClass}
            />
          )}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      );

    case 'Checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            autoFocus={autoFocus}
            type="checkbox"
            checked={['TRUE', 'true', '1', 'yes'].includes(value.toLowerCase())}
            onChange={(e) => {
              const newVal = e.target.checked ? 'TRUE' : 'FALSE';
              setValue(newVal);
              onSave(newVal);
            }}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-400">{value === 'TRUE' ? 'Yes' : 'No'}</span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      );

    case 'Attachment':
      return (
        <div className="flex flex-col gap-1">
          <textarea
            autoFocus={autoFocus}
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
            onBlur={commit}
            rows={2}
            placeholder='["drive_id_1","drive_id_2"]'
            className={baseInputClass + ' resize-none font-mono text-xs'}
          />
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      );

    default:
      return (
        <div className="flex flex-col gap-1">
          <input
            autoFocus={autoFocus}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            className={baseInputClass}
          />
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      );
  }
}
