import { useState } from 'react'
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
    <div className="panel unlock-panel">
      <h2 className="panel-title">解锁</h2>
      <p className="panel-desc">输入口令解密 Token。可记住到本机，下次自动进入。</p>
      <input
        className="field-input"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        placeholder="解锁口令"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && password) void unlock()
        }}
      />
      <label className="check-row">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        记住口令到本机
      </label>
      {error && <p className="field-error">{error}</p>}
      <button type="button" className="btn btn-primary" disabled={busy || !password} onClick={() => void unlock()}>
        {busy ? '解密中…' : '进入'}
      </button>
    </div>
  )
}
