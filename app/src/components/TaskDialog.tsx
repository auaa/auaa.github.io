import { useEffect } from 'react'
import { Button, DatePicker, Form, Input, Modal, Radio, Space, Tooltip } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { Task, TaskDraft, TaskPriority, TaskStatus } from '../types'
import { STATUS_LABEL } from '../types'
import {
  TEAM_ASSIGNEES,
  TEAM_STATUSES,
  isTeamCategory,
  teamStatusRequiresAssignee,
} from '../lib/taskModel'
import { PriorityFlame } from './PriorityFlame'

export type TaskDialogMode = 'create' | 'edit'

export interface TaskEditPatch {
  title: string
  detail?: string
  priority: TaskPriority
  assignee?: string
  /** 一并切换状态（开始 / 完成） */
  status?: TaskStatus
}

interface CreateProps {
  mode: 'create'
  open: boolean
  categories: string[]
  currentCategory?: string
  onClose: () => void
  onSubmit: (draft: TaskDraft) => void
}

interface EditProps {
  mode: 'edit'
  open: boolean
  task: Task | null
  /** 当前分类，决定是否展示责任人等 */
  category?: string
  readOnly?: boolean
  onClose: () => void
  onSubmit: (patch: TaskEditPatch) => void
}

type Props = CreateProps | EditProps

interface FormValues {
  title?: string
  priority?: TaskPriority
  detail?: string
  dueAt?: Dayjs | null
  category?: string
  assignee?: string
}

const DEFAULT_CREATE_CATEGORY = '每日待办'

const CATEGORY_SHORT_LABEL: Record<string, string> = {
  每日待办: '每日',
  团队事项: '团队',
  与产品沟通事项: '产品',
}

function categoryRadioLabel(category: string): string {
  return CATEGORY_SHORT_LABEL[category] ?? category
}

function defaultCreateCategory(categories: string[], currentCategory?: string): string {
  if (currentCategory && categories.includes(currentCategory)) return currentCategory
  if (categories.includes(DEFAULT_CREATE_CATEGORY)) return DEFAULT_CREATE_CATEGORY
  return categories[0] ?? DEFAULT_CREATE_CATEGORY
}

