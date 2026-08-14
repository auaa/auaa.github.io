import { useRef, useState } from 'react'
import { Alert, Checkbox, Input, Modal } from 'antd'
import {
  decryptTokenWithPassword,
  unwrapSecret,
  wrapSecret,
  type TokenVault,
  type WrappedSecret,
} from '../lib/crypto'

const UNLOCK_SESSION_LS = 'daily.unlockSession'
const LEGACY_UNLOCK_PASSWORD_LS = 'daily.unlockPassword'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type StoredSession = WrappedSecret & { v: 1; expiresAt: number }

function clearLegacyUnlockPassword(): void {
  try {
    localStorage.removeItem(LEGACY_UNLOCK_PASSWORD_LS)
  } catch {
    /* ignore */
  }
}

export function clearUnlockSession(): void {
  try {
    localStorage.removeItem(UNLOCK_SESSION_LS)
  } catch {
    /* ignore */
  }
  clearLegacyUnlockPassword()
}

export async function loadUnlockSessionToken(): Promise<string | null> {
  clearLegacyUnlockPassword()
  try {
    const raw = localStorage.getItem(UNLOCK_SESSION_LS)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredSession
    if (
      parsed?.v !== 1 ||
      typeof parsed.expiresAt !== 'number' ||
      !parsed.key ||
      !parsed.iv ||
      !parsed.ciphertext
    ) {
      clearUnlockSession()
      return null
    }
    if (Date.now() >= parsed.expiresAt) {
      clearUnlockSession()
      return null
    }
    return await unwrapSecret(parsed)
  } catch {
    clearUnlockSession()
    return null
  }
}

export async function saveUnlockSessionToken(token: string): Promise<void> {
  const wrapped = await wrapSecret(token)
  const payload: StoredSession = {
    v: 1,
    expiresAt: Date.now() + WEEK_MS,
    ...wrapped,
  }
  localStorage.setItem(UNLOCK_SESSION_LS, JSON.stringify(payload))
  clearLegacyUnlockPassword()
}

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
        if (remember) await saveUnlockSessionToken(token)
        else clearUnlockSession()
      } catch {
        /* ignore storage failures */
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
      title="请输入口令"
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
        <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy}>
          记住密码
        </Checkbox>
        {busy && <span className="unlock-verifying">验证中…</span>}
      </div>
      {error && <Alert type="error" showIcon message={error} style={{ marginTop: 12 }} />}
    </Modal>
  )
}
