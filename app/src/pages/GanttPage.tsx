import { useEffect, useMemo, useState } from 'react'
import { Spin, Tooltip } from 'antd'
import type { GithubClient } from '../lib/github'
import { mapPool } from '../lib/github'
import { dateKeyFromIso, lastNDays, todayYmd } from '../lib/date'
import { parseMarkdown } from '../lib/markdown'
import { isTerminalStatus, toStatsBucket } from '../lib/taskModel'
import type { Task } from '../types'
import { PRIORITY_LABEL, STATUS_LABEL } from '../types'

interface Props {
  client: GithubClient
  category: string
}

/** 仅展示：进行中，或时间窗内有开始/完成；窗外已完成的不展示 */
function isGanttVisible(task: Task, windowStart: string, windowEnd: string): boolean {
  if (toStatsBucket(task.status) === 'started') return true
  const started = dateKeyFromIso(task.assignedAt || task.startedAt)
  const completed = dateKeyFromIso(task.acceptedAt || task.completedAt)
  const inWindow = (d: string | null) => !!d && d >= windowStart && d <= windowEnd
  return inWindow(started) || inWindow(completed)
}

function useGanttColWidth(labelW: number, dayCount: number) {
  const [colW, setColW] = useState(44)
  useEffect(() => {
    const calc = () => {
      // 侧栏 240 + shell 左右 16*2 + 栏间距 12 + 主区内边距约 36
      const avail = window.innerWidth - labelW - 240 - 16 * 2 - 12 - 36
      setColW(Math.max(36, Math.min(52, Math.floor(avail / dayCount))))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [labelW, dayCount])
  return colW
}

export function GanttPage({ client, category }: Props) {
  const days = useMemo(() => lastNDays(30), [])
  const today = todayYmd()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const labelW = 160
  const colW = useGanttColWidth(labelW, days.length)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const files = await client.listDateFiles(category)
        const inWindow = files.filter((d) => d >= days[0] && d <= days[days.length - 1])
        const contents = await mapPool(inWindow, 4, async (ymd) => {
          const file = await client.getFile(category, ymd)
          return { ymd, tasks: file ? parseMarkdown(file.content, category) : [] }
        })
        if (cancelled) return
        const byId = new Map<string, Task>()
        const sorted = [...contents].sort((a, b) => a.ymd.localeCompare(b.ymd))
        for (const day of sorted) {
          for (const t of day.tasks) {
            const prev = byId.get(t.id)
            if (!prev) byId.set(t.id, { ...t })
            else {
              byId.set(t.id, {
                ...t,
                plannedAt: prev.plannedAt || t.plannedAt,
                startedAt: prev.startedAt || t.startedAt,
                completedAt: t.completedAt || prev.completedAt,
                assignedAt: prev.assignedAt || t.assignedAt,
                processedAt: prev.processedAt || t.processedAt,
                acceptedAt: t.acceptedAt || prev.acceptedAt,
                assignee: t.assignee || prev.assignee,
              })
            }
          }
        }
        setTasks([...byId.values()])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, category, days])

  const windowStart = days[0]
  const windowEnd = days[days.length - 1]
  const visibleTasks = useMemo(
    () => tasks.filter((t) => isGanttVisible(t, windowStart, windowEnd)),
    [tasks, windowStart, windowEnd],
  )

  if (loading) {
    return (
      <div className="panel panel-loading">
        <Spin size="large" />
      </div>
    )
  }
  if (error) return <div className="alert alert-danger">{error}</div>

  const trackW = days.length * colW

  return (
    <div className="panel gantt-panel">
      {!visibleTasks.length && <p className="empty-state">窗口内暂无任务</p>}
      <div className="gantt-scroll">
        <div style={{ width: labelW + trackW }}>
          <div className="gantt-head-row">
            <div className="gantt-label-cell" style={{ width: labelW }}>
              任务
            </div>
            <div className="gantt-days" style={{ width: trackW }}>
              {days.map((d) => (
                <Tooltip key={d} title={d}>
                  <div className={`gantt-day ${d === today ? 'is-today' : ''}`} style={{ width: colW }}>
                    {d.slice(8)}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
          {visibleTasks.map((task) => (
            <GanttRow key={task.id} task={task} days={days} labelW={labelW} colW={colW} today={today} />
          ))}
        </div>
      </div>
    </div>
  )
}

function GanttRow({
  task,
  days,
  labelW,
  colW,
  today,
}: {
  task: Task
  days: string[]
  labelW: number
  colW: number
  today: string
}) {
  const planned = dateKeyFromIso(task.plannedAt)
  const started = dateKeyFromIso(task.assignedAt || task.startedAt)
  const completed = dateKeyFromIso(task.acceptedAt || task.completedAt)
  const plannedIdx = planned ? days.indexOf(planned) : -1
  let startIdx = started ? days.indexOf(started) : -1
  // 开始早于窗口时，条从左缘起画，避免进行中任务无条
  if (startIdx < 0 && started && started < days[0]) startIdx = 0
  let endIdx = completed ? days.indexOf(completed) : -1
  if (startIdx >= 0 && !isTerminalStatus(task.status)) {
    if (endIdx < 0) endIdx = days.indexOf(today)
    if (endIdx < 0) endIdx = days.length - 1
  }
  if (startIdx >= 0 && endIdx >= 0 && endIdx < startIdx) endIdx = startIdx

  return (
    <div className="gantt-head-row">
      <div className="gantt-label-cell" style={{ width: labelW }}>
        <Tooltip title={STATUS_LABEL[task.status]}>
          <span className={`gantt-dot status-${task.status}`} />
        </Tooltip>
        {task.priority ? (
          <span className={`gantt-priority p${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
        ) : null}
        <Tooltip
          title={`${task.title || '（无标题）'}${
            task.assignee ? ` · ${task.assignee}` : ''
          }${task.priority ? ` · ${PRIORITY_LABEL[task.priority]}` : ''}`}
        >
          <span className="gantt-title">
            {task.assignee ? `${task.assignee} · ` : ''}
            {task.title}
          </span>
        </Tooltip>
      </div>
      <div className="gantt-track" style={{ width: days.length * colW, height: 32 }}>
        {plannedIdx >= 0 && (
          <Tooltip title={`规划 ${planned}`}>
            <span className="gantt-plan" style={{ left: plannedIdx * colW + colW / 2 - 4 }} />
          </Tooltip>
        )}
        {startIdx >= 0 && endIdx >= 0 && (
          <Tooltip
            title={`${started ?? ''} → ${completed ?? (isTerminalStatus(task.status) ? '' : '进行中')}`}
          >
            <span
              className={`gantt-bar ${isTerminalStatus(task.status) ? 'is-done' : 'is-active'}`}
              style={{
                left: startIdx * colW + 2,
                width: Math.max(colW - 4, (endIdx - startIdx + 1) * colW - 4),
              }}
            />
          </Tooltip>
        )}
      </div>
    </div>
  )
}
