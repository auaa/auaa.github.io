import { useCallback, useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'
import type { GithubClient } from '../lib/github'
import { GithubConflictError } from '../lib/github'
import { nowShanghaiIso, todayYmd } from '../lib/date'
import { newTaskId } from '../lib/id'
import { applyStatusChange, inheritOpenTasks, parseMarkdown, serializeMarkdown } from '../lib/markdown'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { TaskList } from '../components/TaskList'
import { TaskDialog } from '../components/TaskDialog'
import type { Task, TaskDraft, TaskStatus } from '../types'

interface Props {
  client: GithubClient
  category: string
  pendingCreate?: TaskDraft | null
  onPendingCreateHandled?: () => void
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

function draftToTask(draft: TaskDraft): Task {
  return {
    id: newTaskId(),
    title: draft.title.trim(),
    status: 'planned',
    plannedAt: nowShanghaiIso(),
    priority: draft.priority ?? 3,
    detail: draft.detail?.trim() || undefined,
    dueAt: draft.dueAt || undefined,
  }
}

export function TodayPage({ client, category, pendingCreate, onPendingCreateHandled }: Props) {
  const ymd = todayYmd()
  const [tasks, setTasks] = useState<Task[]>([])
  const [sha, setSha] = useState<string | undefined>()
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMsg, setSaveMsg] = useState('')
  const [editTask, setEditTask] = useState<Task | null>(null)
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
      await client.syncMonthDay(category, ymd, list)
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

  useEffect(() => {
    if (!pendingCreate || loading) return
    markDirty([...tasksRef.current, draftToTask(pendingCreate)])
    onPendingCreateHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCreate, loading])

  useEffect(() => {
    if (saveState !== 'saved') return
    const timer = window.setTimeout(() => {
      setSaveState('idle')
      setSaveMsg('')
    }, 10_000)
    return () => window.clearTimeout(timer)
  }, [saveState])

  if (loading) {
    return (
      <div className="panel panel-loading">
        <Spin size="large" />
      </div>
    )
  }
  if (error) return <div className="alert alert-danger">{error}</div>

  const inheritHint = !exists && tasks.length ? '继承未落盘' : ''
  const saveLabel =
    saveState === 'dirty'
      ? '未保存'
      : saveState === 'saving'
        ? '保存中…'
        : saveState === 'saved'
          ? saveMsg || '已保存'
          : saveState === 'error'
            ? saveMsg || '保存失败'
            : ''

  return (
    <div className="panel today-panel">
      {inheritHint && <div className="today-float-hint">{inheritHint}</div>}
      {saveState !== 'idle' && saveLabel && (
        <div className={`today-save-float save-${saveState}`} role="status" aria-live="polite">
          {saveLabel}
        </div>
      )}

      <TaskList
        tasks={tasks}
        editable
        onReorder={markDirty}
        onTitleClick={(t) => setEditTask(t)}
        onStatusChange={(id, status: TaskStatus) =>
          markDirty(tasks.map((t) => (t.id === id ? applyStatusChange(t, status, nowShanghaiIso()) : t)))
        }
      />

      <TaskDialog
        mode="edit"
        open={!!editTask}
        task={editTask}
        onClose={() => setEditTask(null)}
        onSubmit={({ title, detail, priority }) => {
          if (!editTask) return
          const id = editTask.id
          markDirty(
            tasksRef.current.map((t) => {
              if (t.id !== id) return t
              const next = { ...t, title, priority }
              if (detail) next.detail = detail
              else delete next.detail
              return next
            }),
          )
        }}
      />
    </div>
  )
}
