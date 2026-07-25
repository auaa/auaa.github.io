import { useEffect, useRef, useState } from 'react'
import type { GithubClient } from '../lib/github'
import { todayYmd } from '../lib/date'
import { getLayui } from '../lib/layui'
import { parseMarkdown } from '../lib/markdown'
import { TaskList } from '../components/TaskList'
import type { Task } from '../types'

interface Props {
  client: GithubClient
  category: string
}

export function CalendarPage({ client, category }: Props) {
  const today = todayYmd()
  const [selected, setSelected] = useState(today)
  const [fileDates, setFileDates] = useState<Set<string>>(new Set())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calRef = useRef<HTMLDivElement | null>(null)
  const selectedRef = useRef(selected)
  const fileDatesRef = useRef(fileDates)
  selectedRef.current = selected
  fileDatesRef.current = fileDates

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
          if (!cancelled) {
            setTasks([])
            setLoadingDay(false)
          }
          return
        }
        if (!fileDates.has(selected)) return
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

  useEffect(() => {
    const el = calRef.current
    if (!el || loadingDates) return
    let cancelled = false

    void getLayui().then(({ laydate }) => {
      if (cancelled || !calRef.current) return
      calRef.current.innerHTML = ''
      const mark: Record<string, string> = {}
      for (const d of fileDatesRef.current) mark[d] = ''

      laydate.render({
        elem: calRef.current,
        position: 'static',
        show: true,
        value: selectedRef.current,
        isInitValue: true,
        theme: '#0c66e4',
        mark,
        ready() {
          // keep panel open
        },
        change(value: string) {
          if (value) setSelected(value)
        },
        done(value: string) {
          if (value) setSelected(value)
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [loadingDates, fileDates, category])

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">日历</h2>
          <p className="panel-desc">点选日期查看当天任务（只读）；有文件的日期已标记</p>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="layui-btn layui-btn-primary layui-btn-sm"
            onClick={() => setSelected(today)}
          >
            回到今天
          </button>
        </div>
      </div>

      {error && <div className="layui-bg-red" style={{ padding: '8px 12px', borderRadius: 4 }}>{error}</div>}

      <div className="cal-layout">
        <div className="cal-laydate-wrap">
          {loadingDates ? <p className="hint">加载日历…</p> : <div ref={calRef} className="cal-laydate" />}
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
    </div>
  )
}
