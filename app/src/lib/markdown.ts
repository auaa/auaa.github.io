import { normalizeDateTime } from './date'
import {
  isOpenStatus,
  isTerminalStatus,
  normalizeTaskForCategory,
  teamStatusRequiresAssignee,
} from './taskModel'
import type { Task, TaskPriority, TaskStatus } from '../types'

const LINE_RE =
  /^-\s+\[([ xX])\]\s+(.*?)\s*<!--\s*(.*?)\s*-->\s*$/

/** 按 key:value 切分；value 可含空格，直到下一个字母 key:（避免把 14:30 当成 key） */
const META_RE = /([A-Za-z]+):((?:(?!\s+[A-Za-z]+:).)+)/g

const ALL_STATUSES = new Set<string>([
  'planned',
  'started',
  'completed',
  'transferred',
  'assigned',
  'processed',
  'accepted',
  'cancelled',
])

function parsePriority(v: string): TaskPriority | undefined {
  if (v === '1' || v === '2' || v === '3') return Number(v) as TaskPriority
  return undefined
}

function parseMeta(raw: string): Partial<Task> & { id?: string; status?: TaskStatus } {
  const out: Partial<Task> & { id?: string; status?: TaskStatus } = {}
  META_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = META_RE.exec(raw)) !== null) {
    const k = m[1]
    const v = m[2].trim()
    if (k === 'id') out.id = v
    else if (k === 'status' && ALL_STATUSES.has(v)) out.status = v as TaskStatus
    else if (k === 'planned') out.plannedAt = normalizeDateTime(v) ?? v
    else if (k === 'started') out.startedAt = normalizeDateTime(v) ?? v
    else if (k === 'completed') out.completedAt = normalizeDateTime(v) ?? v
    else if (k === 'assignedAt') out.assignedAt = normalizeDateTime(v) ?? v
    else if (k === 'processedAt') out.processedAt = normalizeDateTime(v) ?? v
    else if (k === 'acceptedAt') out.acceptedAt = normalizeDateTime(v) ?? v
    else if (k === 'assignee') out.assignee = decodeURIComponent(v)
    else if (k === 'priority') {
      const p = parsePriority(v)
      if (p) out.priority = p
    } else if (k === 'due') out.dueAt = decodeURIComponent(v)
    else if (k === 'detail') {
      try {
        out.detail = decodeURIComponent(v)
      } catch {
        out.detail = v
      }
    }
  }
  return out
}

export function parseMarkdown(md: string, category?: string): Task[] {
  const tasks: Task[] = []
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(LINE_RE)
    if (!m) continue
    const checked = m[1].toLowerCase() === 'x'
    const title = m[2].trim()
    const meta = parseMeta(m[3])
    if (!meta.id) continue
    let status: TaskStatus = meta.status ?? (checked ? 'completed' : 'planned')
    const task: Task = {
      id: meta.id,
      title,
      status,
      plannedAt: meta.plannedAt ?? '',
      startedAt: meta.startedAt,
      completedAt: meta.completedAt,
      assignedAt: meta.assignedAt,
      processedAt: meta.processedAt,
      acceptedAt: meta.acceptedAt,
      priority: meta.priority,
      detail: meta.detail,
      dueAt: meta.dueAt,
      assignee: meta.assignee,
    }
    tasks.push(category ? normalizeTaskForCategory(task, category) : task)
  }
  return tasks
}

export function serializeMarkdown(tasks: Task[], heading?: string): string {
  const lines: string[] = []
  if (heading) {
    lines.push(`# ${heading}`, '')
  }
  for (const t of tasks) {
    const box = isTerminalStatus(t.status) ? 'x' : ' '
    const parts = [`id:${t.id}`, `status:${t.status}`, `planned:${t.plannedAt}`]
    if (t.startedAt) parts.push(`started:${t.startedAt}`)
    if (t.completedAt) parts.push(`completed:${t.completedAt}`)
    if (t.assignedAt) parts.push(`assignedAt:${t.assignedAt}`)
    if (t.processedAt) parts.push(`processedAt:${t.processedAt}`)
    if (t.acceptedAt) parts.push(`acceptedAt:${t.acceptedAt}`)
    if (t.assignee) parts.push(`assignee:${encodeURIComponent(t.assignee)}`)
    if (t.priority) parts.push(`priority:${t.priority}`)
    if (t.dueAt) parts.push(`due:${encodeURIComponent(t.dueAt)}`)
    if (t.detail) parts.push(`detail:${encodeURIComponent(t.detail)}`)
    lines.push(`- [${box}] ${t.title} <!-- ${parts.join(' ')} -->`)
  }
  lines.push('')
  return lines.join('\n')
}

export function inheritOpenTasks(from: Task[], category = ''): Task[] {
  return from
    .filter((t) => isOpenStatus(t.status, category))
    .map((t) => ({ ...t }))
}

export function applyStatusChange(task: Task, next: TaskStatus, nowIso: string): Task {
  const t = { ...task, status: next }
  if (next === 'planned') {
    delete t.startedAt
    delete t.completedAt
    delete t.assignedAt
    delete t.processedAt
    delete t.acceptedAt
  } else if (next === 'started') {
    delete t.completedAt
    if (!t.startedAt) t.startedAt = nowIso
  } else if (next === 'completed') {
    if (!t.startedAt) t.startedAt = nowIso
    if (!t.completedAt) t.completedAt = nowIso
  } else if (next === 'assigned') {
    delete t.processedAt
    delete t.acceptedAt
    if (!t.assignedAt) t.assignedAt = nowIso
  } else if (next === 'processed') {
    delete t.acceptedAt
    if (!t.assignedAt) t.assignedAt = nowIso
    if (!t.processedAt) t.processedAt = nowIso
  } else if (next === 'accepted') {
    if (!t.assignedAt) t.assignedAt = nowIso
    if (!t.processedAt) t.processedAt = nowIso
    if (!t.acceptedAt) t.acceptedAt = nowIso
  } else if (next === 'transferred') {
    if (!t.completedAt) t.completedAt = nowIso
  } else if (next === 'cancelled') {
    if (!t.completedAt) t.completedAt = nowIso
  }
  return t
}

/** 团队状态变更时校验责任人 */
export function assertTeamStatusChange(task: Task, next: TaskStatus): string | null {
  if (!teamStatusRequiresAssignee(next)) return null
  if (task.assignee?.trim()) return null
  return '请先选择责任人'
}
