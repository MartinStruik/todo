'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { PLANNER_HOURS, ListType, LIST_CONFIG, TodoItem, getScheduledDates } from '../types';
import { useTodo } from '../context/TodoContext';

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export default function DayPlanner() {
  const {
    lists, plannerItems, archive,
    addPlannerItem, reschedulePlannerItem, togglePlannerItem, deletePlannerItem,
    toggleItem, scheduleItem, setItemHour,
  } = useTodo();
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [newText, setNewText] = useState('');
  const [assigningHour, setAssigningHour] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (assigningHour === null) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setAssigningHour(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [assigningHour]);

  const todayPlannerItems = plannerItems.filter(item => item.date === selectedDate);

  const getItemsForHour = (hour: number) =>
    todayPlannerItems.filter(item => item.hour === hour);

  const allScheduledTodos: (TodoItem & { listKey: ListType })[] = [];
  for (const key of Object.keys(lists) as ListType[]) {
    for (const item of lists[key]) {
      if (item.schedule) {
        const dates = getScheduledDates(item);
        if (dates.includes(selectedDate)) {
          allScheduledTodos.push({ ...item, listKey: key });
        }
      }
    }
  }

  const floatingTodos = allScheduledTodos.filter(i => i.scheduledHour === undefined);
  const hourTodos = allScheduledTodos.filter(i => i.scheduledHour !== undefined);

  const getScheduledTodosForHour = (hour: number) =>
    hourTodos.filter(i => i.scheduledHour === hour);

  const isToday = selectedDate === getToday();

  const todayCompleted = useMemo(() => {
    if (!isToday) return false;
    if (todayPlannerItems.length > 0 || allScheduledTodos.length > 0) return false;
    const todayStr = getToday();
    return archive.some(item => item.completedAt?.startsWith(todayStr));
  }, [isToday, todayPlannerItems.length, allScheduledTodos.length, archive]);

  const handleAdd = (hour: number) => {
    const text = newText.trim();
    if (!text) return;
    addPlannerItem(selectedDate, hour, text);
    setNewText('');
    setEditingHour(null);
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const todayStr = getToday();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Vandaag';
    if (dateStr === tomorrowStr) return 'Morgen';
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const currentHour = new Date().getHours();

  const DelegateButtons = ({ onMorgen, onDezeWeek }: { onMorgen: () => void; onDezeWeek: () => void }) => (
    <span className="flex gap-1 shrink-0">
      <button
        onClick={onMorgen}
        className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
      >
        Morgen
      </button>
      <button
        onClick={onDezeWeek}
        className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
      >
        Week
      </button>
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Dagplanner</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-medium text-slate-700 min-w-[180px] text-center">
            {formatDate(selectedDate)}
          </span>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedDate(getToday())}
            className="ml-2 px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Vandaag
          </button>
        </div>
      </div>

      {todayCompleted && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-700 mb-1">Wrap up!</p>
          <p className="text-green-600">Alle taken voor vandaag zijn afgerond. Goed gedaan!</p>
        </div>
      )}

      {floatingTodos.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">
            Geplande taken — tik op een uurvak om toe te wijzen
          </p>
          <ul className="space-y-2">
            {floatingTodos.map(item => (
              <li
                key={item.id}
                className="group flex items-center gap-2"
              >
                <button
                  onClick={() => toggleItem(item.listKey, item.id)}
                  className="w-4 h-4 rounded border-2 border-amber-400 hover:border-green-500 flex items-center justify-center transition-colors shrink-0"
                >
                  <svg className="w-2.5 h-2.5 text-transparent group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <span className="flex-1 text-sm text-slate-800">{item.text}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: LIST_CONFIG[item.listKey].color }}
                >
                  {LIST_CONFIG[item.listKey].label}
                </span>
                {item.schedule === 'vandaag' && (
                  <DelegateButtons
                    onMorgen={() => scheduleItem(item.listKey, item.id, 'morgen')}
                    onDezeWeek={() => scheduleItem(item.listKey, item.id, 'deze_week')}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-0">
        {PLANNER_HOURS.map(hour => {
          const hourItems = getItemsForHour(hour);
          const scheduledAtHour = getScheduledTodosForHour(hour);
          const isCurrentHour = hour === currentHour && isToday;
          const isAssigning = assigningHour === hour;

          return (
            <div
              key={hour}
              className={`flex border-t border-slate-100 transition-all duration-150 ${
                isCurrentHour ? 'bg-blue-50/50' : ''
              } ${isAssigning ? 'bg-amber-50 rounded-lg border-amber-300 z-10 relative' : ''}`}
            >
              <div className={`w-20 shrink-0 py-3 pr-4 text-right text-sm font-medium transition-colors ${
                isAssigning ? 'text-amber-600' : isCurrentHour ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {hour.toString().padStart(2, '0')}:00
              </div>

              <div className="flex-1 py-2 pl-4 border-l border-slate-200 min-h-[52px]">
                {/* Scheduled todos assigned to this hour */}
                {scheduledAtHour.map(item => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 py-1"
                  >
                    <button
                      onClick={() => toggleItem(item.listKey, item.id)}
                      className="w-4 h-4 rounded border-2 border-amber-400 hover:border-green-500 flex items-center justify-center transition-colors shrink-0"
                    >
                      <svg className="w-2.5 h-2.5 text-transparent group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-slate-800">{item.text}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: LIST_CONFIG[item.listKey].color }}
                    >
                      {LIST_CONFIG[item.listKey].label}
                    </span>
                    <button
                      onClick={() => setItemHour(item.listKey, item.id, null)}
                      className="text-slate-400 hover:text-amber-600 transition-colors shrink-0"
                      title="Losmaken van uurvak"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Regular planner items */}
                {hourItems.map(item => (
                  <div key={item.id} className="group flex items-center gap-2 py-1">
                    <button
                      onClick={() => togglePlannerItem(item.id)}
                      className="w-4 h-4 rounded border-2 border-slate-300 hover:border-green-500 flex items-center justify-center transition-colors shrink-0"
                    >
                      <svg className="w-2.5 h-2.5 text-transparent group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-slate-800">{item.text}</span>
                    <DelegateButtons
                      onMorgen={() => reschedulePlannerItem(item.id, getTomorrow())}
                      onDezeWeek={() => {
                        const d = new Date(selectedDate);
                        const day = d.getDay();
                        const friday = new Date(d);
                        friday.setDate(d.getDate() + (5 - (day === 0 ? 7 : day)));
                        if (friday <= d) friday.setDate(d.getDate() + 1);
                        reschedulePlannerItem(item.id, friday.toISOString().split('T')[0]);
                      }}
                    />
                    <button
                      onClick={() => deletePlannerItem(item.id)}
                      className="lg:opacity-0 lg:group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Task picker - assign floating tasks to this hour */}
                {isAssigning && floatingTodos.length > 0 && (
                  <div
                    ref={pickerRef}
                    className="my-2 p-3 bg-white rounded-xl border-2 border-amber-300 shadow-lg"
                  >
                    <p className="text-xs font-semibold text-amber-600 mb-2">
                      Tik om toe te wijzen aan {hour.toString().padStart(2, '0')}:00
                    </p>
                    <ul className="space-y-1">
                      {floatingTodos.map(item => (
                        <li key={item.id}>
                          <button
                            onClick={() => {
                              setItemHour(item.listKey, item.id, hour);
                            }}
                            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <span className="w-4 h-4 rounded border-2 border-amber-300 flex items-center justify-center shrink-0">
                              <svg className="w-2.5 h-2.5 text-transparent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="flex-1 text-sm text-slate-800">{item.text}</span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: LIST_CONFIG[item.listKey].color }}
                            >
                              {LIST_CONFIG[item.listKey].label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {editingHour === hour ? (
                  <div className="flex gap-2 py-1">
                    <input
                      type="text"
                      autoFocus
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAdd(hour);
                        if (e.key === 'Escape') { setEditingHour(null); setNewText(''); }
                      }}
                      onBlur={() => { if (!newText.trim()) { setEditingHour(null); setNewText(''); } }}
                      placeholder="Wat ga je doen?"
                      className="flex-1 px-2 py-1 text-sm rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                    />
                    <button
                      onClick={() => handleAdd(hour)}
                      className="px-3 py-1 text-sm bg-slate-900 text-white rounded hover:bg-slate-800"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingHour(hour); setNewText(''); }}
                      className="text-sm text-slate-300 hover:text-slate-500 py-1 transition-colors"
                    >
                      + toevoegen
                    </button>
                    {floatingTodos.length > 0 && !isAssigning && (
                      <button
                        onClick={() => setAssigningHour(hour)}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                      >
                        + inplannen
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
