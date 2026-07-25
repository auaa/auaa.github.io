import { useCallback, useEffect, useRef, useState } from 'react'
import type { GithubClient } from '../lib/github'
import { GithubConflictError } from '../lib/github'
import { nowShanghaiIso, todayYmd } from '../lib/date'
import { newTaskId } from '../lib/id'
import { applyStatusChange, inheritOpenTasks, parseMarkdown, serializeMarkdown } from '../lib/markdown'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { TaskList } from '../components/TaskList'
import type { Task, TaskStatus } from '../types'

interface Props {
  client: GithubClient
  category: string
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function TodayPage({ client, category }: Props) {
  const ymd = todayYmd()
  const [tasks, setTasks] = useState<Task[]>([])
  const [sha, setSha] = useState<string | undefined>()
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMsg, setSaveMsg] = useState('')
  const dirtyRef = useRef(false)
  const tasksRef = useRef(tasks)
  const shaRef = useRef(sha)
  const existsRef = useRef(exists)
  tasksRef.current = tasks
  shaRef.current = sha
  existsRef.current = exists

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const file = await client.getFile(category, ymd)
        if (cancelled) return
        if (file) {
          setTasks(parseMarkdown(file.content))
          setSha(file.sha)
          setExists(true)
        } else {
          const dates = await client.listDateFiles(category)
          const prev = dates.find((d) => d < ymd)
          let next: Task[] = []
          if (prev) {
            const prevFile = await client.getFile(category, prev)
            if (prevFile) next = inheritOpenTasks(parseMarkdown(prevFile.content))
          }
          if (cancelled) return
          setTasks(next)
          setSha(undefined)
          setExists(false)
        }
        setSaveState('idle')
        dirtyRef.current = false
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, category, ymd])

  const save = useCallback(async () => {
    const list = tasksRef.current
    if (!list.length && !existsRef.current) {
      setSaveState('idle')
      dirtyRef.current = false
      return
    }
    setSaveState('saving')
    setSaveMsg('')
    try {
      const md = serializeMarkdown(list, `${ymd} · ${category}`)
      const result = await client.putFile(category, ymd, md, shaRef.current)
      setSha(result.sha)
      setExists(true)
      setSaveState('saved')
      dirtyRef.current = false
      setSaveMsg('已保存')
    } catch (e) {
      setSaveState('error')
      setSaveMsg(e instanceof GithubConflictError ? e.message : e instanceof Error ? e.message : String(e))
    }
  }, [client, category, ymd])

  useDebouncedCallback(
    () => {
      if (dirtyRef.current) void save()
    },
    800,
    [tasks, category],
  )

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  function markDirty(next: Task[]) {
    setTasks(next)
    dirtyRef.current = true
    setSaveState('dirty')
  }

  function addTask() {
    const now = nowShanghaiIso()
    markDirty([...tasks, { id: newTaskId(), title: '新任务', status: 'planned', plannedAt: now }])
  }

  if (loading) return <div className="panel">加载今天…</div>
  if (error) return <div className="panel error">{error}</div>

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>今天</h2>
          <p className="muted">
            {ymd}
            {!exists && tasks.length ? ' · 继承未落盘' : ''}
          </p>
        </div>
        <div className="head-actions">
          <span className={`save-flag save-${saveState}`}>
            {saveState === 'dirty' && '未保存'}
            {saveState === 'saving' && '保存中…'}
            {saveState === 'saved' && (saveMsg || '已保存')}
            {saveState === 'error' && (saveMsg || '保存失败')}
          </span>
          <button type="button" className="btn" onClick={() => void save()}>
            保存
          </button>
          <button type="button" className="btn primary" onClick={addTask}>
            新增
          </button>
        </div>
      </div>
      <TaskList
        tasks={tasks}
        onReorder={markDirty}
        onTitleChange={(id, title) => markDirty(tasks.map((t) => (t.id === id ? { ...t, title } : t)))}
        onStatusChange={(id, status: TaskStatus) =>
          markDirty(tasks.map((t) => (t.id === id ? applyStatusChange(t, status, nowShanghaiIso()) : t)))
        }
        onDelete={(id) => markDirty(tasks.filter((t) => t.id !== id))}
      />
    </div>
  )
}
