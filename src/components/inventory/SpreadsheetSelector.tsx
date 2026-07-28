import { useState, useCallback } from 'react';
import { useSpreadsheetsList, useCreateSpreadsheet } from '../../hooks/useSpreadsheet';
import { Plus, FileSpreadsheet, Loader2 } from 'lucide-react';

interface SpreadsheetSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SpreadsheetSelector({ selectedId, onSelect }: SpreadsheetSelectorProps) {
  const { data: files, isLoading, refetch } = useSpreadsheetsList();
  const createMutation = useCreateSpreadsheet();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    const defaultCols = [
      { label: 'Name', type: 'Text' },
      { label: 'Quantity', type: 'Number' },
      { label: 'Price', type: 'Currency' },
      { label: 'Category', type: 'List' },
      { label: 'Location', type: 'Location' },
      { label: 'Barcode', type: 'Barcode' },
      { label: 'Expiry Date', type: 'Date' },
      { label: 'Notes', type: 'Text' },
    ];
    const result = await createMutation.mutateAsync({ title: newTitle.trim(), columns: defaultCols });
    setNewTitle('');
    setShowCreate(false);
    refetch();
    onSelect(result.spreadsheetId);
  }, [newTitle, createMutation, refetch, onSelect]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">Your Spreadsheets</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {showCreate && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
            placeholder="Spreadsheet name..."
            className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim() || createMutation.isPending}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {(!files || files.length === 0) ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-700 py-12">
          <FileSpreadsheet size={32} className="text-slate-600" />
          <p className="text-sm text-slate-500">No spreadsheets yet</p>
          {!showCreate && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
              Create your first inventory
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((file) => {
            const isSelected = file.id === selectedId;
            return (
              <button
                key={file.id}
                onClick={() => onSelect(file.id)}
                className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'border border-brand-700/50 bg-brand-600/10'
                    : 'border border-transparent hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className={isSelected ? 'text-brand-400' : 'text-slate-500'} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${isSelected ? 'text-brand-300' : 'text-slate-300'}`}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white">
                      active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
