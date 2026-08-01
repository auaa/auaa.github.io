/** PBKDF2 (SHA-256) + AES-GCM token vault */

import type { TokenVault } from '../types'

export type { TokenVault }

const DEFAULT_ITERATIONS = 120_000

/** Web Crypto SubtleCrypto 仅在安全上下文可用（HTTPS / localhost） */
function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    const host = typeof location !== 'undefined' ? location.host : ''
    const proto = typeof location !== 'undefined' ? location.protocol : ''
    throw new Error(
      `当前环境不支持 Web Crypto（crypto.subtle 不可用）。请用 HTTPS 或 localhost 打开（当前 ${proto}//${host || '未知'}），不要用局域网 IP 的 http:// 或 file://。`,
    )
  }
  return subtle
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin)
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = getSubtle()
  const base = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function decryptTokenWithPassword(password: string, vault: TokenVault): Promise<string> {
  const salt = b64ToBytes(vault.salt)
  const iv = b64ToBytes(vault.iv)
  const data = b64ToBytes(vault.ciphertext)
  const key = await deriveKey(password, salt, vault.iterations || DEFAULT_ITERATIONS)
  try {
    const plain = await getSubtle().decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      data as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch (e) {
    if (e instanceof Error && e.message.includes('crypto.subtle')) throw e
    throw new Error('口令错误或密文损坏')
  }
}

export async function encryptTokenWithPassword(
  password: string,
  token: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<TokenVault> {
  getSubtle()
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, iterations)
  const cipher = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(token),
  )
  return {
    v: 1,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(cipher)),
    iterations,
  }
}
