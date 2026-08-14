import { Button, Popconfirm, Select, Table, Tag, Tooltip, Typography } from 'antd'
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
import { addDaysYmd, todayYmd } from '../lib/date'
import {
  canTakeToSelf,
  canTransferOut,
  isTeamCategory,
  statusTagColor,
  statusesForCategory,
  teamStatusRequiresAssignee,
  TEAM_ASSIGNEES,
} from '../lib/taskModel'
import { PriorityFlame } from './PriorityFlame'

interface ListProps {
  tasks: Task[]
  category?: string
  readOnly?: boolean
  editable?: boolean
  /** 个人今日：行内转处理 */
  onTransfer?: (task: Task) => void
  /** 个人今日：已转处理行内收回 */
  onReclaim?: (task: Task) => void
  /** 团队今日：转给我自己 */
  onTakeToSelf?: (task: Task) => void
  /** 团队：改责任人 */
  onAssigneeChange?: (id: string, assignee: string | undefined) => void
  onReorder?: (tasks: Task[]) => void
  onTitleClick?: (task: Task) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
}

function fmtDue(due?: string) {
  if (!due) return '—'
  return due.slice(0, 10)
}

function dueTone(due: string | undefined, status: TaskStatus): 'danger' | 'warn' | null {
  if (
    !due ||
    status === 'completed' ||
    status === 'accepted' ||
    status === 'transferred' ||
    status === 'cancelled'
  ) {
    return null
  }
  const ymd = due.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const today = todayYmd()
  if (ymd <= today) return 'danger'
  if (ymd <= addDaysYmd(today, 2)) return 'warn'
  return null
}

function DragHandle({ id, disabled }: { id: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef } = useSortable({ id, disabled })
  return (
    <Button
      ref={setNodeRef as never}
      type="text"
      size="small"
      icon={<HolderOutlined />}
      aria-label="拖拽排序"
      disabled={disabled}
      style={{ cursor: disabled ? 'not-allowed' : 'grab', color: '#8590a2' }}
      {...(disabled ? {} : { ...attributes, ...listeners })}
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

function rowEditable(task: Task, canEdit: boolean): boolean {
  return canEdit && task.status !== 'transferred' && task.status !== 'cancelled'
}

export function TaskList({
  tasks,
  category = '',
  readOnly,
  editable,
  onTransfer,
  onReclaim,
  onTakeToSelf,
  onAssigneeChange,
  onReorder,
  onTitleClick,
  onStatusChange,
}: ListProps) {
  const canEdit = !!editable && !readOnly
  const team = isTeamCategory(category)
  const personal = !team && !!category
  const statusOptions = statusesForCategory(category || '每日待办')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const columns: ColumnsType<Task> = []

  if (canEdit) {
    columns.push({
      title: '',
      key: 'drag',
      width: 44,
      render: (_, row) => <DragHandle id={row.id} disabled={!rowEditable(row, canEdit)} />,
    })
  }

  columns.push({
    title: '进展',
    dataIndex: 'status',
    key: 'status',
    width: team ? 120 : 128,
      render: (status: TaskStatus, row) => {
      if (status === 'transferred') {
        return <Tag color={statusTagColor(status)}>{STATUS_LABEL.transferred}</Tag>
      }
      if (status === 'cancelled') {
        return <Tag color={statusTagColor(status)}>{STATUS_LABEL.cancelled}</Tag>
      }
      if (rowEditable(row, canEdit)) {
        return (
          <Select
            size="small"
            style={{ width: team ? 108 : 108 }}
            value={status}
            options={statusOptions.map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            }))}
            onChange={(v) => onStatusChange?.(row.id, v)}
          />
        )
      }
      return <Tag color={statusTagColor(status)}>{STATUS_LABEL[status] ?? status}</Tag>
    },
  })

  if (team) {
    columns.push({
      title: '责任人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
      render: (assignee: string | undefined, row) => {
        if (!rowEditable(row, canEdit)) {
          return <span>{assignee || '—'}</span>
        }
        const required = teamStatusRequiresAssignee(row.status)
        return (
          <Select
            size="small"
            allowClear={!required}
            placeholder={required ? '必填' : '选填'}
            style={{ width: 88 }}
            value={assignee}
            options={TEAM_ASSIGNEES.map((n) => ({ value: n, label: n }))}
            onChange={(v) => onAssigneeChange?.(row.id, v)}
          />
        )
      },
    })
  }

  columns.push(
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
      ellipsis: { showTitle: false },
      render: (title: string, row) => {
        const text = title || '（无标题）'
        const editableRow = rowEditable(row, canEdit)
        const titleNode = editableRow ? (
          <Typography.Link onClick={() => onTitleClick?.(row)}>{text}</Typography.Link>
        ) : (
          <span>{text}</span>
        )
        const wrapped = row.detail ? <Tooltip title={row.detail}>{titleNode}</Tooltip> : titleNode
        if (row.status === 'transferred' && row.assignee) {
          return (
            <span className="task-title-with-assignee">
              {wrapped}
              <span className="task-assignee-tag">{row.assignee}</span>
            </span>
          )
        }
        return wrapped
      },
    },
    {
      title: '期望完成日期',
      dataIndex: 'dueAt',
      key: 'dueAt',
      width: 120,
      render: (due: string | undefined, row) => {
        const text = fmtDue(due)
        const tone = dueTone(due, row.status)
        if (!tone) return text
        return <span className={tone === 'danger' ? 'due-danger' : 'due-warn'}>{text}</span>
      },
    },
  )

  if (personal && canEdit && (onTransfer || onReclaim)) {
    columns.push({
      title: '',
      key: 'transfer',
      width: 88,
      render: (_, row) => {
        if (row.status === 'transferred') {
          return onReclaim ? (
            <Popconfirm
              title="收回自己处理？"
              description="将恢复为规划中，对应团队任务标为已取消。"
              okText="确定"
              cancelText="取消"
              placement="topRight"
              getPopupContainer={() => document.body}
              mouseLeaveDelay={0.4}
              okButtonProps={{ size: 'small', style: { minWidth: 52 } }}
              cancelButtonProps={{ size: 'small', style: { minWidth: 52 } }}
              onConfirm={() => onReclaim(row)}
            >
              <Button type="link" size="small">
                收回
              </Button>
            </Popconfirm>
          ) : null
        }
        return onTransfer && canTransferOut(row.status) ? (
          <Button type="link" size="small" onClick={() => onTransfer(row)}>
            转处理
          </Button>
        ) : null
      },
    })
  }

  if (team && canEdit && onTakeToSelf) {
    columns.push({
      title: '',
      key: 'takeToSelf',
      width: 96,
      render: (_, row) =>
        canTakeToSelf(row.status) ? (
          <Popconfirm
            title="转给我自己处理？"
            description="团队任务将标为已取消，并在每日待办新建规划中任务。"
            okText="确定"
            cancelText="取消"
            placement="topRight"
            getPopupContainer={() => document.body}
            mouseLeaveDelay={0.4}
            okButtonProps={{ size: 'small', style: { minWidth: 52 } }}
            cancelButtonProps={{ size: 'small', style: { minWidth: 52 } }}
            onConfirm={() => onTakeToSelf(row)}
          >
            <Button type="link" size="small">
              转给我
            </Button>
          </Popconfirm>
        ) : null,
    })
  }

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
    const activeTask = tasks[oldIndex]
    if (activeTask?.status === 'transferred') return
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
