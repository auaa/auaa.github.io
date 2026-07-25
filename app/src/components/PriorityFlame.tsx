import type { ReactNode } from 'react'
import type { TaskPriority } from '../types'

const TINT: Record<TaskPriority, string> = {
  1: '#b71c1c',
  2: '#e65100',
  3: '#f9a825',
}

interface Props {
  value?: TaskPriority | null
}

/** 🔥 + 数字 */
export function PriorityFlame({ value }: Props) {
  if (!value) {
    return <span className="priority-empty">—</span>
  }
  return (
    <span className="priority-flame" style={{ color: TINT[value] }} title={`优先级 ${value}`}>
      <span aria-hidden>🔥</span>
      <span className="priority-flame-num">{value}</span>
    </span>
  )
}

export const PRIORITY_OPTIONS: { value: TaskPriority; label: ReactNode }[] = [
  { value: 1, label: <PriorityFlame value={1} /> },
  { value: 2, label: <PriorityFlame value={2} /> },
  { value: 3, label: <PriorityFlame value={3} /> },
]
