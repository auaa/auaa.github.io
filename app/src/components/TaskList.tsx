import { Button, Select, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
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
import { HolderOutlined } from '@ant-design/icons'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import type { Task, TaskStatus } from '../types'
import { STATUS_LABEL } from '../types'
import { PriorityFlame } from './PriorityFlame'

interface ListProps {
  tasks: Task[]
  readOnly?: boolean
  editable?: boolean
  onReorder?: (tasks: Task[]) => void
  onTitleClick?: (task: Task) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
}

function fmtDue(due?: string) {
  if (!due) return '—'
  return due.slice(0, 10)
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef } = useSortable({ id })
  return (
    <Button
      ref={setNodeRef as never}
      type="text"
      size="small"
      icon={<HolderOutlined />}
      aria-label="拖拽排序"
      style={{ cursor: 'grab', color: '#8590a2' }}
      {...attributes}
      {...listeners}
    />
  )
}

function SortableRow({
  id,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { id: string; children?: ReactNode }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: CSSProperties = {
    ...rest.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 1, opacity: 0.88 } : null),
  }
  return (
    <tr {...rest} ref={setNodeRef} style={style}>
      {children}
    </tr>
  )
}

export function TaskList({
  tasks,
  readOnly,
  editable,
  onReorder,
  onTitleClick,
  onStatusChange,
}: ListProps) {
  const canEdit = !!editable && !readOnly
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const columns: ColumnsType<Task> = []

  if (canEdit) {
    columns.push({
      title: '',
      key: 'drag',
      width: 44,
      render: (_, row) => <DragHandle id={row.id} />,
    })
  }

  columns.push(
    {
      title: '进展',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TaskStatus, row) =>
        canEdit ? (
          <Select
            size="small"
            style={{ width: 108 }}
            value={status}
            options={(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            }))}
            onChange={(v) => onStatusChange?.(row.id, v)}
          />
        ) : (
          STATUS_LABEL[status]
        ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 72,
      align: 'center',
      render: (priority?: number) => <PriorityFlame value={priority as 1 | 2 | 3 | undefined} />,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, row) => {
        const text = title || '（无标题）'
        const node = canEdit ? (
          <Typography.Link onClick={() => onTitleClick?.(row)}>{text}</Typography.Link>
        ) : (
          <span>{text}</span>
        )
        return row.detail ? <Tooltip title={row.detail}>{node}</Tooltip> : node
      },
    },
    {
      title: '期望完成日期',
      dataIndex: 'dueAt',
      key: 'dueAt',
      width: 120,
      render: (due?: string) => fmtDue(due),
    },
  )

  const table = (
    <Table<Task>
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={tasks}
      columns={columns}
      locale={{ emptyText: '暂无任务' }}
      components={
        canEdit
          ? {
              body: {
                row: (props: HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string }) => (
                  <SortableRow id={String(props['data-row-key'] ?? '')} {...props} />
                ),
              },
            }
          : undefined
      }
    />
  )

  if (!canEdit) return table

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id || !onReorder) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(tasks, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {table}
      </SortableContext>
    </DndContext>
  )
}
