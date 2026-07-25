#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/encrypt-token.mjs <token> <password>
 *   node scripts/encrypt-token.mjs <token>   # password defaults to prompt via env UNLOCK_PASSWORD
 */
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ITERATIONS = 120_000

const token = (process.argv[2] || '').trim()
const password = (process.argv[3] || process.env.UNLOCK_PASSWORD || '').trim()

if (!token || !password) {
  console.error('用法: node scripts/encrypt-token.mjs <github_pat> <password>')
  process.exit(1)
}

const salt = randomBytes(16)
const iv = randomBytes(12)
const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256')
const cipher = createCipheriv('aes-256-gcm', key, iv)
const enc = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
const tag = cipher.getAuthTag()
const ciphertext = Buffer.concat([enc, tag])

const vault = {
  v: 1,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ciphertext: ciphertext.toString('base64'),
  iterations: ITERATIONS,
}

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
  delete raw.github.tokenEncrypted
  if (path.endsWith('config.example.json')) {
    raw.github.tokenVault = {
      v: 1,
      salt: '<base64>',
      iv: '<base64>',
      ciphertext: '<base64>',
      iterations: ITERATIONS,
    }
  } else {
    raw.github.tokenVault = vault
  }
  writeFileSync(path, JSON.stringify(raw, null, 2) + '\n')
  console.log('已更新', path)
}

console.log('加密完成。解锁口令请自行牢记，不会写入仓库。')
