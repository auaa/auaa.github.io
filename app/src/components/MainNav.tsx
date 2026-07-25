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

export function MainNav({ value, onChange }: Props) {
  return (
    <nav className="main-nav" aria-label="主导航">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          type="button"
          className={value === it.id ? 'main-nav-item is-active' : 'main-nav-item'}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}
