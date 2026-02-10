'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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

interface DragState {
  item: TodoItem & { listKey: ListType };
  ghostX: number;
  ghostY: number;
}

const SCROLL_ZONE = 80; // px from edge to trigger auto-scroll
const SCROLL_SPEED = 8; // px per frame

export default function DayPlanner() {
  const {
    lists, plannerItems, archive,
    addPlannerItem, reschedulePlannerItem, togglePlannerItem, deletePlannerItem,
    toggleItem, scheduleItem, setItemHour,
  } = useTodo();
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [newText, setNewText] = useState('');

  // Drag state
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const autoScrollRaf = useRef<number | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dragOverHourRef = useRef(dragOverHour);
  dragOverHourRef.current = dragOverHour;

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

  // Items being dragged are hidden from their slot
  const dragId = drag?.item.id;
  const floatingTodos = allScheduledTodos.filter(i => i.scheduledHour === undefined && i.id !== dragId);
  const hourTodos = allScheduledTodos.filter(i => i.scheduledHour !== undefined && i.id !== dragId);

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

  // --- Find scrollable parent (main element) ---
  useEffect(() => {
    scrollRef.current = document.querySelector('main');
  }, []);

  // --- Auto-scroll during drag ---
  const startAutoScroll = useCallback(() => {
    const tick = () => {
      const d = dragRef.current;
      const el = scrollRef.current;
      if (!d || !el) return;

      const rect = el.getBoundingClientRect();
      const y = d.ghostY;

      if (y < rect.top + SCROLL_ZONE) {
        el.scrollTop -= SCROLL_SPEED;
      } else if (y > rect.bottom - SCROLL_ZONE) {
        el.scrollTop += SCROLL_SPEED;
      }

      autoScrollRaf.current = requestAnimationFrame(tick);
    };
    autoScrollRaf.current = requestAnimationFrame(tick);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  }, []);

  // --- Shared drag logic ---
  const detectHourSlot = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const hourSlot = el?.closest('[data-hour-slot]');
    if (hourSlot) {
      setDragOverHour(Number(hourSlot.getAttribute('data-hour-slot')));
    } else {
      setDragOverHour(null);
    }
  }, []);

  const finishDrag = useCallback(() => {
    const d = dragRef.current;
    const hour = dragOverHourRef.current;
    if (d) {
      if (hour !== null) {
        setItemHour(d.item.listKey, d.item.id, hour);
      } else {
        setItemHour(d.item.listKey, d.item.id, null);
      }
    }
    setDrag(null);
    setDragOverHour(null);
    stopAutoScroll();
  }, [setItemHour, stopAutoScroll]);

  // --- Start drag (shared for touch and mouse) ---
  const handleTouchStart = useCallback((e: React.TouchEvent, item: TodoItem & { listKey: ListType }) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    touchStartPos.current = { x: startX, y: startY };
    longPressTimer.current = setTimeout(() => {
      setDrag({ item, ghostX: startX, ghostY: startY });
      startAutoScroll();
    }, 200);
  }, [startAutoScroll]);

  const handleMouseDown = useCallback((e: React.MouseEvent, item: TodoItem & { listKey: ListType }) => {
    e.preventDefault();
    setDrag({ item, ghostX: e.clientX, ghostY: e.clientY });
    startAutoScroll();
  }, [startAutoScroll]);

  // Cancel long press only if finger moves more than 10px before drag starts
  const handleTouchMoveCancel = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current && !dragRef.current && touchStartPos.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handleTouchEndCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // --- Global document listeners once drag is active ---
  useEffect(() => {
    if (!drag) return;

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      setDrag(prev => prev ? { ...prev, ghostX: touch.clientX, ghostY: touch.clientY } : null);
      detectHourSlot(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      finishDrag();
    };

    const onMouseMove = (e: MouseEvent) => {
      setDrag(prev => prev ? { ...prev, ghostX: e.clientX, ghostY: e.clientY } : null);
      detectHourSlot(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      finishDrag();
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [drag, finishDrag, detectHourSlot]);

  // --- Drag handle props (reusable for both floating and hour-slotted items) ---
  const dragHandleProps = (item: TodoItem & { listKey: ListType }) => ({
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, item),
    onTouchMove: handleTouchMoveCancel,
    onTouchEnd: handleTouchEndCancel,
    onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, item),
  });

  const DragHandle = () => (
    <span className="text-slate-400 shrink-0 cursor-grab active:cursor-grabbing">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
      </svg>
    </span>
  );

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
      {/* Ghost element */}
      {drag && (
        <div
          className="fixed z-[100] pointer-events-none bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 shadow-xl text-sm text-slate-800 max-w-[200px] truncate opacity-90"
          style={{ left: drag.ghostX - 80, top: drag.ghostY - 20 }}
        >
          {drag.item.text}
        </div>
      )}

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
            Geplande taken — sleep naar een uurvak
          </p>
          <ul className="space-y-2">
            {floatingTodos.map(item => (
              <li
                key={item.id}
                className="group flex items-center gap-2 touch-none"
                {...dragHandleProps(item)}
              >
                <DragHandle />
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
          const isDragOver = dragOverHour === hour;

          return (
            <div
              key={hour}
              data-hour-slot={hour}
              className={`flex border-t border-slate-100 transition-all duration-150 ${
                isCurrentHour ? 'bg-blue-50/50' : ''
              } ${isDragOver ? 'bg-amber-50 scale-[1.02] shadow-md rounded-lg border-amber-300 z-10 relative' : ''}`}
            >
              <div className={`w-20 shrink-0 py-3 pr-4 text-right text-sm font-medium transition-colors ${
                isDragOver ? 'text-amber-600' : isCurrentHour ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {hour.toString().padStart(2, '0')}:00
              </div>

              <div className="flex-1 py-2 pl-4 border-l border-slate-200 min-h-[52px]">
                {/* Scheduled todos in this hour — draggable */}
                {scheduledAtHour.map(item => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 py-1 touch-none"
                    {...dragHandleProps(item)}
                  >
                    <DragHandle />
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
                  <button
                    onClick={() => { setEditingHour(hour); setNewText(''); }}
                    className="text-sm text-slate-300 hover:text-slate-500 py-1 transition-colors"
                  >
                    + toevoegen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
