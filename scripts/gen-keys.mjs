#!/usr/bin/env node
import { generateKeyPairSync } from 'node:crypto'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const keysDir = join(root, 'keys')
mkdirSync(keysDir, { recursive: true })

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const pubPath = join(keysDir, 'public.pem')
const privPath = join(keysDir, 'private.pem')
if (existsSync(privPath) && !process.argv.includes('--force')) {
  console.error('keys/private.pem 已存在。若要覆盖请加 --force')
  process.exit(1)
}

writeFileSync(pubPath, publicKey)
writeFileSync(privPath, privateKey)
mkdirSync(join(root, 'app/public'), { recursive: true })
writeFileSync(join(root, 'app/public/public.pem'), publicKey)

console.log('已生成:')
console.log('  keys/public.pem   （可提交）')
console.log('  keys/private.pem  （勿提交，本机解锁用）')
console.log('  app/public/public.pem')
