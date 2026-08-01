const TZ = 'Asia/Shanghai'

function partsInShanghai(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const map: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return map
}

/** YYYY-MM-DD in Asia/Shanghai */
export function todayYmd(date = new Date()): string {
  const p = partsInShanghai(date)
  return `${p.year}-${p.month}-${p.day}`
}

/** Asia/Shanghai 本地时间：yyyy-MM-dd HH:mm:ss */
export function nowShanghaiIso(date = new Date()): string {
  const p = partsInShanghai(date)
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`
}

/** 归一化为 yyyy-MM-dd HH:mm:ss（兼容旧 ISO / 仅日期） */
export function normalizeDateTime(raw?: string): string | undefined {
  if (!raw) return undefined
  const full = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/)
  if (full) return `${full[1]} ${full[2]}`
  const day = raw.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (day) return `${day[1]} 00:00:00`
  return raw
}

export function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+08:00`)
}

export function addDaysYmd(ymd: string, delta: number): string {
  const d = ymdToDate(ymd)
  d.setTime(d.getTime() + delta * 86400000)
  return todayYmd(d)
}

/** 过去 n 个日历日（含今天，从旧到新） */
export function lastNDays(n: number, endYmd = todayYmd()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDaysYmd(endYmd, -i))
  return out
}

export function dateKeyFromIso(iso?: string): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

export const LANDING_KEY = 'lastLandingDate'
