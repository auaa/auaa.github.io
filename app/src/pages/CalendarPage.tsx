import { useEffect, useMemo, useState } from 'react'
import type { GithubClient } from '../lib/github'
import { todayYmd, ymdToDate } from '../lib/date'
import { parseMarkdown } from '../lib/markdown'
import { TaskList } from '../components/TaskList'
import type { Task } from '../types'

interface Props {
  client: GithubClient
  category: string
}

function monthStart(ymd: string) {
  return `${ymd.slice(0, 7)}-01`
}

function daysInMonth(ymd: string) {
  const [yy, mm] = ymd.split('-').map(Number)
  return new Date(yy, mm, 0).getDate()
}

function weekdayMon0(ymd: string) {
  // 0=Mon … 6=Sun
  const js = ymdToDate(ymd).getDay() // 0=Sun
  return (js + 6) % 7
}

export function CalendarPage({ client, category }: Props) {
  const today = todayYmd()
  const [cursorMonth, setCursorMonth] = useState(() => monthStart(today))
  const [selected, setSelected] = useState(today)
  const [fileDates, setFileDates] = useState<Set<string>>(new Set())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cells = useMemo(() => {
    const start = monthStart(cursorMonth)
    const n = daysInMonth(start)
    const pad = weekdayMon0(start)
    const out: (string | null)[] = Array.from({ length: pad }, () => null)
    for (let i = 1; i <= n; i++) {
      out.push(`${start.slice(0, 8)}${String(i).padStart(2, '0')}`)
    }
    while (out.length % 7) out.push(null)
    return out
  }, [cursorMonth])

  const monthLabel = useMemo(() => {
    const [y, m] = cursorMonth.split('-')
    return `${y}年${Number(m)}月`
  }, [cursorMonth])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingDates(true)
      setError(null)
      try {
        const dates = await client.listDateFiles(category)
        if (cancelled) return
        setFileDates(new Set(dates))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoadingDates(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, category])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingDay(true)
      setError(null)
      try {
        if (!fileDates.has(selected) && !loadingDates) {
          if (!cancelled) setTasks([])
          return
        }
        const file = await client.getFile(category, selected)
        if (cancelled) return
        setTasks(file ? parseMarkdown(file.content) : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoadingDay(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, category, selected, fileDates, loadingDates])

  function shiftMonth(delta: number) {
    const [y, m] = cursorMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    setCursorMonth(next)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">日历</h2>
          <p className="panel-desc">点选日期查看当天任务（只读）</p>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn" onClick={() => shiftMonth(-1)}>
            上月
          </button>
          <span className="hint">{monthLabel}</span>
          <button type="button" className="btn" onClick={() => shiftMonth(1)}>
            下月
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setCursorMonth(monthStart(today))
              setSelected(today)
            }}
          >
            今天
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="cal-grid" role="grid" aria-label={monthLabel}>
        {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
          <div key={d} className="cal-weekday">
            {d}
          </div>
        ))}
        {cells.map((ymd, i) =>
          ymd ? (
            <button
              key={ymd}
              type="button"
              className={[
                'cal-day',
                ymd === selected ? 'is-selected' : '',
                ymd === today ? 'is-today' : '',
                fileDates.has(ymd) ? 'has-file' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelected(ymd)}
            >
              <span className="cal-day-num">{Number(ymd.slice(8))}</span>
            </button>
          ) : (
            <div key={`e-${i}`} className="cal-day is-empty" />
          ),
        )}
      </div>

      <div className="cal-day-panel">
        <h3 className="day-label">{selected}</h3>
        {loadingDay || loadingDates ? (
          <p className="hint">加载中…</p>
        ) : !fileDates.has(selected) ? (
          <p className="empty-state">该日无任务文件</p>
        ) : (
          <TaskList tasks={tasks} readOnly />
        )}
      </div>
    </div>
  )
}
