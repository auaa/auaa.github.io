import { useEffect, useRef } from 'react'
import { getLayui } from '../lib/layui'
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
  const propsRef = useRef(props)
  propsRef.current = props
  const indexRef = useRef<number | null>(null)

  useEffect(() => {
    if (!props.open) {
      if (indexRef.current != null) {
        void getLayui().then(({ layer }) => {
          if (indexRef.current != null) layer.close(indexRef.current)
          indexRef.current = null
        })
      }
      return
    }

    if (props.mode === 'edit' && !props.task) return

    let cancelled = false

    void getLayui().then(({ layer, form, laydate }) => {
      if (cancelled) return

      const isCreate = props.mode === 'create'
      const task = props.mode === 'edit' ? props.task : null
      const wrap = document.createElement('div')
      wrap.className = 'task-layer-form layui-form'
      wrap.setAttribute('lay-filter', 'task-dialog')
      wrap.innerHTML = isCreate
        ? createFormHtml({
            title: '',
            priority: '',
            detail: '',
            dueAt: '',
          })
        : createFormHtml({
            title: task?.title ?? '',
            priority: task?.priority ? String(task.priority) : '',
            detail: task?.detail ?? '',
            dueAt: toLaydateValue(task?.dueAt),
            editOnly: true,
          })

      const index = layer.open({
        type: 1,
        title: isCreate ? '新建任务' : '编辑任务',
        area: '480px',
        shade: 0.36,
        shadeClose: true,
        resize: false,
        content: wrap,
        btn: ['确定', '取消'],
        btnAlign: 'r',
        success() {
          form.render(undefined, 'task-dialog')
          if (!isCreate) return
          const dueInput = wrap.querySelector<HTMLInputElement>('input[name="dueAt"]')
          if (dueInput) {
            laydate.render({
              elem: dueInput,
              type: 'datetime',
              format: 'yyyy-MM-dd HH:mm',
              theme: '#0c66e4',
            })
          }
        },
        yes(i: number) {
          const draft = readForm(wrap, !isCreate)
          const p = propsRef.current
          if (p.mode === 'create') {
            p.onSubmit({
              title: draft.title,
              priority: draft.priority,
              detail: draft.detail,
              dueAt: draft.dueAt,
            })
          } else {
            p.onSubmit({ title: draft.title, detail: draft.detail })
          }
          layer.close(i)
        },
        btn2(i: number) {
          layer.close(i)
          return false
        },
        end() {
          if (indexRef.current === index) indexRef.current = null
          propsRef.current.onClose()
        },
      })

      indexRef.current = index
    })

    return () => {
      cancelled = true
      const i = indexRef.current
      if (i != null) {
        void getLayui().then(({ layer }) => layer.close(i))
        indexRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.mode, props.mode === 'edit' ? props.task?.id : null])

  return null
}

function createFormHtml(opts: {
  title: string
  priority: string
  detail: string
  dueAt: string
  editOnly?: boolean
}) {
  const priorityBlock = opts.editOnly
    ? ''
    : `
    <div class="layui-form-item">
      <label class="layui-form-label">优先级</label>
      <div class="layui-input-block">
        <select name="priority" lay-filter="task-priority">
          <option value="">不设置</option>
          <option value="1" ${opts.priority === '1' ? 'selected' : ''}>1</option>
          <option value="2" ${opts.priority === '2' ? 'selected' : ''}>2</option>
          <option value="3" ${opts.priority === '3' ? 'selected' : ''}>3</option>
        </select>
      </div>
    </div>
    <div class="layui-form-item">
      <label class="layui-form-label">预期完成</label>
      <div class="layui-input-block">
        <input type="text" class="layui-input" name="dueAt" placeholder="可不填" value="${escapeAttr(opts.dueAt)}" autocomplete="off" />
      </div>
    </div>`

  return `
    <div class="layui-form-item">
      <label class="layui-form-label">标题</label>
      <div class="layui-input-block">
        <input type="text" class="layui-input" name="title" placeholder="可不填" value="${escapeAttr(opts.title)}" autocomplete="off" />
      </div>
    </div>
    ${priorityBlock}
    <div class="layui-form-item layui-form-text">
      <label class="layui-form-label">详情</label>
      <div class="layui-input-block">
        <textarea class="layui-textarea" name="detail" placeholder="可不填">${escapeHtml(opts.detail)}</textarea>
      </div>
    </div>
  `
}

function readForm(root: HTMLElement, editOnly: boolean) {
  const title = root.querySelector<HTMLInputElement>('input[name="title"]')?.value.trim() ?? ''
  const detail = root.querySelector<HTMLTextAreaElement>('textarea[name="detail"]')?.value.trim() || undefined
  if (editOnly) return { title, detail }

  const pRaw = root.querySelector<HTMLSelectElement>('select[name="priority"]')?.value ?? ''
  const priority = pRaw === '1' || pRaw === '2' || pRaw === '3' ? (Number(pRaw) as TaskPriority) : undefined
  const dueRaw = root.querySelector<HTMLInputElement>('input[name="dueAt"]')?.value.trim() || ''
  const dueAt = dueRaw ? dueRaw.replace(' ', 'T') : undefined
  return { title, detail, priority, dueAt }
}

function toLaydateValue(due?: string) {
  if (!due) return ''
  const m = due.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/)
  if (!m) return ''
  return m[2] ? `${m[1]} ${m[2]}` : `${m[1]} 00:00`
}

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
