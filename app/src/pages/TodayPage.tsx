import { useCallback, useEffect, useRef, useState } from 'react'
import { message, Spin } from 'antd'
import type { GithubClient } from '../lib/github'
import { GithubConflictError } from '../lib/github'
import { nowShanghaiIso, todayYmd } from '../lib/date'
import { newTaskId } from '../lib/id'
import {
  applyStatusChange,
  assertTeamStatusChange,
  inheritOpenTasks,
  parseMarkdown,
  serializeMarkdown,
} from '../lib/markdown'
import {
  isTeamCategory,
  PERSONAL_CATEGORY,
  TEAM_CATEGORY,
  teamStatusRequiresAssignee,
} from '../lib/taskModel'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { TaskList } from '../components/TaskList'
import { TaskDialog } from '../components/TaskDialog'
import { TransferDialog } from '../components/TransferDialog'
import type { Task, TaskDraft, TaskStatus } from '../types'

interface Props {
  client: GithubClient
  category: string
  pendingCreate?: TaskDraft | null
  onPendingCreateHandled?: () => void
  onSaved?: () => void
}

function draftToTask(draft: TaskDraft, category: string): Task {
  const task: Task = {
    id: newTaskId(),
    title: draft.title.trim(),
    status: 'planned',
    plannedAt: nowShanghaiIso(),
    priority: draft.priority ?? 3,
    detail: draft.detail?.trim() || undefined,
    dueAt: draft.dueAt || undefined,
  }
  if (isTeamCategory(category) && draft.assignee) {
    task.assignee = draft.assignee
  }
  return task
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
  const [transferTask, setTransferTask] = useState<Task | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [reclaiming, setReclaiming] = useState(false)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const tasksRef = useRef(tasks)
  const shaRef = useRef(sha)
  const existsRef = useRef(exists)
  /** 当前列表已成功加载到的分类+日期，避免跨分类新建时把旧列表写进新分类 */
  const loadedKeyRef = useRef('')
  tasksRef.current = tasks
  shaRef.current = sha
  existsRef.current = exists

  useEffect(() => {
    let cancelled = false
    const loadKey = `${category}:${ymd}`
    loadedKeyRef.current = ''
    dirtyRef.current = false
    setLoading(true)
    setError(null)
    setTasks([])
    setSha(undefined)
    setExists(false)
    ;(async () => {
      try {
        const file = await client.getFile(category, ymd)
        if (cancelled) return
        if (file) {
          setTasks(parseMarkdown(file.content, category))
          setSha(file.sha)
          setExists(true)
        } else {
          const dates = await client.listDateFiles(category)
          const prev = dates.find((d) => d < ymd)
          let next: Task[] = []
          if (prev) {
            const prevFile = await client.getFile(category, prev)
            if (prevFile) next = inheritOpenTasks(parseMarkdown(prevFile.content, category), category)
          }
          if (cancelled) return
          setTasks(next)
          setSha(undefined)
          setExists(false)
        }
        loadedKeyRef.current = loadKey
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
            setTasks(parseMarkdown(file.content, category))
            setSha(file.sha)
            setExists(true)
          } else if (existsRef.current) {
            setTasks([])
            setSha(undefined)
            setExists(false)
          }
        } catch {
          /* ignore */
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
    // 必须等当前分类今日列表加载完成，否则会把上一分类的 tasks 误写入
    if (loadedKeyRef.current !== `${category}:${ymd}`) return
    markDirty([...tasksRef.current, draftToTask(pendingCreate, category)])
    onPendingCreateHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCreate, loading, category, ymd])

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

  async function confirmTransfer(assignee: string) {
    const source = transferTask
    if (!source || transferring) return
    if (source.status === 'completed' || source.status === 'transferred') {
      messageApi.open({ type: 'warning', content: '已完成或已转处理的任务不能转处理', duration: 3 })
      setTransferTask(null)
      return
    }
    setTransferring(true)
    messageApi.open({ key: 'transfer', type: 'loading', content: '转处理中…', duration: 0 })
    try {
      const teamFile = await client.getFile(TEAM_CATEGORY, ymd)
      let teamTasks = teamFile ? parseMarkdown(teamFile.content, TEAM_CATEGORY) : []
      let teamSha = teamFile?.sha
      if (!teamFile) {
        const dates = await client.listDateFiles(TEAM_CATEGORY)
        const prev = dates.find((d) => d < ymd)
        if (prev) {
          const prevFile = await client.getFile(TEAM_CATEGORY, prev)
          if (prevFile) {
            teamTasks = inheritOpenTasks(parseMarkdown(prevFile.content, TEAM_CATEGORY), TEAM_CATEGORY)
          }
        }
      }

      const now = nowShanghaiIso()
      // 同 id 关联：团队任务 id = 个人任务 id
      const teamTask: Task = {
        id: source.id,
        title: source.title,
        status: 'assigned',
        plannedAt: source.plannedAt || now,
        assignedAt: now,
        priority: source.priority ?? 3,
        detail: source.detail,
        dueAt: source.dueAt,
        assignee,
      }
      const existingIdx = teamTasks.findIndex((t) => t.id === source.id)
      if (existingIdx >= 0) teamTasks[existingIdx] = teamTask
      else teamTasks = [...teamTasks, teamTask]

      const teamMd = serializeMarkdown(teamTasks, `${ymd} · ${TEAM_CATEGORY}`)
      await client.putFile(TEAM_CATEGORY, ymd, teamMd, teamSha)
      await client.syncMonthDay(TEAM_CATEGORY, ymd, teamTasks)

      const nextPersonal = tasksRef.current.map((t) => {
        if (t.id !== source.id) return t
        let next = applyStatusChange(t, 'transferred', now)
        next = { ...next, assignee }
        return next
      })
      markDirty(nextPersonal)
      setTransferTask(null)
      messageApi.open({ key: 'transfer', type: 'success', content: '已转处理', duration: 3 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      messageApi.open({ key: 'transfer', type: 'error', content: msg, duration: 6 })
    } finally {
      setTransferring(false)
    }
  }

  async function confirmReclaim(source: Task) {
    if (reclaiming || transferring) return
    setReclaiming(true)
    messageApi.open({ key: 'reclaim', type: 'loading', content: '收回中…', duration: 0 })
    try {
      const now = nowShanghaiIso()
      let teamUpdated = false
      let teamMissing = true

      const teamFile = await client.getFile(TEAM_CATEGORY, ymd)
      if (teamFile) {
        const teamTasks = parseMarkdown(teamFile.content, TEAM_CATEGORY)
        const idx = teamTasks.findIndex((t) => t.id === source.id)
        if (idx >= 0) {
          if (teamTasks[idx].status === 'accepted') {
            messageApi.open({
              key: 'reclaim',
              type: 'warning',
              content: '团队任务已验收，不能收回',
              duration: 4,
            })
            return
          }
          teamTasks[idx] = applyStatusChange(teamTasks[idx], 'cancelled', now)
          const teamMd = serializeMarkdown(teamTasks, `${ymd} · ${TEAM_CATEGORY}`)
          await client.putFile(TEAM_CATEGORY, ymd, teamMd, teamFile.sha)
          await client.syncMonthDay(TEAM_CATEGORY, ymd, teamTasks)
          teamUpdated = true
          teamMissing = false
        }
      }

      const nextPersonal = tasksRef.current.map((t) => {
        if (t.id !== source.id) return t
        let next = applyStatusChange(t, 'planned', now)
        delete next.assignee
        delete next.completedAt
        return next
      })
      markDirty(nextPersonal)

      if (teamMissing && !teamUpdated) {
        messageApi.open({
          key: 'reclaim',
          type: 'warning',
          content: '已收回；未找到对应团队任务',
          duration: 5,
        })
      } else {
        messageApi.open({ key: 'reclaim', type: 'success', content: '已收回', duration: 3 })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      messageApi.open({ key: 'reclaim', type: 'error', content: msg, duration: 6 })
    } finally {
      setReclaiming(false)
    }
  }

  async function confirmTakeToSelf(source: Task) {
    if (reclaiming || transferring) return
    setReclaiming(true)
    messageApi.open({ key: 'takeToSelf', type: 'loading', content: '转给我…', duration: 0 })
    try {
      const now = nowShanghaiIso()

      // 1) 团队标已取消
      const teamNext = tasksRef.current.map((t) =>
        t.id === source.id ? applyStatusChange(t, 'cancelled', now) : t,
      )
      const teamMd = serializeMarkdown(teamNext, `${ymd} · ${category}`)
      const teamPut = await client.putFile(category, ymd, teamMd, shaRef.current)
      setSha(teamPut.sha)
      setExists(true)
      await client.syncMonthDay(category, ymd, teamNext)
      setTasks(teamNext)
      dirtyRef.current = false

      // 2) 每日待办：同 id 规划中
      const personalFile = await client.getFile(PERSONAL_CATEGORY, ymd)
      let personalTasks = personalFile ? parseMarkdown(personalFile.content, PERSONAL_CATEGORY) : []
      let personalSha = personalFile?.sha
      if (!personalFile) {
        const dates = await client.listDateFiles(PERSONAL_CATEGORY)
        const prev = dates.find((d) => d < ymd)
        if (prev) {
          const prevFile = await client.getFile(PERSONAL_CATEGORY, prev)
          if (prevFile) {
            personalTasks = inheritOpenTasks(
              parseMarkdown(prevFile.content, PERSONAL_CATEGORY),
              PERSONAL_CATEGORY,
            )
          }
        }
      }

      const personalTask: Task = {
        id: source.id,
        title: source.title,
        status: 'planned',
        plannedAt: source.plannedAt || now,
        priority: source.priority ?? 3,
        detail: source.detail,
        dueAt: source.dueAt,
      }
      const pIdx = personalTasks.findIndex((t) => t.id === source.id)
      if (pIdx >= 0) {
        personalTasks[pIdx] = personalTask
      } else {
        personalTasks = [...personalTasks, personalTask]
      }
      const personalMd = serializeMarkdown(personalTasks, `${ymd} · ${PERSONAL_CATEGORY}`)
      await client.putFile(PERSONAL_CATEGORY, ymd, personalMd, personalSha)
      await client.syncMonthDay(PERSONAL_CATEGORY, ymd, personalTasks)

      messageApi.open({ key: 'takeToSelf', type: 'success', content: '已转到每日待办', duration: 3 })
      onSaved?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      messageApi.open({ key: 'takeToSelf', type: 'error', content: msg, duration: 6 })
    } finally {
      setReclaiming(false)
    }
  }

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
        category={category}
        editable
        onReorder={markDirty}
        onTitleClick={(t) => setEditTask(t)}
        onTransfer={isTeamCategory(category) ? undefined : (t) => setTransferTask(t)}
        onReclaim={isTeamCategory(category) ? undefined : (t) => void confirmReclaim(t)}
        onTakeToSelf={isTeamCategory(category) ? (t) => void confirmTakeToSelf(t) : undefined}
        onAssigneeChange={
          isTeamCategory(category)
            ? (id, assignee) => {
                const row = tasks.find((t) => t.id === id)
                if (!row) return
                if (!assignee && teamStatusRequiresAssignee(row.status)) {
                  messageApi.open({ type: 'warning', content: '已下发及之后不能清空责任人', duration: 3 })
                  return
                }
                markDirty(
                  tasks.map((t) => {
                    if (t.id !== id) return t
                    const next = { ...t }
                    if (assignee) next.assignee = assignee
                    else delete next.assignee
                    return next
                  }),
                )
              }
            : undefined
        }
        onStatusChange={(id, status: TaskStatus) => {
          const row = tasks.find((t) => t.id === id)
          if (!row || row.status === 'transferred' || row.status === 'cancelled') return
          if (isTeamCategory(category)) {
            const err = assertTeamStatusChange({ ...row, assignee: row.assignee }, status)
            if (err) {
              messageApi.open({ type: 'warning', content: err, duration: 3 })
              return
            }
          }
          markDirty(
            tasks.map((t) => (t.id === id ? applyStatusChange(t, status, nowShanghaiIso()) : t)),
          )
        }}
      />

      <TaskDialog
        mode="edit"
        open={!!editTask}
        task={editTask}
        category={category}
        readOnly={editTask?.status === 'transferred' || editTask?.status === 'cancelled'}
        onClose={() => setEditTask(null)}
        onSubmit={({ title, detail, priority, status, assignee }) => {
          if (!editTask || editTask.status === 'transferred' || editTask.status === 'cancelled') return
          const id = editTask.id
          markDirty(
            tasksRef.current.map((t) => {
              if (t.id !== id) return t
              let next: Task = { ...t, title, priority }
              if (detail) next.detail = detail
              else delete next.detail
              if (isTeamCategory(category)) {
                if (assignee) next.assignee = assignee
                else delete next.assignee
              }
              if (status) {
                if (isTeamCategory(category)) {
                  const err = assertTeamStatusChange(next, status)
                  if (err) {
                    messageApi.open({ type: 'warning', content: err, duration: 3 })
                    return t
                  }
                }
                next = applyStatusChange(next, status, nowShanghaiIso())
              }
              return next
            }),
          )
        }}
      />

      <TransferDialog
        open={!!transferTask}
        taskTitle={transferTask?.title}
        onClose={() => setTransferTask(null)}
        onConfirm={(assignee) => void confirmTransfer(assignee)}
      />
    </div>
  )
}
