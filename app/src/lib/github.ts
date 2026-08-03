import type { AppConfigFile, GithubRuntimeConfig, Task } from '../types'
import {
  MONTH_DIR,
  emptyMonthArchive,
  monthKeyFromYmd,
  parseMonthArchive,
  upsertMonthDay,
  type MonthArchive,
} from './monthArchive'

export type { MonthArchive }

export class GithubConflictError extends Error {
  constructor(message = '远程文件已变更，请刷新后重试') {
    super(message)
    this.name = 'GithubConflictError'
  }
}

export class GithubClient {
  private cfg: GithubRuntimeConfig

  constructor(cfg: GithubRuntimeConfig) {
    this.cfg = cfg
  }

  private get base() {
    return `https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}`
  }

  private headers(json = true): HeadersInit {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${this.cfg.token}`,
    }
    if (json) h['Content-Type'] = 'application/json'
    return h
  }

  private dataPath(...parts: string[]) {
    const root = this.cfg.dataPath.replace(/^\/+|\/+$/g, '')
    return [root, ...parts].filter(Boolean).join('/')
  }

  /** GET Contents：禁缓存 + 随机参数，避免浏览器/中间层返回旧 sha */
  private contentsGetUrl(path: string): string {
    const bust = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    return `${this.base}/contents/${encodeURI(path)}?ref=${encodeURIComponent(this.cfg.branch)}&_=${bust}`
  }

  private async fetchContents(path: string): Promise<Response> {
    return fetch(this.contentsGetUrl(path), {
      headers: {
        ...this.headers(false),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    })
  }

  async listCategories(): Promise<string[]> {
    const path = this.dataPath()
    const res = await this.fetchContents(path)
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`列出分类失败: ${res.status}`)
    const body = (await res.json()) as Array<{ name: string; type: string }>
    const names = body.filter((x) => x.type === 'dir').map((x) => x.name)
    const preferred = ['每日待办', '团队事项', '与产品沟通事项']
    const rest = names
      .filter((n) => !preferred.includes(n))
      .sort((a, b) => a.localeCompare(b, 'zh'))
    return [...preferred.filter((n) => names.includes(n)), ...rest]
  }

  async listDateFiles(category: string): Promise<string[]> {
    const path = this.dataPath(category)
    const res = await this.fetchContents(path)
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`列出日期失败: ${res.status}`)
    const body = (await res.json()) as Array<{ name: string; type: string }>
    return body
      .filter((x) => x.type === 'file' && /^\d{4}-\d{2}-\d{2}\.md$/.test(x.name))
      .map((x) => x.name.replace(/\.md$/, ''))
      .sort((a, b) => b.localeCompare(a))
  }

  async getFile(
    category: string,
    ymd: string,
  ): Promise<{ content: string; sha: string } | null> {
    const path = this.dataPath(category, `${ymd}.md`)
    const res = await this.fetchContents(path)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取文件失败: ${res.status}`)
    const body = (await res.json()) as { content: string; encoding: string; sha: string }
    const content = body.encoding === 'base64' ? decodeBase64Utf8(body.content) : body.content
    return { content, sha: body.sha }
  }

  async putFile(
    category: string,
    ymd: string,
    content: string,
    sha?: string,
  ): Promise<{ sha: string }> {
    const path = this.dataPath(category, `${ymd}.md`)
    return this.putPath(path, `chore(${category}): update ${ymd}.md`, content, sha)
  }

  async getMonthArchive(
    category: string,
    month: string,
  ): Promise<{ data: MonthArchive; sha: string } | null> {
    const path = this.dataPath(category, MONTH_DIR, `${month}.json`)
    const res = await this.fetchContents(path)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读取月归档失败: ${res.status}`)
    const body = (await res.json()) as { content: string; encoding: string; sha: string }
    const text = body.encoding === 'base64' ? decodeBase64Utf8(body.content) : body.content
    return { data: parseMonthArchive(JSON.parse(text) as unknown), sha: body.sha }
  }

  async putMonthArchive(
    category: string,
    month: string,
    data: MonthArchive,
    sha?: string,
  ): Promise<{ sha: string }> {
    const path = this.dataPath(category, MONTH_DIR, `${month}.json`)
    const content = `${JSON.stringify(data, null, 2)}\n`
    return this.putPath(path, `chore(${category}): update ${month} month archive`, content, sha)
  }

  /** 日文件保存后同步当月归档中该日任务（不做其它兜底） */
  async syncMonthDay(category: string, ymd: string, tasks: Task[]): Promise<void> {
    const month = monthKeyFromYmd(ymd)
    const existing = await this.getMonthArchive(category, month)
    const base = existing?.data ?? emptyMonthArchive(month)
    if (base.month !== month) throw new Error(`月归档 month 字段不匹配: ${base.month} ≠ ${month}`)
    const next = upsertMonthDay(base, ymd, tasks)
    await this.putMonthArchive(category, month, next, existing?.sha)
  }

  private async putPath(
    path: string,
    message: string,
    content: string,
    sha?: string,
  ): Promise<{ sha: string }> {
    let currentSha = sha
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.putPathOnce(path, message, content, currentSha)
      } catch (e) {
        if (!(e instanceof GithubConflictError) || attempt === 2) throw e
        // 冲突后强制重拉最新 sha（带防缓存），再写
        const latest = await this.fetchContents(path)
        if (latest.status === 404) {
          currentSha = undefined
        } else if (latest.ok) {
          const body = (await latest.json()) as { sha: string }
          currentSha = body.sha
        } else {
          throw e
        }
      }
    }
    throw new GithubConflictError()
  }

  private async putPathOnce(
    path: string,
    message: string,
    content: string,
    sha?: string,
  ): Promise<{ sha: string }> {
    const payload: Record<string, string> = {
      message,
      content: encodeBase64Utf8(content),
      branch: this.cfg.branch,
    }
    if (sha) payload.sha = sha
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (res.status === 409 || res.status === 422) {
      throw new GithubConflictError()
    }
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`保存失败: ${res.status} ${t.slice(0, 200)}`)
    }
    const body = (await res.json()) as { content: { sha: string } }
    return { sha: body.content.sha }
  }
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin)
}

export async function loadConfig(): Promise<AppConfigFile> {
  const res = await fetch('./config.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('无法加载 config.json')
  return (await res.json()) as AppConfigFile
}

/** Simple concurrency pool */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}
