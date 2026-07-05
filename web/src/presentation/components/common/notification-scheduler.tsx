import { useEffect, useRef } from 'react';
import { addHours, isBefore } from 'date-fns';
import { container } from '../../../core/di/injection-container';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';
import { WebNotificationService } from '../../../platform/web-notification-service';
import { useSettingsStore } from '../../stores/settings-store';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function NotificationScheduler(): JSX.Element | null {
  const { enableNotifications, reminderHours } = useSettingsStore();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enableNotifications) return;

    const service = container.resolve(WebNotificationService);
    if (service.getPermission() !== 'granted') return;

    const taskRepo = container.resolve<ITaskRepository>('ITaskRepository');

    const check = async () => {
      const now = new Date();
      const windowStart = now;
      const windowEnd = addHours(now, reminderHours);
      const tasks = await taskRepo.getAll();
      for (const task of tasks) {
        if (task.isCompleted || !task.dueDate) continue;
        const due = task.dueDate;
        const notifyAt = addHours(due, -reminderHours);
        if (
          isBefore(notifyAt, windowEnd) &&
          isBefore(windowStart, due) &&
          !notifiedRef.current.has(task.id)
        ) {
          await service.notify({
            title: `任务即将截止：${task.title}`,
            body: `截止时间为 ${due.toLocaleString('zh-CN')}`,
            tag: task.id,
          });
          notifiedRef.current.add(task.id);
        }
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enableNotifications, reminderHours]);

  return null;
}
