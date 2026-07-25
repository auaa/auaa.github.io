import { useState } from 'react'
import { decryptTokenWithPassword, type TokenVault } from '../lib/crypto'

interface Props {
  vault: TokenVault
  onUnlocked: (token: string) => void
}

export function UnlockPanel({ vault, onUnlocked }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function unlock() {
    setBusy(true)
    setError(null)
    try {
      const token = await decryptTokenWithPassword(password, vault)
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
      <p className="muted">Token 已加密存放在仓库中。请输入解锁口令（每次进入需输入）。</p>
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
      {error && <div className="error-inline">{error}</div>}
      <button type="button" className="btn primary" disabled={busy || !password} onClick={() => void unlock()}>
        {busy ? '解密中…' : '解锁'}
      </button>
    </div>
  )
}
