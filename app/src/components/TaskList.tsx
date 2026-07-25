import {
  DndContext,
  PointerSensor,
  TouchSensor,
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
import type { Task, TaskStatus } from '../types'
import { STATUS_LABEL } from '../types'

const DEFAULT_NEW_TITLE = '新任务'

interface TaskItemProps {
  task: Task
  readOnly?: boolean
  autoFocus?: boolean
  onTitleChange?: (id: string, title: string) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
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
    opacity: isDragging ? 0.85 : 1,
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

function statusTagClass(status: TaskStatus) {
  if (status === 'started') return 'is-primary is-light'
  if (status === 'completed') return 'is-success is-light'
  return 'is-light'
}

function TaskFields({ task, readOnly, autoFocus, onTitleChange, onStatusChange, onDelete }: TaskItemProps) {
  return (
    <div className="task-body">
      <div className="task-main">
        {readOnly ? (
          <span className="is-size-7 has-text-weight-medium">{task.title}</span>
        ) : (
          <input
            className="input is-small"
            value={task.title}
            autoFocus={autoFocus}
            onChange={(e) => onTitleChange?.(task.id, e.target.value)}
            onFocus={() => {
              if (task.title === DEFAULT_NEW_TITLE) onTitleChange?.(task.id, '')
            }}
            placeholder="任务标题"
          />
        )}
        <div className="task-meta">
          {readOnly ? (
            <span className={`tag is-small ${statusTagClass(task.status)}`}>{STATUS_LABEL[task.status]}</span>
          ) : (
            <div className="select is-small">
              <select
                value={task.status}
                onChange={(e) => onStatusChange?.(task.id, e.target.value as TaskStatus)}
              >
                {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!readOnly && (
            <button
              type="button"
              className="delete is-small"
              aria-label="删除"
              onClick={() => onDelete?.(task.id)}
            />
          )}
        </div>
      </div>
      <div className="task-dates">
        {task.plannedAt && <span>规划 {fmtShort(task.plannedAt)}</span>}
        {task.startedAt && <span>开始 {fmtShort(task.startedAt)}</span>}
        {task.completedAt && <span>完成 {fmtShort(task.completedAt)}</span>}
      </div>
    </div>
  )
}

function fmtShort(iso: string) {
  return iso.replace('T', ' ').replace(/\+08:00$/, '').slice(5, 16)
}

interface ListProps {
  tasks: Task[]
  readOnly?: boolean
  focusTaskId?: string | null
  onReorder?: (tasks: Task[]) => void
  onTitleChange?: (id: string, title: string) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
  onDelete?: (id: string) => void
}

export function TaskList({
  tasks,
  readOnly,
  focusTaskId,
  onReorder,
  onTitleChange,
  onStatusChange,
  onDelete,
}: ListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id || !onReorder) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(tasks, oldIndex, newIndex))
  }

  if (!tasks.length) {
    return <p className="has-text-centred has-text-grey is-size-7 py-4">暂无任务</p>
  }

  if (readOnly) {
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
              autoFocus={focusTaskId === t.id}
              onTitleChange={onTitleChange}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

export { DEFAULT_NEW_TITLE }
