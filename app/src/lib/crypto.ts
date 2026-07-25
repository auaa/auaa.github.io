/** RSA-OAEP (SHA-256) helpers for token unlock */

const PRIVATE_KEY_LS = 'daily.privateKey.pem'

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bin = atob(cleaned)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const text = pem.trim()
  if (!text.includes('BEGIN PRIVATE KEY')) {
    throw new Error('请使用 PKCS#8 私钥（BEGIN PRIVATE KEY），可用 node scripts/gen-keys.mjs 生成')
  }
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(text),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  )
}

export async function decryptToken(privateKeyPem: string, tokenEncryptedB64: string): Promise<string> {
  const key = await importPrivateKey(privateKeyPem)
  const cipher = Uint8Array.from(atob(tokenEncryptedB64.replace(/\s+/g, '')), (c) => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, cipher)
  return new TextDecoder().decode(plain)
}

export function loadStoredPrivateKey(): string | null {
  try {
    return localStorage.getItem(PRIVATE_KEY_LS)
  } catch {
    return null
  }
}

export function storePrivateKey(pem: string) {
  localStorage.setItem(PRIVATE_KEY_LS, pem.trim())
}

export function clearStoredPrivateKey() {
  localStorage.removeItem(PRIVATE_KEY_LS)
}
