import type { TabId } from '../types'
import { TAB_LABEL } from '../types'

const NAV_TABS: { id: TabId; icon: string }[] = [
  { id: 'today', icon: 'today' },
  { id: 'history', icon: 'history' },
  { id: 'calendar', icon: 'calendar' },
  { id: 'gantt', icon: 'gantt' },
]

interface Props {
  tab: TabId
  onTabChange: (t: TabId) => void
  categories: string[]
  category: string
  onCategoryChange: (c: string) => void
  dateLabel: string
}

const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function splitYmd(ymd: string) {
  const [y, m, d] = ymd.split('-')
  const date = new Date(`${ymd}T12:00:00+08:00`)
  const weekday = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).format(date)
  const dow = date.getDay()
  return {
    year: y,
    monthEn: MONTH_EN[Number(m) - 1] ?? m,
    day: String(Number(d)),
    weekday,
    isWeekend: dow === 0 || dow === 6,
  }
}

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" />
          <path d="M5.5 9.5h2M8.5 11.5h2" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.5l2.5 1.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2M5.5 9h1M7.5 9h1M9.5 9h1M5.5 11h1M7.5 11h1" />
        </svg>
      )
    case 'gantt':
      return (
        <svg {...common}>
          <path d="M2.5 4h6M2.5 8h9M2.5 12h5" />
          <path d="M2.5 4v8" />
        </svg>
      )
    case 'folder':
      return (
        <svg {...common}>
          <path d="M2.5 5.5V12a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 13.5 12V6.5A1.5 1.5 0 0 0 12 5H8L6.5 3.5H4A1.5 1.5 0 0 0 2.5 5v.5z" />
        </svg>
      )
    default:
      return null
  }
}

export function Sidebar({
  tab,
  onTabChange,
  categories,
  category,
  onCategoryChange,
  dateLabel,
}: Props) {
  const { year, monthEn, day, weekday, isWeekend } = splitYmd(dateLabel)

  return (
    <aside className="app-sidebar">
      <div className="sidebar-date" title={dateLabel} aria-label={dateLabel}>
        <div className="sidebar-date-month">{monthEn}</div>
        <div className="sidebar-date-body">
          <div className={`sidebar-date-day${isWeekend ? ' weekend' : ''}`}>{day}</div>
          <div className="sidebar-date-meta">
            <span className="sidebar-date-weekday">{weekday}</span>
            <span className="sidebar-date-year">{year}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <div className="sidebar-section-label">视图</div>
          {NAV_TABS.map(({ id, icon }) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'side-item is-active' : 'side-item'}
              onClick={() => onTabChange(id)}
            >
              <span className="side-item-icon">
                <NavIcon name={icon} />
              </span>
              <span className="side-item-label">{TAB_LABEL[id]}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">分类</div>
          {!categories.length && <p className="hint side-hint">请先在仓库创建 data/分类名/</p>}
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={c === category ? 'side-item is-active' : 'side-item'}
              onClick={() => onCategoryChange(c)}
              title={c}
            >
              <span className="side-item-icon">
                <NavIcon name="folder" />
              </span>
              <span className="side-item-label">{c}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