export function TaskDialog(props: Props) {
  const [form] = Form.useForm<FormValues>()
  const isCreate = props.mode === 'create'
  const watchCategory = Form.useWatch('category', form)
  const createCategory =
    isCreate && props.mode === 'create'
      ? watchCategory || defaultCreateCategory(props.categories, props.currentCategory)
      : ''
  const editCategory = props.mode === 'edit' ? props.category ?? '' : ''
  const showAssignee =
    (isCreate && isTeamCategory(createCategory)) ||
    (props.mode === 'edit' && isTeamCategory(editCategory))
  const readOnly =
    props.mode === 'edit' &&
    (!!props.readOnly || props.task?.status === 'transferred' || props.task?.status === 'cancelled')

  useEffect(() => {
    if (!props.open) return
    if (props.mode === 'edit' && props.task) {
      form.setFieldsValue({
        title: props.task.title,
        detail: props.task.detail,
        priority: props.task.priority ?? 3,
        assignee: props.task.assignee,
      })
    } else if (props.mode === 'create') {
      form.resetFields()
      form.setFieldsValue({
        priority: 3,
        category: defaultCreateCategory(props.categories, props.currentCategory),
        assignee: undefined,
      })
    }
  }, [props, form])

  async function submit(status?: TaskStatus) {
    if (readOnly) {
      props.onClose()
      return
    }
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const title = (values.title ?? '').trim()
    const detail = values.detail?.trim() || undefined
    const priority = (values.priority ?? 3) as TaskPriority
    const assigneeRaw = values.assignee?.trim()
    const assignee = assigneeRaw ? assigneeRaw : undefined
    if (status && teamStatusRequiresAssignee(status) && !assignee) {
      form.setFields([{ name: 'assignee', errors: ['请先选择责任人'] }])
      return
    }
    if (props.mode === 'create') {
      props.onSubmit({
        title,
        priority,
        detail,
        dueAt: values.dueAt ? values.dueAt.format('YYYY-MM-DD') : undefined,
        category: values.category || defaultCreateCategory(props.categories, props.currentCategory),
        assignee,
      })
    } else {
      const patch: TaskEditPatch = { title, detail, priority, assignee }
      if (status) patch.status = status
      props.onSubmit(patch)
    }
    props.onClose()
  }

  const isTeamEdit = props.mode === 'edit' && isTeamCategory(editCategory)

  return (
    <Modal
      title={isCreate ? '新建任务' : readOnly ? '查看任务' : '编辑任务'}
      open={props.open}
      onCancel={props.onClose}
      destroyOnHidden
      width={520}
      footer={
        readOnly
          ? (
              <Button type="primary" onClick={props.onClose}>
                关闭
              </Button>
            )
          : isCreate
            ? undefined
            : (_, { OkBtn, CancelBtn }) => (
                <>
                  <CancelBtn />
                  <OkBtn />
                  {isTeamEdit ? (
                    <>
                      {TEAM_STATUSES.map((s) => (
                        <Button
                          key={s}
                          color={s === 'accepted' ? 'green' : 'primary'}
                          variant={s === 'accepted' || s === 'processed' ? 'solid' : 'outlined'}
                          onClick={() => void submit(s)}
                        >
                          {STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </>
                  ) : (
                    <>
                      <Button color="primary" variant="outlined" onClick={() => void submit('started')}>
                        开始
                      </Button>
                      <Button color="green" variant="solid" onClick={() => void submit('completed')}>
                        完成
                      </Button>
                    </>
                  )}
                </>
              )
      }
      onOk={readOnly ? props.onClose : isCreate ? () => void submit() : () => void submit()}
      okText={readOnly ? '关闭' : '确定'}
      cancelText="取消"
      cancelButtonProps={readOnly ? { style: { display: 'none' } } : undefined}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 12 }}
        initialValues={{
          priority: 3,
          ...(isCreate && props.mode === 'create'
            ? { category: defaultCreateCategory(props.categories, props.currentCategory) }
            : {}),
        }}
      >
        {isCreate && props.mode === 'create' && (
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Radio.Group>
              <Space size={[42, 8]} wrap>
                {props.categories.map((c) => {
                  const label = categoryRadioLabel(c)
                  return (
                    <Tooltip key={c} title={label === c ? undefined : c}>
                      <Radio value={c} style={{ marginInlineEnd: 0 }}>
                        {label}
                      </Radio>
                    </Tooltip>
                  )
                })}
              </Space>
            </Radio.Group>
          </Form.Item>
        )}

        <Form.Item
          name="title"
          label="标题"
          rules={isCreate ? [{ required: true, whitespace: true, message: '请填写标题' }] : undefined}
        >
          <Input
            placeholder={isCreate ? '必填' : '标题'}
            allowClear
            autoFocus={isCreate}
            disabled={readOnly}
          />
        </Form.Item>

        {showAssignee && (
          <Form.Item
            name="assignee"
            label="责任人"
            extra={isCreate ? '规划中可不选；已下发后必填' : undefined}
            rules={
              props.mode === 'edit' && props.task && teamStatusRequiresAssignee(props.task.status)
                ? [{ required: true, message: '责任人不能为空' }]
                : undefined
            }
          >
            <Radio.Group disabled={readOnly}>
              <Space size={[42, 8]} wrap>
                {TEAM_ASSIGNEES.map((n) => (
                  <Radio key={n} value={n} style={{ marginInlineEnd: 0 }}>
                    {n}
                  </Radio>
                ))}
                {!(
                  props.mode === 'edit' &&
                  props.task &&
                  teamStatusRequiresAssignee(props.task.status)
                ) && (
                  <Radio value="" style={{ marginInlineEnd: 0 }}>
                    无
                  </Radio>
                )}
              </Space>
            </Radio.Group>
          </Form.Item>
        )}

        <Form.Item name="priority" label="优先级">
          <Radio.Group disabled={readOnly}>
            <Space size="middle">
              {([1, 2, 3] as TaskPriority[]).map((p) => (
                <Radio key={p} value={p} style={{ marginInlineEnd: 0 }}>
                  <PriorityFlame value={p} />
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        {isCreate && (
          <Form.Item name="dueAt" label="期望完成日期">
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
        )}

        <Form.Item name="detail" label="详情">
          <Input.TextArea placeholder="可不填" rows={4} allowClear disabled={readOnly} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/** 兼容旧数据里的 due 字符串 */
export function parseDueDayjs(due?: string): Dayjs | null {
  if (!due) return null
  const d = dayjs(due.replace('T', ' '))
  return d.isValid() ? d : null
}
