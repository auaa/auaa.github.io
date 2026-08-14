import type { SidebarStatsCounts } from '../lib/sidebarStats'
import { STATUS_LABEL } from '../types'

const STATUS_COLOR: Record<'planned' | 'started' | 'completed', string> = {
  planned: '#8590a2',
  started: '#b38600',
  completed: '#216e4e',
}

const STATUS_ORDER: Array<'planned' | 'started' | 'completed'> = ['planned', 'started', 'completed']

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

function formatRatePct(r: number): string {
  return `${Math.round(Math.min(1, Math.max(0, r)) * 100)}%`
}

function RateSparkline({ rates }: { rates: Array<number | null> }) {
  const w = 200
  const h = 46
  const padX = 10
  const padTop = 12
  const padBottom = 4
  const innerW = w - padX * 2
  const innerH = h - padTop - padBottom
  const n = rates.length
  const xAt = (i: number) => padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yAt = (r: number) => padTop + (1 - r) * innerH

  const segments: string[] = []
  let pts: string[] = []
  const dots: { i: number; r: number }[] = []
  rates.forEach((r, i) => {
    if (r == null) {
      if (pts.length) {
        segments.push(pts.join(' '))
        pts = []
      }
      return
    }
    const clamped = Math.min(1, Math.max(0, r))
    dots.push({ i, r: clamped })
    pts.push(`${xAt(i).toFixed(1)},${yAt(clamped).toFixed(1)}`)
  })
  if (pts.length) segments.push(pts.join(' '))

  const label = rates
    .map((r, i) => (r == null ? null : `${i + 1}日 ${formatRatePct(r)}`))
    .filter(Boolean)
    .join('，')

  return (
    <svg
      className="sidebar-stats-spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label ? `近七日完成率：${label}` : '近七日完成率'}
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
      {dots.map(({ i, r }) => {
        const x = xAt(i)
        const y = yAt(r)
        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'
        return (
          <g key={i}>
            <circle className="sidebar-stats-spark-dot" cx={x} cy={y} r={2} />
            <text
              className="sidebar-stats-spark-label"
              x={x}
              y={Math.max(9, y - 5)}
              textAnchor={anchor}
            >
              {formatRatePct(r)}
            </text>
          </g>
        )
      })}
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
