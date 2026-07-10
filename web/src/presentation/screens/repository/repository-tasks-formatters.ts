import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isThisWeek(date: Date): boolean {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

export function isOverdue(date: Date): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  return due < now;
}

export function formatTaskDueDate(date: Date | null): string {
  if (!date) return '无截止日期';
  const today = new Date();
  if (isSameDay(date, today)) return '今天';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, tomorrow)) return '明天';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return '昨天';
  return format(date, 'M 月 d 日', { locale: zhCN });
}

export function formatTaskUpdatedAt(date: Date): string {
  const today = new Date();
  if (isSameDay(date, today)) return format(date, 'HH:mm', { locale: zhCN });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return `昨天 ${format(date, 'HH:mm', { locale: zhCN })}`;
  return format(date, 'M 月 d 日', { locale: zhCN });
}

export function formatShortHash(id: string): string {
  return id.slice(0, 7);
}
