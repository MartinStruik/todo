'use client';

import { useState, useEffect, useRef } from 'react';
import { ListType, LIST_CONFIG, ScheduleType, SCHEDULE_CONFIG } from '../types';
import { useTodo } from '../context/TodoContext';

interface ListViewProps {
  listType: ListType;
}

const SCHEDULES: ScheduleType[] = ['vandaag', 'morgen', 'deze_week'];

export default function ListView({ listType }: ListViewProps) {
  const { lists, addItem, toggleItem, deleteItem, scheduleItem } = useTodo();
  const [newText, setNewText] = useState('');
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const items = lists[listType];

  useEffect(() => {
    if (!openScheduleId) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenScheduleId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openScheduleId]);
  const config = LIST_CONFIG[listType];

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    addItem(listType, text);
    setNewText('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <span
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <h2 className="text-2xl font-bold text-slate-900">{config.label}</h2>
        <span className="text-sm text-slate-400">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nieuw item toevoegen..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Toevoegen
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">Geen items</p>
          <p className="text-sm mt-1">Voeg je eerste item toe</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li
              key={item.id}
              className="group relative flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <button
                onClick={() => toggleItem(listType, item.id)}
                className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-green-500 flex items-center justify-center transition-colors shrink-0"
                title="Afvinken"
              >
                <svg className="w-3 h-3 text-transparent group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <span className="flex-1 text-slate-800">{item.text}</span>

              {item.schedule && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: SCHEDULE_CONFIG[item.schedule].color }}
                >
                  {SCHEDULE_CONFIG[item.schedule].label}
                </span>
              )}

              <div className="relative" ref={openScheduleId === item.id ? dropdownRef : undefined}>
                <button
                  onClick={() => setOpenScheduleId(openScheduleId === item.id ? null : item.id)}
                  className={`text-slate-400 hover:text-blue-500 transition-colors ${openScheduleId === item.id ? 'text-blue-500' : 'lg:opacity-0 lg:group-hover:opacity-100'}`}
                  title="Inplannen"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {openScheduleId === item.id && (
                  <div className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-lg border border-slate-200 py-1 w-40">
                    {SCHEDULES.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          scheduleItem(listType, item.id, item.schedule === s ? null : s);
                          setOpenScheduleId(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                          item.schedule === s ? 'font-semibold' : ''
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SCHEDULE_CONFIG[s].color }}
                        />
                        {SCHEDULE_CONFIG[s].label}
                        {item.schedule === s && (
                          <svg className="w-3 h-3 ml-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {item.schedule && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => {
                            scheduleItem(listType, item.id, null);
                            setOpenScheduleId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-slate-50"
                        >
                          Verwijder planning
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => deleteItem(listType, item.id)}
                className="lg:opacity-0 lg:group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                title="Verwijderen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
