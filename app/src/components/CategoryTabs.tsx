interface Props {
  categories: string[]
  value: string
  onChange: (c: string) => void
}

export function CategoryTabs({ categories, value, onChange }: Props) {
  if (!categories.length) {
    return <p className="has-text-grey is-size-7">请先在仓库创建 data/分类名/</p>
  }
  return (
    <div className="tabs is-small is-toggle is-toggle-rounded mb-0">
      <ul>
        {categories.map((c) => (
          <li key={c} className={c === value ? 'is-active' : undefined}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onChange(c)
              }}
            >
              {c}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
