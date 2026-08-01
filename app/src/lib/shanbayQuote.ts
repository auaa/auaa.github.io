import { todayYmd } from './date'

const QUOTE_URL = 'https://apiv3.shanbay.com/weapps/dailyquote/quote'
const CACHE_KEY = 'shanbayDailyQuote'

export interface ShanbayQuote {
  content: string
  translation: string
  assign_date?: string
}

function pickQuote(raw: unknown): ShanbayQuote | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  const translation = typeof obj.translation === 'string' ? obj.translation.trim() : ''
  if (!content && !translation) return null
  return {
    content,
    translation,
    assign_date: typeof obj.assign_date === 'string' ? obj.assign_date : undefined,
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`quote ${res.status}`)
  return res.json()
}

/** 扇贝每日一句；直连失败时走 CORS 代理（GitHub Pages 场景） */
export async function fetchShanbayQuote(): Promise<ShanbayQuote | null> {
  const today = todayYmd()
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = pickQuote(JSON.parse(cached) as unknown)
      if (parsed && (!parsed.assign_date || parsed.assign_date === today)) return parsed
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
