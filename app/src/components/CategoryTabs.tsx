interface Props {
  categories: string[]
  value: string
  onChange: (c: string) => void
}

export function CategoryTabs({ categories, value, onChange }: Props) {
  if (!categories.length) {
    return <p className="hint">请先在仓库创建 data/分类名/</p>
  }
  return (
    <div className="cat-bar" role="tablist">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={c === value}
          className={c === value ? 'cat-item is-active' : 'cat-item'}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
