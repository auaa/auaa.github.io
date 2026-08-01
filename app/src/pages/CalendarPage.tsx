import { useEffect, useMemo, useState } from 'react'
import { Button, Calendar, Modal, Spin, Tooltip } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { GithubClient, MonthArchive } from '../lib/github'
import { todayYmd } from '../lib/date'
import { sortTasksForCalendar } from '../lib/monthArchive'
import { TaskList } from '../components/TaskList'
import { PRIORITY_LABEL, STATUS_LABEL, type Task, type TaskStatus } from '../types'

const CELL_LIMIT = 5

const STATUS_BAR: Record<TaskStatus, string> = {
  planned: '#8590a2',
  started: '#b38600',
  completed: '#216e4e',
}

interface Props {
  client: GithubClient
  category: string
}

function taskTooltip(task: Task): string {
  const lines = [
    task.title || '（无标题）',
    `状态：${STATUS_LABEL[task.status]}`,
    `优先级：${task.priority ? PRIORITY_LABEL[task.priority] : '—'}`,
  ]
  if (task.dueAt) lines.push(`期望完成：${task.dueAt}`)
  if (task.plannedAt) lines.push(`规划：${task.plannedAt}`)
  if (task.startedAt) lines.push(`开始：${task.startedAt}`)
  if (task.completedAt) lines.push(`完成：${task.completedAt}`)
  if (task.detail) lines.push(`详情：${task.detail}`)
  return lines.join('\n')
}

export function CalendarPage({ client, category }: Props) {
  const today = todayYmd()
  const [panelMonth, setPanelMonth] = useState(() => dayjs(today))
  const [archive, setArchive] = useState<MonthArchive | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dayOpen, setDayOpen] = useState<string | null>(null)

  const monthKey = panelMonth.format('YYYY-MM')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setArchive(null)
      try {
        const file = await client.getMonthArchive(category, monthKey)
        if (cancelled) return
        setArchive(file?.data ?? null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, category, monthKey])

  const dayTasks = useMemo(() => {
    if (!dayOpen || !archive) return []
    return sortTasksForCalendar(archive.days[dayOpen] ?? [])
  }, [archive, dayOpen])

  function dayHasTasks(ymd: string) {
    return (archive?.days[ymd]?.length ?? 0) > 0
  }

  function openDay(ymd: string) {
    if (!dayHasTasks(ymd)) return
    setDayOpen(ymd)
  }

  function cellRender(date: Dayjs) {
    const ymd = date.format('YYYY-MM-DD')
    if (date.format('YYYY-MM') !== monthKey) {
      return <div className="cal-cell is-outside" />
    }
    const raw = archive?.days[ymd] ?? []
    const sorted = sortTasksForCalendar(raw)
    const shown = sorted.slice(0, CELL_LIMIT)
    const more = sorted.length - shown.length
    const clickable = sorted.length > 0

    return (
      <div
        className={`cal-cell${ymd === today ? ' is-today' : ''}${clickable ? ' is-clickable' : ' is-empty'}`}
        onClick={clickable ? () => openDay(ymd) : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openDay(ymd)
                }
              }
            : undefined
        }
      >
        <div className="cal-cell-date">{date.date()}</div>
        <div className="cal-cell-tasks">
          {shown.map((t) => (
            <Tooltip key={t.id} title={<pre className="cal-tip">{taskTooltip(t)}</pre>}>
              <div
                className="cal-task-line"
                onClick={(e) => e.stopPropagation()}
                style={{ borderLeftColor: STATUS_BAR[t.status] }}
              >
                <span className="cal-task-title">{t.title || '（无标题）'}</span>
              </div>
            </Tooltip>
          ))}
          {more > 0 && (
            <button
              type="button"
              className="cal-more"
              onClick={(e) => {
                e.stopPropagation()
                openDay(ymd)
              }}
            >
              +{more}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="cal-page">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="cal-full">
        {loading ? (
          <div className="cal-loading">
            <Spin />
          </div>
        ) : (
          <Calendar
            fullscreen
            mode="month"
            value={panelMonth}
            onPanelChange={(d, mode) => {
              if (mode !== 'month') return
              setPanelMonth(d)
            }}
            onSelect={(d) => {
              const ymd = d.format('YYYY-MM-DD')
              if (d.format('YYYY-MM') === monthKey) openDay(ymd)
              else setPanelMonth(d)
            }}
            headerRender={() => (
              <div className="cal-header">
                <Button size="small" onClick={() => setPanelMonth((m) => m.subtract(1, 'month'))}>
                  上一月
                </Button>
                <span className="cal-header-label">{panelMonth.format('YYYY年M月')}</span>
                <Button size="small" onClick={() => setPanelMonth((m) => m.add(1, 'month'))}>
                  下一月
                </Button>
              </div>
            )}
            fullCellRender={cellRender}
          />
        )}
      </div>

      <Modal
        title={dayOpen ?? '当日任务'}
        open={!!dayOpen}
        onCancel={() => setDayOpen(null)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {!dayOpen || !(archive?.days[dayOpen]?.length) ? (
          <p className="empty-state">该日无任务</p>
        ) : (
          <TaskList tasks={dayTasks} readOnly />
        )}
      </Modal>
    </div>
  )
}
