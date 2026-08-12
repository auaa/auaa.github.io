import { FireOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import type { TaskPriority } from '../types'

/** P1 深红 · P2 橙 · P3 金黄 */
const COLORS: Record<TaskPriority, string> = {
  1: '#b71c1c',
  2: '#e65100',
  3: '#f9a825',
}

interface Props {
  value?: TaskPriority | null
  size?: number
}

/**
 * 使用 @ant-design/icons 的 FireOutlined（官方 SVG），
 * 数字叠在火焰中部。
 */
export function PriorityFlame({ value, size = 22 }: Props) {
  if (!value) {
    return <span className="priority-empty">—</span>
  }
  const color = COLORS[value]
  return (
    <span className="priority-flame" style={{ width: size, height: size }}>
      <FireOutlined style={{ fontSize: size, color }} aria-hidden />
      <span className="priority-flame-num" style={{ color, fontSize: Math.max(10, size * 0.45) }}>
        {value}
      </span>
    </span>
  )
}

export const PRIORITY_OPTIONS: { value: TaskPriority; label: ReactNode }[] = [
  { value: 1, label: <PriorityFlame value={1} /> },
  { value: 2, label: <PriorityFlame value={2} /> },
  { value: 3, label: <PriorityFlame value={3} /> },
]
