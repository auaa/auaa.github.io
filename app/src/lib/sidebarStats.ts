import type { GithubClient } from './github'
import { mapPool } from './github'
import { lastNDays } from './date'
import { inheritOpenTasks, parseMarkdown } from './markdown'
import { monthKeyFromYmd } from './monthArchive'
import { normalizeTaskForCategory, toStatsBucket } from './taskModel'
import type { Task } from '../types'

export type SidebarStatsCounts = { planned: number; started: number; completed: number }

export function emptyStatsCounts(): SidebarStatsCounts {
  return { planned: 0, started: 0, completed: 0 }
}

export function countByStatus(tasks: Task[]): SidebarStatsCounts {
  const counts = emptyStatsCounts()
  for (const t of tasks) {
    const bucket = toStatsBucket(t.status)
    if (bucket) counts[bucket]++
  }
  return counts
}

export function mergeCounts(a: SidebarStatsCounts, b: SidebarStatsCounts): SidebarStatsCounts {
  return {
    planned: a.planned + b.planned,
    started: a.started + b.started,
    completed: a.completed + b.completed,
  }
}

export function completionRate(counts: SidebarStatsCounts): number | null {
  const total = counts.planned + counts.started + counts.completed
  if (total <= 0) return null
  return counts.completed / total
}

/**
 * 单分类「今日」任务：有当日 md 用 md；否则与 TodayPage 相同，继承前一日未完成（未落盘）。
 */
async function loadCategoryTodayTasks(
  client: GithubClient,
  category: string,
  ymd: string,
): Promise<Task[]> {
  const file = await client.getFile(category, ymd)
  if (file) return parseMarkdown(file.content, category)

  const dates = await client.listDateFiles(category)
  const prev = dates.find((d) => d < ymd)
  if (!prev) return []
  const prevFile = await client.getFile(category, prev)
  if (!prevFile) return []
  return inheritOpenTasks(parseMarkdown(prevFile.content, category), category)
}

/** 今天：各分类当日 md 聚合；无当日文件时计入未落盘继承任务 */
export async function loadTodayStatsCounts(
  client: GithubClient,
  categories: string[],
  ymd: string,
): Promise<SidebarStatsCounts> {
  const parts = await mapPool(categories, 4, async (category) =>
    countByStatus(await loadCategoryTodayTasks(client, category, ymd)),
  )
  return parts.reduce(mergeCounts, emptyStatsCounts())
}

/** 近 n 日完成率：月归档聚合；无任务日为 null */
export async function loadCompletionRates(
  client: GithubClient,
  categories: string[],
  n: number,
  endYmd: string,
): Promise<Array<number | null>> {
  const days = lastNDays(n, endYmd)
  const monthKeys = [...new Set(days.map(monthKeyFromYmd))]

  const perCategory = await mapPool(categories, 3, async (category) => {
    const dayTasks: Record<string, Task[]> = {}
    for (const month of monthKeys) {
      const file = await client.getMonthArchive(category, month)
      const daysMap = file?.data.days ?? {}
      for (const [d, list] of Object.entries(daysMap)) {
        dayTasks[d] = list.map((t) => normalizeTaskForCategory(t, category))
      }
    }
    return dayTasks
  })

  return days.map((ymd) => {
    let counts = emptyStatsCounts()
    for (const dayTasks of perCategory) {
      counts = mergeCounts(counts, countByStatus(dayTasks[ymd] ?? []))
    }
    return completionRate(counts)
  })
}

export async function loadSidebarStats(
  client: GithubClient,
  categories: string[],
  ymd: string,
): Promise<{ today: SidebarStatsCounts; rates: Array<number | null> }> {
  const [today, rates] = await Promise.all([
    loadTodayStatsCounts(client, categories, ymd),
    loadCompletionRates(client, categories, 7, ymd),
  ])
  if (rates.length) rates[rates.length - 1] = completionRate(today)
  return { today, rates }
}
