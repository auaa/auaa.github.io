import { useCallback, useEffect, useRef, useState } from 'react'
import type { GithubClient } from '../lib/github'
import { todayYmd } from '../lib/date'
import { parseMarkdown } from '../lib/markdown'
import { TaskList } from '../components/TaskList'
import type { Task } from '../types'

interface DayBlock {
  ymd: string
  tasks: Task[]
}

interface Props {
  client: GithubClient
  category: string
}

export function HistoryPage({ client, category }: Props) {
  const [dates, setDates] = useState<string[]>([])
  const [blocks, setBlocks] = useState<DayBlock[]>([])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinel = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setBlocks([])
      setCursor(0)
      try {
        const today = todayYmd()
        const all = (await client.listDateFiles(category)).filter((d) => d < today)
        if (cancelled) return
        setDates(all)
        const first = await loadBatch(client, category, all, 0, 2)
        if (cancelled) return
        setBlocks(first)
        setCursor(first.length)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, category])

  const loadMore = useCallback(async () => {
    if (loadingMore || cursor >= dates.length) return
    setLoadingMore(true)
    try {
      const more = await loadBatch(client, category, dates, cursor, 2)
      setBlocks((b) => [...b, ...more])
      setCursor((c) => c + more.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingMore(false)
    }
  }, [client, category, dates, cursor, loadingMore])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore()
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  if (loading) return <div className="panel muted-panel">加载历史…</div>
  if (error) return <div className="alert alert-danger">{error}</div>

  return (
    <div className="panel">
      {!blocks.length && <p className="empty-state">暂无历史记录</p>}
      {blocks.map((b) => (
        <section key={b.ymd} className="day-block">
          <h3 className="day-label">{b.ymd}</h3>
          <TaskList tasks={b.tasks} readOnly />
        </section>
      ))}
      <div ref={sentinel} className="sentinel">
        {cursor < dates.length ? (loadingMore ? '加载中…' : '继续向下加载') : blocks.length ? '没有更多了' : ''}
      </div>
    </div>
  )
}

async function loadBatch(
  client: GithubClient,
  category: string,
  dates: string[],
  start: number,
  count: number,
): Promise<DayBlock[]> {
  const slice = dates.slice(start, start + count)
  const out: DayBlock[] = []
  for (const ymd of slice) {
    const file = await client.getFile(category, ymd)
    out.push({ ymd, tasks: file ? parseMarkdown(file.content) : [] })
  }
  return out
}
