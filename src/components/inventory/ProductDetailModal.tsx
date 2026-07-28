import { useState, useCallback } from 'react';
import type { ColumnMeta } from '../../types/schema.types';
import { Modal } from '../common/Modal';
import { CellEditor } from '../columns/CellEditor';
import { CellRenderer } from '../columns/CellRenderer';
import { Save, Edit3, X, EyeOff } from 'lucide-react';

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  rowIndex: number;
  row: string[];
  columns: ColumnMeta[];
  onSave: (rowIndex: number, updates: { colIndex: number; value: string }[]) => void;
  saving: boolean;
  readOnly?: boolean;
}

export function ProductDetailModal({
  open,
  onClose,
  rowIndex,
  row,
  columns,
  onSave,
  saving,
  readOnly = false,
}: ProductDetailModalProps) {
  const [editingField, setEditingField] = useState<number | null>(null);
  const [localValues, setLocalValues] = useState<Record<number, string>>({});

  const pendingChanges = Object.entries(localValues).filter(
    ([colIdx, val]) => String(val).trim() !== String(row[Number(colIdx)] ?? '').trim()
  );

  const startEdit = useCallback((colIdx: number) => {
    setLocalValues((prev) => ({
      ...prev,
      [colIdx]: row[colIdx] ?? '',
    }));
    setEditingField(colIdx);
  }, [row]);

  const handleSave = useCallback(() => {
    if (pendingChanges.length === 0) return;
    const updates = pendingChanges.map(([colIdx, value]) => ({
      colIndex: Number(colIdx),
      value,
    }));
    onSave(rowIndex, updates);
    setEditingField(null);
    setLocalValues({});
  }, [pendingChanges, rowIndex, onSave]);

  const handleFieldSave = useCallback((colIdx: number, value: string) => {
    setLocalValues((prev) => {
      const next = { ...prev };
      if (String(value).trim() !== String(row[colIdx] ?? '').trim()) {
        next[colIdx] = value;
      } else {
        delete next[colIdx];
      }
      return next;
    });
    setEditingField(null);
  }, [row]);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setLocalValues((prev) => {
      const next = { ...prev };
      if (editingField !== null) delete next[editingField];
      return next;
    });
  }, [editingField]);

  return (
    <Modal open={open} onClose={onClose} title={`Row #${rowIndex + 2}`} size="lg">
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          {columns.map((col, ci) => {
            const rawValue = row[ci] ?? '';
            const currentValue = localValues[ci] ?? rawValue;
            const hasChange = ci in localValues && String(localValues[ci]).trim() !== String(rawValue).trim();
            const isEditing = editingField === ci;

            return (
              <div
                key={col.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  hasChange
                    ? 'border-amber-700/50 bg-amber-500/5'
                    : isEditing
                      ? 'border-brand-700/50 bg-brand-500/5'
                      : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <div className="w-36 flex-shrink-0 pt-0.5">
                  <span className="text-xs font-medium text-slate-400">{col.label}</span>
                  {col.required && <span className="ml-0.5 text-red-400">*</span>}
                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                    {col.type}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <CellEditor
                      meta={col}
                      initialValue={localValues[ci] ?? rawValue}
                      onSave={(val) => handleFieldSave(ci, val)}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <div
                      onClick={() => { if (!readOnly) startEdit(ci); }}
                      className={`rounded-md px-2 py-1.5 -mx-2 -my-1 transition-colors group ${
                        readOnly ? '' : 'cursor-pointer hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1">
                          <CellRenderer type={col.type} value={currentValue as string} meta={col} />
                        </span>
                        {!readOnly && (
                          <Edit3 size={14} className="flex-shrink-0 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {hasChange && !isEditing && (
                  <span className="flex-shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    modified
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          {readOnly ? (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400">
              <EyeOff size={14} />
              Read-only access — contact the owner to edit
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              {pendingChanges.length} field{pendingChanges.length !== 1 ? 's' : ''} modified
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              <X size={16} />
              Close
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={pendingChanges.length === 0 || saving}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:pointer-events-none disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
