import { useState, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import type { ColumnType } from '../../types/schema.types';

const ALL_COLUMN_TYPES: { value: ColumnType; label: string; icon: string }[] = [
  { value: 'Text', label: 'Text', icon: 'Aa' },
  { value: 'Number', label: 'Number', icon: '#' },
  { value: 'Currency', label: 'Currency', icon: '$' },
  { value: 'Date', label: 'Date', icon: '' },
  { value: 'Barcode', label: 'Barcode', icon: '||' },
  { value: 'QRCode', label: 'QR Code', icon: '' },
  { value: 'List', label: 'Dropdown List', icon: '' },
  { value: 'Checkbox', label: 'Checkbox', icon: '' },
  { value: 'Email', label: 'Email', icon: '@' },
  { value: 'Attachment', label: 'Attachment', icon: '' },
  { value: 'Location', label: 'Location', icon: '' },
  { value: 'Color', label: 'Color', icon: '' },
  { value: 'Percentage', label: 'Percentage', icon: '%' },
];

interface ColumnDef {
  label: string;
  type: ColumnType;
  required: boolean;
  options?: string;
}

interface CreateSheetModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, sheetName: string, columns: { label: string; type: string; required: boolean; options?: string }[]) => Promise<void>;
}

export function CreateSheetModal({ open, onClose, onCreate }: CreateSheetModalProps) {
  const [title, setTitle] = useState('');
  const [sheetName, setSheetName] = useState('Inventory');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { label: 'Name', type: 'Text', required: true },
    { label: 'Quantity', type: 'Number', required: false },
    { label: 'Price', type: 'Currency', required: false },
    { label: 'Category', type: 'List', required: false, options: 'Electronics,Clothing,Food' },
    { label: 'Location', type: 'Location', required: false },
    { label: 'Barcode', type: 'Barcode', required: false },
    { label: 'Expiry Date', type: 'Date', required: false },
    { label: 'Notes', type: 'Text', required: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addColumn = useCallback(() => {
    setColumns((prev) => [...prev, { label: '', type: 'Text', required: false }]);
  }, []);

  const removeColumn = useCallback((index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateColumn = useCallback((index: number, field: keyof ColumnDef, value: string | boolean) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, [field]: value } : col)),
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Spreadsheet title is required');
      return;
    }
    if (columns.some((c) => !c.label.trim())) {
      setError('All columns must have a label');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const cols = columns.map((c) => ({
        label: c.label.trim(),
        type: c.type,
        required: c.required,
        options: c.type === 'List' && c.options ? c.options : undefined,
      }));
      await onCreate(title.trim(), sheetName.trim() || 'Inventory', cols);
      setTitle('');
      setSheetName('Inventory');
      setColumns([
        { label: 'Name', type: 'Text', required: true },
        { label: 'Quantity', type: 'Number', required: false },
      ]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spreadsheet');
    } finally {
      setSaving(false);
    }
  }, [title, sheetName, columns, onCreate, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Create Inventory Sheet" size="lg">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-500/10 p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Spreadsheet Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Inventory"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sheet (Tab) Name</label>
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Inventory"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Columns ({columns.length})</label>
            <button
              onClick={addColumn}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-400 hover:bg-slate-800"
            >
              <Plus size={12} />
              Add Column
            </button>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {columns.map((col, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-2"
              >
                <GripVertical size={14} className="text-slate-600 flex-shrink-0" />
                <span className="text-[10px] text-slate-600 w-5 tabular-nums">{i + 1}</span>

                <input
                  value={col.label}
                  onChange={(e) => updateColumn(i, 'label', e.target.value)}
                  placeholder="Column name"
                  className="flex-1 min-w-0 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />

                <select
                  value={col.type}
                  onChange={(e) => updateColumn(i, 'type', e.target.value)}
                  className="w-36 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                >
                  {ALL_COLUMN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.required}
                    onChange={(e) => updateColumn(i, 'required', e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-brand-500"
                  />
                  Req
                </label>

                {col.type === 'List' && (
                  <input
                    value={col.options ?? ''}
                    onChange={(e) => updateColumn(i, 'options', e.target.value)}
                    placeholder="A,B,C"
                    className="w-28 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                  />
                )}

                <button
                  onClick={() => removeColumn(i)}
                  className="rounded p-1 text-slate-600 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-500">
            Creates a new Google Sheet with <span className="text-slate-400">{columns.length}</span> typed columns and <span className="text-slate-400">_SYSTEM_SCHEMA</span> metadata
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || columns.some((c) => !c.label.trim()) || saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Sheet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
