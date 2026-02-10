export type ListType = 'todo-werk' | 'todo-thuis' | 'misschien' | 'ideeen' | 'boodschappen' | 'kopen' | 'cultuur';

export type ScheduleType = 'vandaag' | 'morgen' | 'deze_week';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  list: ListType;
  createdAt: string;
  completedAt?: string;
  schedule?: ScheduleType;
  scheduleSetOn?: string; // ISO date (YYYY-MM-DD) when schedule was set
}

export const SCHEDULE_CONFIG: Record<ScheduleType, { label: string; color: string }> = {
  vandaag: { label: 'Vandaag', color: '#ef4444' },
  morgen: { label: 'Morgen', color: '#f97316' },
  deze_week: { label: 'Deze week', color: '#8b5cf6' },
};

export function getScheduledDates(item: TodoItem): string[] {
  if (!item.schedule) return [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (item.schedule === 'vandaag') {
    return [today.toISOString().split('T')[0]];
  }
  if (item.schedule === 'morgen') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return [d.toISOString().split('T')[0]];
  }
  if (item.schedule === 'deze_week') {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }
  return [];
}

export interface PlannerItem {
  id: string;
  text: string;
  date: string;
  hour: number;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export type ArchivedItem = (TodoItem | PlannerItem) & { completedAt: string };

export function isPlannerItem(item: TodoItem | PlannerItem): item is PlannerItem {
  return 'hour' in item && 'date' in item;
}

export const LIST_CONFIG: Record<ListType, { label: string; color: string }> = {
  'todo-werk': { label: 'To Do (Werk)', color: '#3b82f6' },
  'todo-thuis': { label: 'To Do (Thuis)', color: '#0ea5e9' },
  misschien: { label: 'Misschien / Later', color: '#f59e0b' },
  ideeen: { label: 'Idee\u00ebn', color: '#8b5cf6' },
  boodschappen: { label: 'Boodschappen', color: '#22c55e' },
  kopen: { label: 'Kopen', color: '#ec4899' },
  cultuur: { label: 'Cultuur', color: '#6366f1' },
};

export const PLANNER_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 - 22:00
