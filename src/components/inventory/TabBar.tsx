import { Plus, Trash2 } from 'lucide-react';

interface TabBarProps {
  tabs: string[];
  activeTab: string | null;
  onSelect: (tab: string) => void;
  onAdd: () => void;
  onDelete: (tab: string) => void;
  readOnly?: boolean;
  tabsCount?: number;
}

export function TabBar({ tabs, activeTab, onSelect, onAdd, onDelete, readOnly, tabsCount }: TabBarProps) {
  const visibleTabs = tabsCount ?? tabs.length;

  return (
    <div className="flex items-center gap-1 border-b border-slate-800 pb-0">
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        const canDelete = !readOnly && visibleTabs > 1;
        return (
          <div key={tab} className="group relative">
            <button
              onClick={() => onSelect(tab)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-slate-100 border-b-2 border-brand-500'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(tab); }}
                className="absolute -right-2 -top-1 hidden group-hover:flex rounded-full bg-red-600 p-0.5 text-white hover:bg-red-500"
                title="Delete tab"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 transition-colors"
        >
          <Plus size={12} />
          Add Page
        </button>
      )}
    </div>
  );
}
