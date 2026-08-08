import type { SidebarStatsCounts } from '../lib/sidebarStats'
import { STATUS_LABEL, type TaskStatus } from '../types'

const STATUS_COLOR: Record<TaskStatus, string> = {
  planned: '#8590a2',
  started: '#b38600',
  completed: '#216e4e',
}

const STATUS_ORDER: TaskStatus[] = ['planned', 'started', 'completed']

interface Props {
  loading?: boolean
  today: SidebarStatsCounts
  rates: Array<number | null>
}

function StatusBar({ counts }: { counts: SidebarStatsCounts }) {
  const total = STATUS_ORDER.reduce((s, k) => s + counts[k], 0)
  if (total <= 0) {
    return <div className="sidebar-stats-bar is-empty" aria-hidden />
  }
  return (
    <div
      className="sidebar-stats-bar"
      role="img"
      aria-label={`规划中 ${counts.planned}，进行中 ${counts.started}，已完成 ${counts.completed}`}
    >
      {STATUS_ORDER.map((status) => {
        const n = counts[status]
        if (n <= 0) return null
        return (
          <span
            key={status}
            className="sidebar-stats-bar-seg"
            style={{
              flexGrow: n,
              background: STATUS_COLOR[status],
            }}
          />
        )
      })}
    </div>
  )
}

function RateSparkline({ rates }: { rates: Array<number | null> }) {
  const w = 200
  const h = 28
  const padX = 2
  const padY = 3
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const n = rates.length
  const xAt = (i: number) => padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yAt = (r: number) => padY + (1 - r) * innerH

  const segments: string[] = []
  let pts: string[] = []
  rates.forEach((r, i) => {
    if (r == null) {
      if (pts.length) {
        segments.push(pts.join(' '))
        pts = []
      }
      return
    }
    const clamped = Math.min(1, Math.max(0, r))
    pts.push(`${xAt(i).toFixed(1)},${yAt(clamped).toFixed(1)}`)
  })
  if (pts.length) segments.push(pts.join(' '))

  const lastIdx = [...rates].map((r, i) => (r != null ? i : -1)).filter((i) => i >= 0).pop()
  const lastR = lastIdx != null ? rates[lastIdx] : null

  return (
    <svg
      className="sidebar-stats-spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="近七日完成率"
    >
      <line
        className="sidebar-stats-spark-base"
        x1={padX}
        y1={yAt(0)}
        x2={w - padX}
        y2={yAt(0)}
      />
      {segments.map((d, i) => (
        <polyline key={i} className="sidebar-stats-spark-line" fill="none" points={d} />
      ))}
      {lastIdx != null && lastR != null && (
        <circle
          className="sidebar-stats-spark-dot"
          cx={xAt(lastIdx)}
          cy={yAt(Math.min(1, Math.max(0, lastR)))}
          r={2.2}
        />
      )}
    </svg>
  )
}

export function SidebarStats({ loading = false, today, rates }: Props) {
  if (loading) {
    return (
      <div className="sidebar-stats" aria-busy="true" aria-label="任务统计加载中">
        <div className="sidebar-section-label">任务统计</div>
        <div className="sidebar-stats-skel sidebar-stats-skel-bar" />
        <div className="sidebar-stats-skel sidebar-stats-skel-legend" />
        <div className="sidebar-stats-skel sidebar-stats-skel-spark" />
      </div>
    )
  }

  return (
    <div className="sidebar-stats">
      <div className="sidebar-section-label">任务统计</div>
      <StatusBar counts={today} />
      <ul className="sidebar-stats-legend">
        {STATUS_ORDER.map((status) => (
          <li key={status}>
            <span className="sidebar-stats-swatch" style={{ background: STATUS_COLOR[status] }} />
            <span className="sidebar-stats-legend-label">{STATUS_LABEL[status]}</span>
            <span className="sidebar-stats-legend-n">{today[status]}</span>
          </li>
        ))}
      </ul>
      <div className="sidebar-stats-trend">
        <div className="sidebar-stats-trend-label">近 7 日完成率</div>
        <RateSparkline rates={rates} />
      </div>
    </div>
  )
}
