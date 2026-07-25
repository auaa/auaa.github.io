import { useRef, useState } from 'react'
import { Alert, Checkbox, Input, Modal } from 'antd'
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
  const unlocking = useRef(false)

  async function unlock(code: string) {
    if (code.length !== 4 || unlocking.current) return
    unlocking.current = true
    setBusy(true)
    setError(null)
    try {
      const token = await decryptTokenWithPassword(code, vault)
      try {
        if (remember) localStorage.setItem(UNLOCK_PASSWORD_LS, code)
        else localStorage.removeItem(UNLOCK_PASSWORD_LS)
      } catch {
        /* ignore */
      }
      onUnlocked(token)
    } catch {
      setError('口令错误')
      setPassword('')
      unlocking.current = false
      setBusy(false)
    }
  }

  function onDigitsChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setPassword(digits)
    setError(null)
    if (digits.length === 4) void unlock(digits)
  }

  return (
    <Modal
      title="解锁"
      open
      centered
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      width={360}
    >
      <p style={{ margin: '0 0 16px', color: '#626f86' }}>输入 4 位数字口令</p>
      <Input.OTP
        length={4}
        type="number"
        value={password}
        disabled={busy}
        autoFocus
        onChange={onDigitsChange}
        style={{ display: 'flex', justifyContent: 'center' }}
      />
      <div style={{ marginTop: 14 }}>
        <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy}>
          记住到本机
        </Checkbox>
      </div>
      {busy && <p style={{ margin: '12px 0 0', color: '#626f86' }}>验证中…</p>}
      {error && <Alert type="error" showIcon message={error} style={{ marginTop: 12 }} />}
    </Modal>
  )
}
