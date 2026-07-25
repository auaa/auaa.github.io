#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/encrypt-token.mjs <github_pat_xxx>
 *   echo "$TOKEN" | node scripts/encrypt-token.mjs
 */
import { publicEncrypt, constants } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pubPath = join(root, 'keys/public.pem')

const arg = process.argv[2]
let token = arg
if (!token) {
  token = readFileSync(0, 'utf8').trim()
}
token = (token || '').trim()
if (!token) {
  console.error('请传入 Token：node scripts/encrypt-token.mjs <token>')
  process.exit(1)
}

const publicKey = readFileSync(pubPath, 'utf8')
const encrypted = publicEncrypt(
  {
    key: publicKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
  },
  Buffer.from(token, 'utf8'),
)
const b64 = encrypted.toString('base64')

const configs = [
  join(root, 'app/public/config.json'),
  join(root, 'docs/config.json'),
  join(root, 'app/public/config.example.json'),
]

for (const path of configs) {
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    continue
  }
  raw.github = raw.github || {}
  delete raw.github.token
  if (path.endsWith('config.example.json')) {
    raw.github.tokenEncrypted = '<base64 RSA-OAEP ciphertext>'
  } else {
    raw.github.tokenEncrypted = b64
  }
  writeFileSync(path, JSON.stringify(raw, null, 2) + '\n')
  console.log('已更新', path)
}

console.log('\ntokenEncrypted 长度:', b64.length)
console.log('请保管 keys/private.pem，浏览器首次打开需粘贴私钥解锁。')
