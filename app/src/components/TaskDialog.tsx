import { useEffect } from 'react'
import { DatePicker, Form, Input, Modal, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { Task, TaskDraft, TaskPriority } from '../types'
import { PRIORITY_OPTIONS } from './PriorityFlame'

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
      })
    } else if (props.mode === 'create') {
      form.resetFields()
    }
  }, [props, form])

  async function handleOk() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const title = (values.title ?? '').trim()
    const detail = values.detail?.trim() || undefined
    if (props.mode === 'create') {
      props.onSubmit({
        title,
        priority: values.priority,
        detail,
        dueAt: values.dueAt ? values.dueAt.format('YYYY-MM-DDTHH:mm') : undefined,
      })
    } else {
      props.onSubmit({ title, detail })
    }
    props.onClose()
  }

  return (
    <Modal
      title={isCreate ? '新建任务' : '编辑任务'}
      open={props.open}
      onCancel={props.onClose}
      onOk={() => void handleOk()}
      okText="确定"
      cancelText="取消"
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="title"
          label="标题"
          rules={isCreate ? [{ required: true, whitespace: true, message: '请填写标题' }] : undefined}
        >
          <Input placeholder={isCreate ? '必填' : '标题'} allowClear autoFocus={isCreate} />
        </Form.Item>

        {isCreate && (
          <>
            <Form.Item name="priority" label="优先级">
              <Select
                allowClear
                placeholder="不设置"
                options={PRIORITY_OPTIONS}
                optionLabelProp="label"
                popupMatchSelectWidth={false}
              />
            </Form.Item>
            <Form.Item name="dueAt" label="预期完成时间">
              <DatePicker showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </>
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
