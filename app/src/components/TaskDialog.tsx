import { useEffect, useId, useState, type FormEvent } from 'react'
import type { Task, TaskDraft, TaskPriority } from '../types'

export type TaskDialogMode = 'create' | 'edit'

interface CreateProps {
  mode: 'create'
  open: boolean
  onClose: () => void
  onSubmit: (draft: TaskDraft) => void
}

interface EditProps {
  mode: 'edit'
  open: boolean
  task: Task | null
  onClose: () => void
  onSubmit: (patch: { title: string; detail?: string }) => void
}

type Props = CreateProps | EditProps

export function TaskDialog(props: Props) {
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'' | TaskPriority>('')
  const [detail, setDetail] = useState('')
  const [dueAt, setDueAt] = useState('')

  useEffect(() => {
    if (!props.open) return
    if (props.mode === 'edit' && props.task) {
      setTitle(props.task.title)
      setDetail(props.task.detail ?? '')
      setPriority(props.task.priority ?? '')
      setDueAt(toDatetimeLocal(props.task.dueAt))
    } else if (props.mode === 'create') {
      setTitle('')
      setPriority('')
      setDetail('')
      setDueAt('')
    }
  }, [props])

  if (!props.open) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const d = detail.trim()
    if (props.mode === 'create') {
      props.onSubmit({
        title: t,
        priority: priority || undefined,
        detail: d || undefined,
        dueAt: dueAt || undefined,
      })
    } else {
      props.onSubmit({ title: t, detail: d || undefined })
    }
    props.onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="modal-title">
          {props.mode === 'create' ? '新建任务' : '编辑任务'}
        </h2>
        <form onSubmit={submit}>
          <label className="field-label">
            标题
            <input
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="可不填"
              autoFocus
            />
          </label>

          {props.mode === 'create' && (
            <>
              <label className="field-label">
                优先级
                <select
                  className="field-select"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value ? (Number(e.target.value) as TaskPriority) : '')
                  }
                >
                  <option value="">不设置</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
              <label className="field-label">
                预期完成时间
                <input
                  className="field-input"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="field-label">
            详情
            <textarea
              className="field-textarea"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="可不填"
              rows={4}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={props.onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function toDatetimeLocal(due?: string) {
  if (!due) return ''
  // already YYYY-MM-DDTHH:mm or with seconds/tz
  const m = due.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/)
  if (!m) return ''
  return m[2] ? `${m[1]}T${m[2]}` : `${m[1]}T00:00`
}
