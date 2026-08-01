#!/usr/bin/env node
/**
 * 从日 md 重建月归档 JSON（谨慎、少兜底；默认 dry-run）。
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/rebuild-month-archive.mjs --category <分类> --month YYYY-MM
 *   GITHUB_TOKEN=... node scripts/rebuild-month-archive.mjs --category <分类> --month YYYY-MM --write
 *
 * 读取 app/public/config.json 的 owner/repo/branch/dataPath（不读 tokenVault）。
 * Token 必须来自环境变量 GITHUB_TOKEN。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MONTH_DIR = '_month'

function parseArgs(argv) {
  const out = { category: '', month: '', write: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--write') out.write = true
    else if (a === '--category') out.category = (argv[++i] || '').trim()
    else if (a === '--month') out.month = (argv[++i] || '').trim()
  }
  return out
}

function die(msg) {
  console.error(msg)
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.category) die('缺少 --category <分类名>')
if (!/^\d{4}-\d{2}$/.test(args.month)) die('缺少或非法 --month YYYY-MM')

const token = (process.env.GITHUB_TOKEN || '').trim()
if (!token) die('请设置环境变量 GITHUB_TOKEN')

const cfgPath = join(root, 'app/public/config.json')
let cfg
try {
  cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
} catch (e) {
  die(`无法读取 ${cfgPath}: ${e instanceof Error ? e.message : e}`)
}

const owner = cfg?.github?.owner
const repo = cfg?.github?.repo
const branch = cfg?.github?.branch || 'main'
const dataPath = (cfg?.github?.dataPath || 'data').replace(/^\/+|\/+$/g, '')
if (!owner || !repo) die('config.json 缺少 github.owner / github.repo')

const base = `https://api.github.com/repos/${owner}/${repo}`
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  Authorization: `Bearer ${token}`,
}

async function api(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  })
  return res
}

function decodeContent(body) {
  if (body.encoding === 'base64') return Buffer.from(body.content, 'base64').toString('utf8')
  return body.content
}

/** 与 app/src/lib/markdown.ts 保持一致的最小解析（失败即跳过该行，不猜测） */
const LINE_RE = /^-\s+\[([ xX])\]\s+(.*?)\s*<!--\s*(.*?)\s*-->\s*$/

function parseMarkdown(md) {
  const tasks = []
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(LINE_RE)
    if (!m) continue
    const checked = m[1].toLowerCase() === 'x'
    const title = m[2].trim()
    const meta = {}
    const metaRe = /([A-Za-z]+):((?:(?!\s+[A-Za-z]+:).)+)/g
    let mm
    while ((mm = metaRe.exec(m[3])) !== null) {
      const k = mm[1]
      const v = mm[2].trim()
      if (k === 'id') meta.id = v
      else if (k === 'status' && (v === 'planned' || v === 'started' || v === 'completed')) meta.status = v
      else if (k === 'planned') meta.plannedAt = v.replace(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2}).*$/, '$1 $2')
      else if (k === 'started') meta.startedAt = v.replace(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2}).*$/, '$1 $2')
      else if (k === 'completed') meta.completedAt = v.replace(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2}).*$/, '$1 $2')
      else if (k === 'priority' && (v === '1' || v === '2' || v === '3')) meta.priority = Number(v)
      else if (k === 'due') meta.dueAt = decodeURIComponent(v)
      else if (k === 'detail') {
        try {
          meta.detail = decodeURIComponent(v)
        } catch {
          meta.detail = v
        }
      }
    }
    if (!meta.id) continue
    tasks.push({
      id: meta.id,
      title,
      status: meta.status ?? (checked ? 'completed' : 'planned'),
      plannedAt: meta.plannedAt ?? '',
      startedAt: meta.startedAt,
      completedAt: meta.completedAt,
      priority: meta.priority,
      detail: meta.detail,
      dueAt: meta.dueAt,
    })
  }
  return tasks
}

const catPath = `${dataPath}/${args.category}`
const listRes = await api(`/contents/${encodeURI(catPath)}?ref=${branch}`)
if (listRes.status === 404) die(`分类不存在: ${catPath}`)
if (!listRes.ok) die(`列出分类失败: ${listRes.status} ${await listRes.text()}`)

const entries = await listRes.json()
if (!Array.isArray(entries)) die('列出分类返回非目录（可能路径指向了文件）')

const prefix = `${args.month}-`
const dayFiles = entries
  .filter((e) => e.type === 'file' && /^\d{4}-\d{2}-\d{2}\.md$/.test(e.name) && e.name.startsWith(prefix))
  .map((e) => e.name.replace(/\.md$/, ''))
  .sort()

console.log(`分类=${args.category} 月份=${args.month} 日文件=${dayFiles.length} 模式=${args.write ? 'WRITE' : 'dry-run'}`)

const days = {}
for (const ymd of dayFiles) {
  const path = `${catPath}/${ymd}.md`
  const res = await api(`/contents/${encodeURI(path)}?ref=${branch}`)
  if (res.status === 404) die(`日文件中途消失: ${path}`)
  if (!res.ok) die(`读取失败 ${path}: ${res.status}`)
  const body = await res.json()
  const tasks = parseMarkdown(decodeContent(body))
  days[ymd] = tasks
  console.log(`  ${ymd}: ${tasks.length} 条`)
}

const archive = { v: 1, month: args.month, days }
const outPath = `${catPath}/${MONTH_DIR}/${args.month}.json`
const content = `${JSON.stringify(archive, null, 2)}\n`

if (!args.write) {
  console.log(`dry-run：将写入 ${outPath}（${Buffer.byteLength(content, 'utf8')} bytes），加 --write 才提交`)
  process.exit(0)
}

const existing = await api(`/contents/${encodeURI(outPath)}?ref=${branch}`)
let sha
if (existing.status === 200) {
  const body = await existing.json()
  sha = body.sha
} else if (existing.status !== 404) {
  die(`检查已有归档失败: ${existing.status}`)
}

const putRes = await api(`/contents/${encodeURI(outPath)}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `chore(${args.category}): rebuild ${args.month} month archive`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  }),
})
if (!putRes.ok) die(`写入失败: ${putRes.status} ${await putRes.text()}`)
console.log(`已写入 ${outPath}`)
