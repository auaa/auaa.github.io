import { useEffect, useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getLayui } from '../lib/layui'
import type { Task, TaskPriority, TaskStatus } from '../types'
import { PRIORITY_LABEL, STATUS_LABEL } from '../types'

let formEventsBound = false

interface TaskItemProps {
  task: Task
  readOnly?: boolean
  editable?: boolean
  onTitleClick?: (task: Task) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
  onPriorityChange?: (id: string, priority: TaskPriority | undefined) => void
  onDelete?: (id: string) => void
}

function SortableTaskRow(props: TaskItemProps) {
  const { task, readOnly } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !!readOnly,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="task-row">
      {!readOnly && (
        <button type="button" className="drag-handle" aria-label="拖拽排序" {...attributes} {...listeners}>
          ⋮⋮
        </button>
      )}
      <TaskFields {...props} />
    </li>
  )
}

function TaskFields({
  task,
  readOnly,
  editable,
  onTitleClick,
  onDelete,
}: TaskItemProps) {
  const canEdit = editable && !readOnly

  return (
    <div className="task-body">
      <div className="task-main">
        {canEdit ? (
          <div className="task-select task-status-select">
            <select
              name="status"
              lay-filter="task-status"
              data-task-id={task.id}
              defaultValue={task.status}
              aria-label="进展"
            >
              {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className={`status-tag status-${task.status}`}>{STATUS_LABEL[task.status]}</span>
        )}

        {canEdit ? (
          <div className="task-select task-priority-select">
            <select
              name="priority"
              lay-filter="task-priority"
              data-task-id={task.id}
              defaultValue={task.priority ?? ''}
              aria-label="优先级"
            >
              <option value="">—</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        ) : (
          <span className={`priority-tag${task.priority ? ` p${task.priority}` : ''}`}>
            {task.priority ? PRIORITY_LABEL[task.priority] : '—'}
          </span>
        )}

        {canEdit ? (
          <button
            type="button"
            className="task-title-btn"
            onClick={() => onTitleClick?.(task)}
            title={task.detail || undefined}
          >
            {task.title || '（无标题）'}
          </button>
        ) : (
          <span className="task-title-text" title={task.detail || undefined}>
            {task.title || '（无标题）'}
          </span>
        )}

        <span className="task-due">{fmtDue(task.dueAt)}</span>

        {canEdit && (
          <button
            type="button"
            className="layui-btn layui-btn-primary layui-btn-xs task-del-btn"
            aria-label="删除"
            onClick={() => onDelete?.(task.id)}
          >
            删除
          </button>
        )}
      </div>
    </div>
  )
}

function fmtDue(due?: string) {
  if (!due) return '—'
  return due.replace('T', ' ').slice(0, 16)
}

interface ListProps {
  tasks: Task[]
  readOnly?: boolean
  editable?: boolean
  onReorder?: (tasks: Task[]) => void
  onTitleClick?: (task: Task) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
  onPriorityChange?: (id: string, priority: TaskPriority | undefined) => void
  onDelete?: (id: string) => void
}

export function TaskList({
  tasks,
  readOnly,
  editable,
  onReorder,
  onTitleClick,
  onStatusChange,
  onPriorityChange,
  onDelete,
}: ListProps) {
  const formRef = useRef<HTMLDivElement | null>(null)
  const statusCb = useRef(onStatusChange)
  const priorityCb = useRef(onPriorityChange)
  statusCb.current = onStatusChange
  priorityCb.current = onPriorityChange
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (readOnly || !editable) return
    let cancelled = false
    void getLayui().then(({ form }) => {
      if (cancelled) return
      if (!formEventsBound) {
        formEventsBound = true
        form.on('select(task-status)', (data) => {
          const id = data.elem.getAttribute('data-task-id')
          if (id) statusCb.current?.(id, data.value as TaskStatus)
        })
        form.on('select(task-priority)', (data) => {
          const id = data.elem.getAttribute('data-task-id')
          if (!id) return
          const v = data.value
          priorityCb.current?.(id, v ? (Number(v) as TaskPriority) : undefined)
        })
      }
      form.render('select')
    })
    return () => {
      cancelled = true
    }
  }, [tasks, readOnly, editable])

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id || !onReorder) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(tasks, oldIndex, newIndex))
  }

  if (!tasks.length) {
    return <p className="empty-state">暂无任务</p>
  }

  if (readOnly || !editable) {
    return (
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id} className="task-row">
            <TaskFields task={t} readOnly />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="layui-form" ref={formRef} lay-filter="task-list">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="task-list">
            {tasks.map((t) => (
              <SortableTaskRow
                key={`${t.id}-${t.status}-${t.priority ?? ''}`}
                task={t}
                editable
                onTitleClick={onTitleClick}
                onStatusChange={onStatusChange}
                onPriorityChange={onPriorityChange}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
