import type { TabId } from '../types'

const ITEMS: { id: TabId; label: string }[] = [
  { id: 'today', label: '今天' },
  { id: 'history', label: '历史' },
  { id: 'gantt', label: '甘特' },
]

interface Props {
  value: TabId
  onChange: (t: TabId) => void
}

export function BottomNav({ value, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          type="button"
          className={value === it.id ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}
