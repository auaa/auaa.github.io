import { useRef, useState } from 'react'
import { Alert, Input, Modal } from 'antd'
import { decryptTokenWithPassword, type TokenVault } from '../lib/crypto'

export const UNLOCK_PASSWORD_LS = 'daily.unlockPassword'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type StoredUnlock = { password: string; expiresAt: number }

export function loadStoredUnlockPassword(): string | null {
  try {
    const raw = localStorage.getItem(UNLOCK_PASSWORD_LS)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredUnlock
    if (!parsed?.password || typeof parsed.expiresAt !== 'number') {
      localStorage.removeItem(UNLOCK_PASSWORD_LS)
      return null
    }
    if (Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(UNLOCK_PASSWORD_LS)
      return null
    }
    return parsed.password
  } catch {
    try {
      localStorage.removeItem(UNLOCK_PASSWORD_LS)
    } catch {
      /* ignore */
    }
    return null
  }
}

export function saveUnlockPassword(password: string): void {
  const payload: StoredUnlock = {
    password,
    expiresAt: Date.now() + WEEK_MS,
  }
  localStorage.setItem(UNLOCK_PASSWORD_LS, JSON.stringify(payload))
}

export function clearUnlockPassword(): void {
  localStorage.removeItem(UNLOCK_PASSWORD_LS)
}

interface Props {
  vault: TokenVault
  onUnlocked: (token: string) => void
}

export function UnlockPanel({ vault, onUnlocked }: Props) {
  const [password, setPassword] = useState('')
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
        saveUnlockPassword(code)
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
      title="输入4位数字口令"
      open
      centered
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      width={360}
      className="unlock-modal"
    >
      <Input.OTP
        length={4}
        mask="•"
        value={password}
        disabled={busy}
        autoFocus
        inputMode="numeric"
        onChange={onDigitsChange}
        formatter={(str) => str.replace(/\D/g, '')}
        style={{ display: 'flex', justifyContent: 'center' }}
      />
      <div className="unlock-remember-row">
        <span className="unlock-hint">验证通过后本机记住 1 周</span>
        {busy && <span className="unlock-verifying">验证中…</span>}
      </div>
      {error && <Alert type="error" showIcon message={error} style={{ marginTop: 12 }} />}
    </Modal>
  )
}
