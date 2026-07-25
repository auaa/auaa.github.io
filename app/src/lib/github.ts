import type { AppConfig } from '../types'

export class GithubConflictError extends Error {
  constructor(message = '远程文件已变更，请刷新后重试') {
    super(message)
    this.name = 'GithubConflictError'
  }
}

export class GithubClient {
  private cfg: AppConfig['github']

  constructor(cfg: AppConfig['github']) {
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

  async listCategories(): Promise<string[]> {
    const path = this.dataPath()
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}?ref=${this.cfg.branch}`, {
      headers: this.headers(false),
    })
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`列出分类失败: ${res.status}`)
    const body = (await res.json()) as Array<{ name: string; type: string }>
    return body.filter((x) => x.type === 'dir').map((x) => x.name).sort((a, b) => a.localeCompare(b, 'zh'))
  }

  async listDateFiles(category: string): Promise<string[]> {
    const path = this.dataPath(category)
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}?ref=${this.cfg.branch}`, {
      headers: this.headers(false),
    })
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
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}?ref=${this.cfg.branch}`, {
      headers: this.headers(false),
    })
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
    const payload: Record<string, string> = {
      message: `chore(${category}): update ${ymd}.md`,
      content: encodeBase64Utf8(content),
      branch: this.cfg.branch,
    }
    if (sha) payload.sha = sha
    const res = await fetch(`${this.base}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify(payload),
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

export async function loadConfig(): Promise<AppConfig> {
  const res = await fetch('./config.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('无法加载 config.json')
  return (await res.json()) as AppConfig
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
