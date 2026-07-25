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

/** SVG 火焰，数字居中在火焰内 */
export function PriorityFlame({ value, size = 24 }: Props) {
  if (!value) {
    return <span className="priority-empty">—</span>
  }
  const color = COLORS[value]
  return (
    <span className="priority-flame" title={`优先级 ${value}`}>
      <svg viewBox="0 0 32 40" width={size} height={size * 1.25} aria-hidden>
        <path
          d="M16 2
             C14.2 6.5 11.5 9.2 10.2 12.5
             C8.8 16.2 9.5 18.5 8.2 21
             C6.5 24.2 4.5 25.5 4.5 29.5
             C4.5 34.8 9.2 38.5 16 38.5
             C22.8 38.5 27.5 34.8 27.5 29.5
             C27.5 25.5 25.5 24.2 23.8 21
             C22.5 18.5 23.2 16.2 21.8 12.5
             C20.5 9.2 17.8 6.5 16 2 Z"
          fill={color}
          fillOpacity="0.12"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text
          x="16"
          y="28"
          textAnchor="middle"
          fill={color}
          fontSize="14"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        >
          {value}
        </text>
      </svg>
    </span>
  )
}

export const PRIORITY_OPTIONS: { value: TaskPriority; label: ReactNode }[] = [
  { value: 1, label: <PriorityFlame value={1} /> },
  { value: 2, label: <PriorityFlame value={2} /> },
  { value: 3, label: <PriorityFlame value={3} /> },
]
