/** PBKDF2 (SHA-256) + AES-GCM token vault */

import type { TokenVault } from '../types'

export type { TokenVault }

const DEFAULT_ITERATIONS = 120_000

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
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
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
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      data as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('口令错误或密文损坏')
  }
}

export async function encryptTokenWithPassword(
  password: string,
  token: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<TokenVault> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, iterations)
  const cipher = await crypto.subtle.encrypt(
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
