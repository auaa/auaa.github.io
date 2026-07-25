import type { ReactNode } from 'react'
import type { TaskPriority } from '../types'

const COLORS: Record<TaskPriority, string> = {
  1: '#b71c1c',
  2: '#e65100',
  3: '#f9a825',
}

interface Props {
  value?: TaskPriority | null
  size?: number
}

/** 火焰描边 + 中心数字，对齐附件样式 */
export function PriorityFlame({ value, size = 22 }: Props) {
  if (!value) {
    return <span className="priority-empty">—</span>
  }
  const color = COLORS[value]
  return (
    <span className="priority-flame" style={{ width: size, height: size }} title={`优先级 ${value}`}>
      <svg viewBox="0 0 24 28" width={size} height={size * (28 / 24)} aria-hidden>
        {/* 简化火焰轮廓：尖顶 + 两侧火舌 */}
        <path
          d="M12 1.5
             C10.2 5.2 8.8 7.2 8.2 9.4
             C7.5 11.8 7.8 13.2 7.2 14.6
             C6.4 16.4 5.2 17.2 5.2 19.6
             C5.2 23.4 8.2 26.2 12 26.2
             C15.8 26.2 18.8 23.4 18.8 19.6
             C18.8 17.2 17.6 16.4 16.8 14.6
             C16.2 13.2 16.5 11.8 15.8 9.4
             C15.2 7.2 13.8 5.2 12 1.5 Z"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <text
          x="12"
          y="19.5"
          textAnchor="middle"
          fill={color}
          fontSize="10"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
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
