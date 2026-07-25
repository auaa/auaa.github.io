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
    <div className="box py-4">
      <h2 className="title is-6 mb-2">解锁</h2>
      <p className="is-size-7 has-text-grey mb-3">
        Token 已加密存放。输入口令后可选择记住到本机，下次自动解锁。
      </p>
      <div className="field">
        <div className="control">
          <input
            className="input is-small"
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
        </div>
      </div>
      <label className="checkbox is-size-7 mb-3">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />{' '}
        记住口令到本机（下次免输入）
      </label>
      {error && <p className="help is-danger mb-2">{error}</p>}
      <button
        type="button"
        className={`button is-primary is-small${busy ? ' is-loading' : ''}`}
        disabled={busy || !password}
        onClick={() => void unlock()}
      >
        解锁
      </button>
    </div>
  )
}
