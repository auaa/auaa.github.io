import { todayYmd } from './date'

/** 金山词霸每日一句（HTTPS，避免 Pages 混合内容拦截） */
const QUOTE_URL = 'https://open.iciba.com/dsapi/'
const CACHE_KEY = 'icibaDailyQuote'

export interface DailyQuote {
  content: string
  translation: string
  dateline?: string
}

function pickQuote(raw: unknown): DailyQuote | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  // 接口中文在 note；缓存里用 translation；接口自带 translation 是产品名需忽略
  let translation = ''
  if (typeof obj.note === 'string' && obj.note.trim()) translation = obj.note.trim()
  else if (typeof obj.translation === 'string') {
    const t = obj.translation.trim()
    if (t && t !== '新版每日一句') translation = t
  }
  if (!content && !translation) return null
  return {
    content,
    translation,
    dateline: typeof obj.dateline === 'string' ? obj.dateline : undefined,
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`quote ${res.status}`)
  return res.json()
}

/** 词霸每日一句；直连失败时走 CORS 代理 */
export async function fetchDailyQuote(): Promise<DailyQuote | null> {
  const today = todayYmd()
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = pickQuote(JSON.parse(cached) as unknown)
      if (parsed && (!parsed.dateline || parsed.dateline === today)) return parsed
    }
  } catch {
    /* ignore */
  }

  let data: unknown
  try {
    data = await fetchJson(QUOTE_URL)
  } catch {
    data = await fetchJson(`https://api.allorigins.win/raw?url=${encodeURIComponent(QUOTE_URL)}`)
  }

  const quote = pickQuote(data)
  if (quote) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(quote))
    } catch {
      /* ignore */
    }
  }
  return quote
}
