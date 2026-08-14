import { Button, Modal, Radio, Space } from 'antd'
import { useEffect, useState } from 'react'
import { TEAM_ASSIGNEES } from '../lib/taskModel'

interface Props {
  open: boolean
  taskTitle?: string
  onClose: () => void
  onConfirm: (assignee: string) => void
}

export function TransferDialog({ open, taskTitle, onClose, onConfirm }: Props) {
  const [assignee, setAssignee] = useState<string>(TEAM_ASSIGNEES[0])

  useEffect(() => {
    if (open) setAssignee(TEAM_ASSIGNEES[0])
  }, [open])

  return (
    <Modal
      title="转处理"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={420}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            onClick={() => {
              if (!assignee) return
              onConfirm(assignee)
            }}
          >
            确定
          </Button>
        </Space>
      }
    >
      {taskTitle ? (
        <p className="hint" style={{ marginTop: 8, marginBottom: 12 }}>
          {taskTitle}
        </p>
      ) : null}
      <div style={{ marginBottom: 8, color: 'var(--muted)', fontSize: 13 }}>责任人</div>
      <Radio.Group value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <Space size={[42, 8]} wrap>
          {TEAM_ASSIGNEES.map((name) => (
            <Radio key={name} value={name} style={{ marginInlineEnd: 0 }}>
              {name}
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </Modal>
  )
}
