import { useState, useMemo, useCallback } from 'react';
import type { ColumnMeta } from '../../types/schema.types';
import { CellRenderer } from '../columns/CellRenderer';
import { COLUMN_DEFAULT_WIDTHS, PAGINATION_DEFAULT_SIZE } from '../../config/constants';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface DynamicTableProps {
  columns: ColumnMeta[];
  rows: string[][];
  loading: boolean;
  onRowClick: (rowIndex: number) => void;
}

type SortDirection = 'asc' | 'desc' | null;

export function DynamicTable({ columns, rows, loading, onRowClick }: DynamicTableProps) {
  const [sortKey, setSortKey] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const headerRow = rows[0] ?? [];

  const sortedFiltered = useMemo(() => {
    let data = rows.slice(1);

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((row) => row.some((cell) => String(cell ?? '').toLowerCase().includes(q)));
    }

    if (sortKey !== null && sortDir) {
      data = [...data].sort((a, b) => {
        const va = String(a[sortKey] ?? '').toLowerCase();
        const vb = String(b[sortKey] ?? '').toLowerCase();
        const na = parseFloat(va);
        const nb = parseFloat(vb);
        const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : va.localeCompare(vb);
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return data;
  }, [rows, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGINATION_DEFAULT_SIZE));
  const paged = sortedFiltered.slice(page * PAGINATION_DEFAULT_SIZE, (page + 1) * PAGINATION_DEFAULT_SIZE);

  const handleSort = useCallback((colIdx: number) => {
    setSortKey((prev) => {
      if (prev === colIdx) {
        setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return colIdx;
    });
    setPage(0);
  }, []);

  const sortIcon = (colIdx: number) => {
    if (sortKey !== colIdx) return <ArrowUpDown size={12} className="text-slate-600" />;
    if (sortDir === 'asc') return <ArrowUp size={12} className="text-brand-400" />;
    if (sortDir === 'desc') return <ArrowDown size={12} className="text-brand-400" />;
    return <ArrowUpDown size={12} className="text-slate-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (rows.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
        <Search size={32} />
        <p className="text-sm">No data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search all columns..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <span className="text-xs text-slate-500">
          {sortedFiltered.length} item{sortedFiltered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900">
              <th className="sticky left-0 z-10 bg-slate-900 px-3 py-2.5 text-left text-xs font-medium text-slate-400 w-10">#</th>
              {columns.map((col, i) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(i)}
                  className="cursor-pointer select-none px-3 py-2.5 text-left text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  style={{ minWidth: col.type ? COLUMN_DEFAULT_WIDTHS[col.type] ?? 140 : 140, maxWidth: 300 }}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">{headerRow[i] ?? col.label}</span>
                    {sortIcon(i)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-12 text-center text-slate-500">
                  No matching results
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => {
                const globalRowIndex = page * PAGINATION_DEFAULT_SIZE + ri + 1;
                return (
                  <tr
                    key={globalRowIndex}
                    onClick={() => onRowClick(globalRowIndex)}
                    className="cursor-pointer transition-colors hover:bg-slate-800/50"
                  >
                    <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-500">
                      {globalRowIndex + 1}
                    </td>
                    {columns.map((col, ci) => (
                      <td key={col.id} className="px-3 py-2" style={{ maxWidth: 300 }}>
                        <CellRenderer type={col.type} value={row[ci] ?? null} meta={col} />
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
