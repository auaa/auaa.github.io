export type TaskStatus = 'planned' | 'started' | 'completed'

export type TaskPriority = 1 | 2 | 3

export interface Task {
  id: string
  title: string
  status: TaskStatus
  plannedAt: string
  startedAt?: string
  completedAt?: string
  /** 优先级，可选 */
  priority?: TaskPriority
  /** 详情，可选 */
  detail?: string
  /** 期望完成日期 YYYY-MM-DD，可选 */
  dueAt?: string
}

export interface TaskDraft {
  title: string
  priority?: TaskPriority
  detail?: string
  dueAt?: string
}

export interface TokenVault {
  v: 1
  salt: string
  iv: string
  ciphertext: string
  iterations: number
}

/** Stored in config.json (public) */
export interface AppConfigFile {
  github: {
    owner: string
    repo: string
    branch: string
    dataPath: string
    tokenVault: TokenVault
  }
}

/** In-memory after unlock */
export interface GithubRuntimeConfig {
  owner: string
  repo: string
  branch: string
  dataPath: string
  token: string
}

export type TabId = 'today' | 'history' | 'calendar' | 'gantt'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  planned: '规划中',
  started: '进行中',
  completed: '已完成',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
}

export const TAB_LABEL: Record<TabId, string> = {
  today: '今日',
  history: '历史',
  calendar: '日历',
  gantt: '甘特图',
}
