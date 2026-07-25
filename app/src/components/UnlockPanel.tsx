import { useState } from 'react'
import { clearStoredPrivateKey, decryptToken, storePrivateKey } from '../lib/crypto'

interface Props {
  tokenEncrypted: string
  onUnlocked: (token: string) => void
}

export function UnlockPanel({ tokenEncrypted, onUnlocked }: Props) {
  const [pem, setPem] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function unlock() {
    setBusy(true)
    setError(null)
    try {
      const token = await decryptToken(pem, tokenEncrypted)
      if (remember) storePrivateKey(pem)
      else clearStoredPrivateKey()
      onUnlocked(token)
    } catch (e) {
      clearStoredPrivateKey()
      setError(e instanceof Error ? e.message : '解密失败，请检查私钥')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel unlock">
      <h2>解锁</h2>
      <p className="muted">
        Token 已用 RSA 公钥加密存放在仓库中。请粘贴本机 <code>keys/private.pem</code> 内容以解密（私钥不会上传）。
      </p>
      <textarea
        className="pem-input"
        rows={10}
        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
        value={pem}
        onChange={(e) => setPem(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      <label className="check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        记住私钥到本机 localStorage
      </label>
      {error && <div className="error-inline">{error}</div>}
      <button type="button" className="btn primary" disabled={busy || !pem.trim()} onClick={() => void unlock()}>
        {busy ? '解密中…' : '解锁'}
      </button>
    </div>
  )
}
