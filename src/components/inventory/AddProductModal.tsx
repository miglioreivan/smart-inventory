import { useState, useCallback } from 'react';
import type { ColumnMeta } from '../../types/schema.types';
import { appendSheetRow } from '../../services/googleSheetsService';
import { Modal } from '../common/Modal';
import { CellEditor } from '../columns/CellEditor';
import { useHybridScanner } from '../../hooks/useHybridScanner';
import { CameraStream } from '../scanner/CameraStream';
import { Plus, Loader2, Scan, Repeat, X } from 'lucide-react';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  spreadsheetId: string;
  sheetName: string;
  columns: ColumnMeta[];
  onSuccess: () => void;
  globalLocations?: string[];
}

export function AddProductModal({ open, onClose, spreadsheetId, sheetName, columns, onSuccess, globalLocations }: AddProductModalProps) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isCameraActive, startCamera, stopCamera, cameraMode, flipCamera, cameraError } = useHybridScanner({
    mode: 'form',
    enabled: open,
  });

  const handleClose = useCallback(() => {
    if (isCameraActive) stopCamera();
    onClose();
  }, [isCameraActive, stopCamera, onClose]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const row = columns.map((_, i) => values[i] ?? '');
      await appendSheetRow(spreadsheetId, sheetName, row);
      setValues({});
      if (isCameraActive) stopCamera();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSaving(false);
    }
  }, [values, columns, spreadsheetId, sheetName, onSuccess, onClose, isCameraActive, stopCamera]);

  const handleFieldChange = useCallback((colIdx: number, value: string) => {
    setValues((prev) => ({ ...prev, [colIdx]: value }));
  }, []);

  const allRequiredFilled = columns
    .filter((c) => c.required)
    .every((c) => {
      const idx = columns.indexOf(c);
      return (values[idx] ?? '').trim() !== '';
    });

  return (
    <Modal open={open} onClose={handleClose} title="Aggiungi Oggetto" size="lg">
      <div className="flex flex-col gap-4">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            className="flex items-center justify-center gap-2 rounded-lg border border-brand-500/50 bg-brand-500/10 py-3 text-sm font-medium text-brand-400 hover:bg-brand-500/20"
          >
            <Scan size={18} />
            Apri Scanner
          </button>
        ) : (
          <div className="relative rounded-lg border border-slate-700 bg-slate-900 p-2">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs text-brand-400 font-medium animate-pulse">
                Clicca sul campo da riempire, poi inquadra il codice
              </span>
              <div className="flex items-center gap-2">
                <button onClick={flipCamera} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
                  <Repeat size={18} />
                </button>
                <button onClick={stopCamera} className="rounded p-1.5 text-red-400 hover:bg-red-950 hover:text-red-300">
                  <X size={18} />
                </button>
              </div>
            </div>
            {cameraError && <p className="mb-2 text-xs text-red-400">{cameraError}</p>}
            <CameraStream
              active={isCameraActive}
              cameraMode={cameraMode}
              onScan={() => {}}
              onError={() => {}}
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-500/10 p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3 max-h-[55vh] overflow-y-auto">
          {columns.map((col, ci) => (
            <div key={col.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="w-36 flex-shrink-0 pt-0.5">
                <span className="text-xs font-medium text-slate-400">{col.label}</span>
                {col.required && <span className="ml-0.5 text-red-400">*</span>}
                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                  {col.type}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <CellEditor
                  meta={col}
                  initialValue={values[ci] ?? ''}
                  onSave={(val) => handleFieldChange(ci, val)}
                  onCancel={() => {}}
                  autoFocus={ci === 0}
                  globalLocations={globalLocations}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-500">
            Sheet: <span className="text-slate-300">{sheetName}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allRequiredFilled || saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Aggiungi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
