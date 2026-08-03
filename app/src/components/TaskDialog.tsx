import { useEffect } from 'react'
import { Button, DatePicker, Form, Input, Modal, Radio, Space } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { Task, TaskDraft, TaskPriority, TaskStatus } from '../types'
import { PriorityFlame } from './PriorityFlame'

export type TaskDialogMode = 'create' | 'edit'

export interface TaskEditPatch {
  title: string
  detail?: string
  priority: TaskPriority
  /** 一并切换状态（开始 / 完成） */
  status?: TaskStatus
}

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
  onSubmit: (patch: TaskEditPatch) => void
}

type Props = CreateProps | EditProps

interface FormValues {
  title?: string
  priority?: TaskPriority
  detail?: string
  dueAt?: Dayjs | null
}

export function TaskDialog(props: Props) {
  const [form] = Form.useForm<FormValues>()
  const isCreate = props.mode === 'create'

  useEffect(() => {
    if (!props.open) return
    if (props.mode === 'edit' && props.task) {
      form.setFieldsValue({
        title: props.task.title,
        detail: props.task.detail,
        priority: props.task.priority ?? 3,
      })
    } else if (props.mode === 'create') {
      form.resetFields()
      form.setFieldsValue({ priority: 3 })
    }
  }, [props, form])

  async function submit(status?: TaskStatus) {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const title = (values.title ?? '').trim()
    const detail = values.detail?.trim() || undefined
    const priority = (values.priority ?? 3) as TaskPriority
    if (props.mode === 'create') {
      props.onSubmit({
        title,
        priority,
        detail,
        dueAt: values.dueAt ? values.dueAt.format('YYYY-MM-DD') : undefined,
      })
    } else {
      const patch: TaskEditPatch = { title, detail, priority }
      if (status) patch.status = status
      props.onSubmit(patch)
    }
    props.onClose()
  }

  return (
    <Modal
      title={isCreate ? '新建任务' : '编辑任务'}
      open={props.open}
      onCancel={props.onClose}
      destroyOnHidden
      width={520}
      footer={
        isCreate
          ? undefined
          : (_, { OkBtn, CancelBtn }) => (
              <>
                <CancelBtn />
                <OkBtn />
                <Button onClick={() => void submit('started')}>开始</Button>
                <Button type="primary" onClick={() => void submit('completed')}>
                  完成
                </Button>
              </>
            )
      }
      onOk={isCreate ? () => void submit() : () => void submit()}
      okText="确定"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} initialValues={{ priority: 3 }}>
        <Form.Item
          name="title"
          label="标题"
          rules={isCreate ? [{ required: true, whitespace: true, message: '请填写标题' }] : undefined}
        >
          <Input placeholder={isCreate ? '必填' : '标题'} allowClear autoFocus={isCreate} />
        </Form.Item>

        <Form.Item name="priority" label="优先级">
          <Radio.Group>
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
          <Input.TextArea placeholder="可不填" rows={4} allowClear />
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
