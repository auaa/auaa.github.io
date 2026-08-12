import { useCallback, useEffect, useRef, useState } from 'react'
import { message, Spin } from 'antd'
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
  /** 今日 md（及月归档）保存成功后回调，用于刷新侧栏全分类统计 */
  onSaved?: () => void
}

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

export function TodayPage({
  client,
  category,
  pendingCreate,
  onPendingCreateHandled,
  onSaved,
}: Props) {
  const ymd = todayYmd()
  const [messageApi, contextHolder] = message.useMessage()
  const [tasks, setTasks] = useState<Task[]>([])
  const [sha, setSha] = useState<string | undefined>()
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
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
      dirtyRef.current = false
      return
    }
    if (savingRef.current) return
    savingRef.current = true
    messageApi.open({ key: 'today-save', type: 'loading', content: '保存中…', duration: 0 })
    const md = serializeMarkdown(list, `${ymd} · ${category}`)
    try {
      const result = await client.putFile(category, ymd, md, shaRef.current)
      setSha(result.sha)
      setExists(true)
      await client.syncMonthDay(category, ymd, list)
      dirtyRef.current = false
      messageApi.destroy('today-inherit')
      messageApi.open({ key: 'today-save', type: 'success', content: '已保存', duration: 3 })
      onSaved?.()
    } catch (e) {
      const msg =
        e instanceof GithubConflictError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e)
      messageApi.open({ key: 'today-save', type: 'error', content: msg, duration: 6 })
    } finally {
      savingRef.current = false
    }
  }, [client, category, ymd, messageApi, onSaved])

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

  // 窗口重新可见且无未保存改动时，静默同步远程 md，避免一直握着旧 sha
  useEffect(() => {
    const syncIfIdle = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      if (dirtyRef.current || savingRef.current) return
      void (async () => {
        try {
          const file = await client.getFile(category, ymd)
          if (dirtyRef.current || savingRef.current) return
          if (file) {
            if (file.sha === shaRef.current) return
            setTasks(parseMarkdown(file.content))
            setSha(file.sha)
            setExists(true)
          } else if (existsRef.current) {
            setTasks([])
            setSha(undefined)
            setExists(false)
          }
        } catch {
          /* ignore background sync errors */
        }
      })()
    }
    document.addEventListener('visibilitychange', syncIfIdle)
    window.addEventListener('focus', syncIfIdle)
    return () => {
      document.removeEventListener('visibilitychange', syncIfIdle)
      window.removeEventListener('focus', syncIfIdle)
    }
  }, [client, category, ymd])

  function markDirty(next: Task[]) {
    setTasks(next)
    dirtyRef.current = true
  }

  useEffect(() => {
    if (!pendingCreate || loading) return
    if (pendingCreate.category && pendingCreate.category !== category) return
    markDirty([...tasksRef.current, draftToTask(pendingCreate)])
    onPendingCreateHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCreate, loading, category])

  useEffect(() => {
    if (loading) return
    if (!exists && tasks.length) {
      messageApi.open({
        key: 'today-inherit',
        type: 'info',
        content: '继承未落盘',
        duration: 0,
      })
    } else {
      messageApi.destroy('today-inherit')
    }
  }, [loading, exists, tasks.length, messageApi])

  if (loading) {
    return (
      <div className="panel panel-loading">
        {contextHolder}
        <Spin size="large" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        {contextHolder}
        <div className="alert alert-danger">{error}</div>
      </>
    )
  }

  return (
    <div className="panel">
      {contextHolder}

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
        onSubmit={({ title, detail, priority, status }) => {
          if (!editTask) return
          const id = editTask.id
          markDirty(
            tasksRef.current.map((t) => {
              if (t.id !== id) return t
              let next: Task = { ...t, title, priority }
              if (detail) next.detail = detail
              else delete next.detail
              if (status) next = applyStatusChange(next, status, nowShanghaiIso())
              return next
            }),
          )
        }}
      />
    </div>
  )
}
