import { useState } from 'react'
import { Alert, Checkbox, Form, Input, Modal } from 'antd'
import { decryptTokenWithPassword, type TokenVault } from '../lib/crypto'

export const UNLOCK_PASSWORD_LS = 'daily.unlockPassword'

interface Props {
  vault: TokenVault
  onUnlocked: (token: string) => void
}

export function UnlockPanel({ vault, onUnlocked }: Props) {
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function unlock() {
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      const token = await decryptTokenWithPassword(password, vault)
      try {
        if (remember) localStorage.setItem(UNLOCK_PASSWORD_LS, password)
        else localStorage.removeItem(UNLOCK_PASSWORD_LS)
      } catch {
        /* ignore */
      }
      onUnlocked(token)
    } catch (e) {
      setError(e instanceof Error ? e.message : '解锁失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="解锁"
      open
      centered
      closable={false}
      maskClosable={false}
      keyboard={false}
      okText={busy ? '解密中…' : '进入'}
      cancelButtonProps={{ style: { display: 'none' } }}
      okButtonProps={{ disabled: busy || !password, loading: busy }}
      onOk={() => void unlock()}
      destroyOnHidden={false}
      width={420}
    >
      <p style={{ margin: '0 0 12px', color: '#626f86' }}>
        输入口令解密 Token。可记住到本机，下次自动进入。
      </p>
      <Form layout="vertical" onFinish={() => void unlock()}>
        <Form.Item label="解锁口令" style={{ marginBottom: 12 }}>
          <Input.Password
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="解锁口令"
            inputMode="numeric"
            autoComplete="current-password"
            onPressEnter={() => void unlock()}
          />
        </Form.Item>
        <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
          记住口令到本机
        </Checkbox>
      </Form>
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginTop: 12 }} />
      )}
    </Modal>
  )
}
