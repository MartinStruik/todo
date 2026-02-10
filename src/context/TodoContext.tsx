'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ListType, TodoItem, PlannerItem, ScheduleType } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface TodoState {
  lists: Record<ListType, TodoItem[]>;
  plannerItems: PlannerItem[];
  archive: (TodoItem | PlannerItem)[];
}

const INITIAL_STATE: TodoState = {
  lists: {
    'todo-werk': [],
    'todo-thuis': [],
    misschien: [],
    ideeen: [],
    boodschappen: [],
    kopen: [],
    cultuur: [],
  },
  plannerItems: [],
  archive: [],
};

interface TodoContextType extends TodoState {
  addItem: (list: ListType, text: string) => void;
  toggleItem: (list: ListType, id: string) => void;
  deleteItem: (list: ListType, id: string) => void;
  scheduleItem: (list: ListType, id: string, schedule: ScheduleType | null) => void;
  addPlannerItem: (date: string, hour: number, text: string) => void;
  reschedulePlannerItem: (id: string, newDate: string) => void;
  togglePlannerItem: (id: string) => void;
  deletePlannerItem: (id: string) => void;
  restoreFromArchive: (id: string) => void;
}

const TodoContext = createContext<TodoContextType | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TodoState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('todo-app-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState({ ...INITIAL_STATE, ...parsed });
      } catch {
        // ignore corrupt data
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('todo-app-data', JSON.stringify(state));
    }
  }, [state, loaded]);

  const addItem = useCallback((list: ListType, text: string) => {
    const item: TodoItem = {
      id: generateId(),
      text,
      completed: false,
      list,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      lists: { ...prev.lists, [list]: [...prev.lists[list], item] },
    }));
  }, []);

  const toggleItem = useCallback((list: ListType, id: string) => {
    setState(prev => {
      const item = prev.lists[list].find(i => i.id === id);
      if (!item) return prev;
      const archived = { ...item, completed: true, completedAt: new Date().toISOString() };
      return {
        ...prev,
        lists: { ...prev.lists, [list]: prev.lists[list].filter(i => i.id !== id) },
        archive: [archived, ...prev.archive],
      };
    });
  }, []);

  const deleteItem = useCallback((list: ListType, id: string) => {
    setState(prev => ({
      ...prev,
      lists: { ...prev.lists, [list]: prev.lists[list].filter(i => i.id !== id) },
    }));
  }, []);

  const scheduleItem = useCallback((list: ListType, id: string, schedule: ScheduleType | null) => {
    setState(prev => ({
      ...prev,
      lists: {
        ...prev.lists,
        [list]: prev.lists[list].map(item =>
          item.id === id
            ? {
                ...item,
                schedule: schedule ?? undefined,
                scheduleSetOn: schedule ? new Date().toISOString().split('T')[0] : undefined,
              }
            : item
        ),
      },
    }));
  }, []);

  const addPlannerItem = useCallback((date: string, hour: number, text: string) => {
    const item: PlannerItem = {
      id: generateId(),
      text,
      date,
      hour,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      plannerItems: [...prev.plannerItems, item],
    }));
  }, []);

  const reschedulePlannerItem = useCallback((id: string, newDate: string) => {
    setState(prev => ({
      ...prev,
      plannerItems: prev.plannerItems.map(item =>
        item.id === id ? { ...item, date: newDate } : item
      ),
    }));
  }, []);

  const togglePlannerItem = useCallback((id: string) => {
    setState(prev => {
      const item = prev.plannerItems.find(i => i.id === id);
      if (!item) return prev;
      const archived = { ...item, completed: true, completedAt: new Date().toISOString() };
      return {
        ...prev,
        plannerItems: prev.plannerItems.filter(i => i.id !== id),
        archive: [archived, ...prev.archive],
      };
    });
  }, []);

  const deletePlannerItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      plannerItems: prev.plannerItems.filter(i => i.id !== id),
    }));
  }, []);

  const restoreFromArchive = useCallback((id: string) => {
    setState(prev => {
      const item = prev.archive.find(i => i.id === id);
      if (!item) return prev;

      const restored = { ...item, completed: false, completedAt: undefined };
      const newArchive = prev.archive.filter(i => i.id !== id);

      if ('list' in item && item.list) {
        return {
          ...prev,
          archive: newArchive,
          lists: {
            ...prev.lists,
            [item.list]: [...prev.lists[item.list as ListType], restored as TodoItem],
          },
        };
      } else {
        return {
          ...prev,
          archive: newArchive,
          plannerItems: [...prev.plannerItems, restored as PlannerItem],
        };
      }
    });
  }, []);

  if (!loaded) return null;

  return (
    <TodoContext.Provider value={{
      ...state,
      addItem,
      toggleItem,
      deleteItem,
      scheduleItem,
      addPlannerItem,
      reschedulePlannerItem,
      togglePlannerItem,
      deletePlannerItem,
      restoreFromArchive,
    }}>
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error('useTodo must be used within TodoProvider');
  return ctx;
}
