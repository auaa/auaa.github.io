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
    <div className="panel unlock">
      <h2>解锁</h2>
      <p className="muted">Token 已加密存放。输入口令后可选择记住到本机，下次自动解锁。</p>
      <input
        className="password-input"
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
      <label className="check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        记住口令到本机（下次免输入）
      </label>
      {error && <div className="error-inline">{error}</div>}
      <button type="button" className="btn primary" disabled={busy || !password} onClick={() => void unlock()}>
        {busy ? '解密中…' : '解锁'}
      </button>
    </div>
  )
}
