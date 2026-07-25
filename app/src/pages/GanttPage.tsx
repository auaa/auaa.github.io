import { useEffect, useMemo, useState } from 'react'
import type { GithubClient } from '../lib/github'
import { mapPool } from '../lib/github'
import { dateKeyFromIso, lastNDays, todayYmd } from '../lib/date'
import { parseMarkdown } from '../lib/markdown'
import type { Task } from '../types'
import { STATUS_LABEL } from '../types'

interface Props {
  client: GithubClient
  category: string
}

export function GanttPage({ client, category }: Props) {
  const days = useMemo(() => lastNDays(30), [])
  const today = todayYmd()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          return { ymd, tasks: file ? parseMarkdown(file.content) : [] }
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

  if (loading) return <div className="panel">加载甘特…</div>
  if (error) return <div className="panel error">{error}</div>

  const colW = 28
  const labelW = 128
  const trackW = days.length * colW

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>甘特</h2>
          <p className="muted">
            过去 30 天（{days[0]} ~ {days[days.length - 1]}）· 只读 · {category}
          </p>
        </div>
      </div>
      {!tasks.length && <div className="empty">窗口内暂无任务</div>}
      <div className="gantt-scroll">
        <div className="gantt" style={{ width: labelW + trackW }}>
          <div className="gantt-head-row">
            <div className="gantt-label-cell" style={{ width: labelW }}>
              任务
            </div>
            <div className="gantt-days" style={{ width: trackW }}>
              {days.map((d) => (
                <div
                  key={d}
                  className={`gantt-day ${d === today ? 'today' : ''}`}
                  style={{ width: colW }}
                  title={d}
                >
                  {d.slice(8)}
                </div>
              ))}
            </div>
          </div>
          {tasks.map((task) => (
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
  const started = dateKeyFromIso(task.startedAt)
  const completed = dateKeyFromIso(task.completedAt)
  const plannedIdx = planned ? days.indexOf(planned) : -1
  const startIdx = started ? days.indexOf(started) : -1
  let endIdx = completed ? days.indexOf(completed) : -1
  if (startIdx >= 0 && task.status !== 'completed') {
    if (endIdx < 0) endIdx = days.indexOf(today)
    if (endIdx < 0) endIdx = days.length - 1
  }
  if (startIdx >= 0 && endIdx >= 0 && endIdx < startIdx) endIdx = startIdx

  return (
    <div className="gantt-head-row">
      <div className="gantt-label-cell" style={{ width: labelW }}>
        <span className={`dot status-${task.status}`} title={STATUS_LABEL[task.status]} />
        <span className="gantt-title">{task.title}</span>
      </div>
      <div className="gantt-track" style={{ width: days.length * colW, height: 40 }}>
        {plannedIdx >= 0 && (
          <span className="gantt-plan" style={{ left: plannedIdx * colW + colW / 2 - 4 }} title={`规划 ${planned}`} />
        )}
        {startIdx >= 0 && endIdx >= 0 && (
          <span
            className={`gantt-bar ${task.status === 'completed' ? 'done' : 'active'}`}
            style={{
              left: startIdx * colW + 2,
              width: Math.max(colW - 4, (endIdx - startIdx + 1) * colW - 4),
            }}
            title={`${started ?? ''} → ${completed ?? '进行中'}`}
          />
        )}
      </div>
    </div>
  )
}
