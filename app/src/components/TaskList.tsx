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
import type { Task, TaskPriority, TaskStatus } from '../types'
import { PRIORITY_LABEL, STATUS_LABEL } from '../types'

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
  onStatusChange,
  onPriorityChange,
  onDelete,
}: TaskItemProps) {
  const canEdit = editable && !readOnly

  return (
    <div className="task-body">
      <div className="task-main">
        {canEdit ? (
          <select
            className="field-select task-status-select"
            value={task.status}
            aria-label="进展"
            onChange={(e) => onStatusChange?.(task.id, e.target.value as TaskStatus)}
          >
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        ) : (
          <span className={`status-tag status-${task.status}`}>{STATUS_LABEL[task.status]}</span>
        )}

        {canEdit ? (
          <select
            className="field-select task-priority-select"
            value={task.priority ?? ''}
            aria-label="优先级"
            onChange={(e) => {
              const v = e.target.value
              onPriorityChange?.(task.id, v ? (Number(v) as TaskPriority) : undefined)
            }}
          >
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
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
          <button type="button" className="icon-btn" aria-label="删除" onClick={() => onDelete?.(task.id)}>
            ×
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
  /** 今日可编辑列布局 */
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="task-list">
          {tasks.map((t) => (
            <SortableTaskRow
              key={t.id}
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
  )
}
