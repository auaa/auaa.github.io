import { normalizeDateTime } from './date'
import type { Task, TaskPriority, TaskStatus } from '../types'

const LINE_RE =
  /^-\s+\[([ xX])\]\s+(.*?)\s*<!--\s*(.*?)\s*-->\s*$/

/** 按 key:value 切分；value 可含空格，直到下一个字母 key:（避免把 14:30 当成 key） */
const META_RE = /([A-Za-z]+):((?:(?!\s+[A-Za-z]+:).)+)/g

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
    else if (k === 'status' && (v === 'planned' || v === 'started' || v === 'completed')) out.status = v
    else if (k === 'planned') out.plannedAt = normalizeDateTime(v) ?? v
    else if (k === 'started') out.startedAt = normalizeDateTime(v) ?? v
    else if (k === 'completed') out.completedAt = normalizeDateTime(v) ?? v
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

export function parseMarkdown(md: string): Task[] {
  const tasks: Task[] = []
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(LINE_RE)
    if (!m) continue
    const checked = m[1].toLowerCase() === 'x'
    const title = m[2].trim()
    const meta = parseMeta(m[3])
    if (!meta.id) continue
    let status: TaskStatus = meta.status ?? (checked ? 'completed' : 'planned')
    tasks.push({
      id: meta.id,
      title,
      status,
      plannedAt: meta.plannedAt ?? '',
      startedAt: meta.startedAt,
      completedAt: meta.completedAt,
      priority: meta.priority,
      detail: meta.detail,
      dueAt: meta.dueAt,
    })
  }
  return tasks
}

export function serializeMarkdown(tasks: Task[], heading?: string): string {
  const lines: string[] = []
  if (heading) {
    lines.push(`# ${heading}`, '')
  }
  for (const t of tasks) {
    const box = t.status === 'completed' ? 'x' : ' '
    const parts = [`id:${t.id}`, `status:${t.status}`, `planned:${t.plannedAt}`]
    if (t.startedAt) parts.push(`started:${t.startedAt}`)
    if (t.completedAt) parts.push(`completed:${t.completedAt}`)
    if (t.priority) parts.push(`priority:${t.priority}`)
    if (t.dueAt) parts.push(`due:${encodeURIComponent(t.dueAt)}`)
    if (t.detail) parts.push(`detail:${encodeURIComponent(t.detail)}`)
    lines.push(`- [${box}] ${t.title} <!-- ${parts.join(' ')} -->`)
  }
  lines.push('')
  return lines.join('\n')
}

export function inheritOpenTasks(from: Task[]): Task[] {
  return from
    .filter((t) => t.status === 'planned' || t.status === 'started')
    .map((t) => ({ ...t }))
}

export function applyStatusChange(task: Task, next: TaskStatus, nowIso: string): Task {
  const t = { ...task, status: next }
  if (next === 'planned') {
    delete t.startedAt
    delete t.completedAt
  } else if (next === 'started') {
    delete t.completedAt
    if (!t.startedAt) t.startedAt = nowIso
  } else if (next === 'completed') {
    if (!t.startedAt) t.startedAt = nowIso
    if (!t.completedAt) t.completedAt = nowIso
  }
  return t
}
