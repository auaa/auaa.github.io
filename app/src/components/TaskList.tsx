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

interface TaskItemProps {
  task: Task
  readOnly?: boolean
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

function TaskFields({ task, readOnly, onTitleChange, onStatusChange, onDelete }: TaskItemProps) {
  return (
    <div className="task-body">
      {readOnly ? (
        <div className="task-title-ro">{task.title}</div>
      ) : (
        <input
          className="task-title"
          value={task.title}
          onChange={(e) => onTitleChange?.(task.id, e.target.value)}
          placeholder="任务标题"
        />
      )}
      <div className="task-meta">
        {readOnly ? (
          <span className={`status-pill status-${task.status}`}>{STATUS_LABEL[task.status]}</span>
        ) : (
          <select
            className="status-select"
            value={task.status}
            onChange={(e) => onStatusChange?.(task.id, e.target.value as TaskStatus)}
          >
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        )}
        {!readOnly && (
          <button type="button" className="btn-danger" onClick={() => onDelete?.(task.id)}>
            删除
          </button>
        )}
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
  return iso.replace('T', ' ').replace(/\+08:00$/, '').slice(0, 16)
}

interface ListProps {
  tasks: Task[]
  readOnly?: boolean
  onReorder?: (tasks: Task[]) => void
  onTitleChange?: (id: string, title: string) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
  onDelete?: (id: string) => void
}

export function TaskList({
  tasks,
  readOnly,
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
    return <div className="empty">暂无任务</div>
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
