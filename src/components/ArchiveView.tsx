'use client';

import { useTodo } from '../context/TodoContext';
import { isPlannerItem, LIST_CONFIG, ListType } from '../types';

export default function ArchiveView() {
  const { archive, restoreFromArchive } = useTodo();

  const grouped = archive.reduce<Record<string, typeof archive>>((acc, item) => {
    if (!item.completedAt) return acc;
    const date = item.completedAt.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-4 h-4 rounded-full bg-slate-400" />
        <h2 className="text-2xl font-bold text-slate-900">Archief</h2>
        <span className="text-sm text-slate-400">
          {archive.length} {archive.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {archive.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">Archief is leeg</p>
          <p className="text-sm mt-1">Afgevinkte items verschijnen hier</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-slate-500 mb-3">
                {formatDate(date)}
              </h3>
              <ul className="space-y-2">
                {grouped[date].map(item => (
                  <li
                    key={item.id}
                    className="group flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100"
                  >
                    <span className="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="flex-1 text-slate-500 line-through">{item.text}</span>
                    <span className="text-xs text-slate-300">
                      {isPlannerItem(item)
                        ? 'Planner'
                        : LIST_CONFIG[item.list as ListType]?.label
                      }
                    </span>
                    <button
                      onClick={() => restoreFromArchive(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-sm text-blue-500 hover:text-blue-700 transition-all"
                      title="Terugzetten"
                    >
                      Herstel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
