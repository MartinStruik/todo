'use client';

import { ListType, LIST_CONFIG } from '../types';
import { useTodo } from '../context/TodoContext';

export type ViewType = ListType | 'planner' | 'archief';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, onNavigate, open, onClose }: SidebarProps) {
  const { lists, archive } = useTodo();

  const navItem = (view: ViewType, label: string, color: string, count?: number) => (
    <button
      key={view}
      onClick={() => { onNavigate(view); onClose(); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
        currentView === view
          ? 'bg-white/10 text-white'
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </button>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 flex flex-col transform transition-transform lg:transform-none ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Mijn Planner</h1>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <p className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
            Dagplanner
          </p>
          {navItem('planner', 'Dagplanner', '#0ea5e9')}

          <p className="px-4 py-2 mt-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
            Lijsten
          </p>
          {(Object.keys(LIST_CONFIG) as ListType[]).map(key =>
            navItem(key, LIST_CONFIG[key].label, LIST_CONFIG[key].color, lists[key].length)
          )}

          <p className="px-4 py-2 mt-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
            Archief
          </p>
          {navItem('archief', 'Archief', '#64748b', archive.length)}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/30 text-center">
            Alles lokaal opgeslagen
          </p>
        </div>
      </aside>
    </>
  );
}
