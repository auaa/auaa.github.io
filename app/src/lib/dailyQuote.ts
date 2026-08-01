import { todayYmd } from './date'

/** 「一个」首页；仅 HTTP，GitHub Pages 下直连会被混合内容拦截，需代理 */
const QUOTE_URL = 'http://v3.wufazhuce.com:8000/api/channel/one/0/0'
const CACHE_KEY = 'oneDailyQuote'

export interface DailyQuote {
  content: string
  dateline?: string
}

function pickQuote(raw: unknown): DailyQuote | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // 缓存形态
  if (typeof obj.content === 'string' && obj.content.trim() && !('data' in obj)) {
    return {
      content: obj.content.trim(),
      dateline: typeof obj.dateline === 'string' ? obj.dateline : undefined,
    }
  }

  const data = obj.data
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const list = d.content_list
  if (!Array.isArray(list) || !list.length) return null
  const first = list[0]
  if (!first || typeof first !== 'object') return null
  const forward = (first as Record<string, unknown>).forward
  if (typeof forward !== 'string' || !forward.trim()) return null

  let dateline: string | undefined
  if (typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.date)) {
    dateline = d.date.slice(0, 10)
  } else {
    const weather = d.weather
    if (weather && typeof weather === 'object') {
      const wd = (weather as Record<string, unknown>).date
      if (typeof wd === 'string') dateline = wd
    }
  }

  return { content: forward.trim(), dateline }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`quote ${res.status}`)
  return res.json()
}

/** 「一个」今日短句；优先直连，失败则 CORS/混合内容代理 */
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
