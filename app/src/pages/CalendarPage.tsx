import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Calendar, Spin } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { GithubClient } from '../lib/github'
import { todayYmd } from '../lib/date'
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

  const selectedDay = useMemo(() => dayjs(selected), [selected])

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
        if (!fileDates.has(selected)) {
          if (!cancelled) {
            setTasks([])
            if (!loadingDates) setLoadingDay(false)
          }
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

  function cellRender(date: Dayjs) {
    const key = date.format('YYYY-MM-DD')
    if (!fileDates.has(key)) return null
    return <Badge status="processing" />
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">日历</h2>
          <p className="panel-desc">点选日期查看当天任务（只读）；蓝点表示有任务文件</p>
        </div>
        <div className="panel-actions">
          <Button size="small" onClick={() => setSelected(today)}>
            回到今天
          </Button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="cal-layout">
        <div className="cal-antd-wrap">
          {loadingDates ? (
            <Spin />
          ) : (
            <Calendar
              fullscreen={false}
              value={selectedDay}
              onSelect={(d) => setSelected(d.format('YYYY-MM-DD'))}
              cellRender={cellRender}
            />
          )}
        </div>
        <div className="cal-day-panel">
          <h3 className="day-label">{selected}</h3>
          {loadingDay || loadingDates ? (
            <Spin />
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
