interface Props {
  categories: string[]
  value: string
  onChange: (c: string) => void
}

export function CategoryTabs({ categories, value, onChange }: Props) {
  if (!categories.length) {
    return <div className="cat-empty">请先在仓库创建 data/分类名/</div>
  }
  return (
    <div className="cat-tabs" role="tablist">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={c === value}
          className={c === value ? 'cat-tab active' : 'cat-tab'}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
