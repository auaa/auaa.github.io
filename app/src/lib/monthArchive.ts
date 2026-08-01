import type { Task, TaskStatus } from '../types'

export const MONTH_DIR = '_month'

export interface MonthArchive {
  v: 1
  month: string
  days: Record<string, Task[]>
}

export function monthKeyFromYmd(ymd: string): string {
  return ymd.slice(0, 7)
}

export function emptyMonthArchive(month: string): MonthArchive {
  return { v: 1, month, days: {} }
}

export function parseMonthArchive(raw: unknown): MonthArchive {
  if (!raw || typeof raw !== 'object') throw new Error('月归档格式无效')
  const obj = raw as Partial<MonthArchive>
  if (obj.v !== 1 || typeof obj.month !== 'string' || !obj.days || typeof obj.days !== 'object') {
    throw new Error('月归档格式无效')
  }
  return { v: 1, month: obj.month, days: obj.days as Record<string, Task[]> }
}

/** 未完成优先（进行中 → 规划中 → 已完成），同组按优先级 1→3 */
export function sortTasksForCalendar(tasks: Task[]): Task[] {
  const statusRank = (s: TaskStatus) => (s === 'started' ? 0 : s === 'planned' ? 1 : 2)
  return [...tasks].sort((a, b) => {
    const sr = statusRank(a.status) - statusRank(b.status)
    if (sr !== 0) return sr
    return (a.priority ?? 3) - (b.priority ?? 3)
  })
}

export function upsertMonthDay(archive: MonthArchive, ymd: string, tasks: Task[]): MonthArchive {
  return {
    ...archive,
    days: {
      ...archive.days,
      [ymd]: tasks,
    },
  }
}
