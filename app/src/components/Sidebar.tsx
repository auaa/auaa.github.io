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
  onCreate: () => void
  createOpen?: boolean
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
    width: 20,
    height: 20,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="14" height="13" rx="2" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" />
          <path d="M7.5 12.5l1.8 1.8 3.7-3.7" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6.5V10l3 2" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="14" height="13" rx="2" />
          <path d="M3 8h14M7 2.5v3M13 2.5v3" />
        </svg>
      )
    case 'gantt':
      return (
        <svg {...common}>
          <path d="M3 5h9M3 10h12M3 15h7" />
          <path d="M3 5v10" />
        </svg>
      )
    case 'folder':
      return (
        <svg {...common}>
          <path d="M3 7.5V15a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 15V9a1.5 1.5 0 0 0-1.5-1.5H10L8.5 6H4.5A1.5 1.5 0 0 0 3 7.5z" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} width={22} height={22}>
          <path d="M10 5v10M5 10h10" />
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
  onCreate,
  createOpen = false,
  dateLabel,
}: Props) {
  const { year, monthEn, day, weekday, isWeekend } = splitYmd(dateLabel)

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand-wrap">
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
        <button
          type="button"
          className={createOpen ? 'side-add is-open' : 'side-add'}
          onClick={onCreate}
          title="新建任务"
          aria-label="新建任务"
          aria-expanded={createOpen}
        >
          <span className="side-add-orbit" aria-hidden="true">
            <span className="side-add-dot" />
          </span>
          <span className="side-add-icon">
            <NavIcon name="plus" />
          </span>
        </button>
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
