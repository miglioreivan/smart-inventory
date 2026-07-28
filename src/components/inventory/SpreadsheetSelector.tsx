import { useState, useCallback } from 'react';
import { useSpreadsheetsList, useCreateSpreadsheet } from '../../hooks/useSpreadsheet';
import { CreateSheetModal } from './CreateSheetModal';
import { Plus, FileSpreadsheet, Loader2 } from 'lucide-react';

interface SpreadsheetSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SpreadsheetSelector({ selectedId, onSelect }: SpreadsheetSelectorProps) {
  const { data: files, isLoading, refetch } = useSpreadsheetsList();
  const createMutation = useCreateSpreadsheet();
  const [showWizard, setShowWizard] = useState(false);

  const handleCreate = useCallback(
    async (title: string, sheetName: string, columns: { label: string; type: string; required?: boolean; options?: string }[]) => {
      const result = await createMutation.mutateAsync({ title, sheetName, columns });
      refetch();
      onSelect(result.spreadsheetId);
    },
    [createMutation, refetch, onSelect],
  );

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
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {(!files || files.length === 0) ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-700 py-12">
          <FileSpreadsheet size={32} className="text-slate-600" />
          <p className="text-sm text-slate-500">No spreadsheets yet</p>
          <button onClick={() => setShowWizard(true)} className="btn-primary text-xs">
            Create your first inventory
          </button>
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

      {showWizard && (
        <CreateSheetModal
          open
          onClose={() => setShowWizard(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
