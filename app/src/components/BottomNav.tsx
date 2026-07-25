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
    <nav className="bottom-nav" aria-label="主导航">
      <div className="tabs is-toggle is-fullwidth is-small mb-0">
        <ul>
          {ITEMS.map((it) => (
            <li key={it.id} className={value === it.id ? 'is-active' : undefined}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  onChange(it.id)
                }}
              >
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
