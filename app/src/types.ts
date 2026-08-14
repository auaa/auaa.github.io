export type TaskStatus =
  | 'planned'
  | 'started'
  | 'completed'
  | 'transferred'
  | 'assigned'
  | 'processed'
  | 'accepted'
  | 'cancelled'

export type TaskPriority = 1 | 2 | 3

export interface Task {
  id: string
  title: string
  status: TaskStatus
  /** 规划时间 yyyy-MM-dd HH:mm:ss */
  plannedAt: string
  /** 开始时间（个人进行中）yyyy-MM-dd HH:mm:ss */
  startedAt?: string
  /** 结束/完成时间（个人已完成）yyyy-MM-dd HH:mm:ss */
  completedAt?: string
  /** 团队：已下发时间 */
  assignedAt?: string
  /** 团队：已处理时间 */
  processedAt?: string
  /** 团队：已验收时间 */
  acceptedAt?: string
  /** 优先级，可选 */
  priority?: TaskPriority
  /** 详情，可选 */
  detail?: string
  /** 期望完成日期 YYYY-MM-DD，可选 */
  dueAt?: string
  /**
   * 责任人 / 转办人：
   * - 团队事项：责任人
   * - 个人已转处理：转办时缓存的责任人
   */
  assignee?: string
}

export interface TaskDraft {
  title: string
  priority?: TaskPriority
  detail?: string
  dueAt?: string
  /** 新建时选择的分类 */
  category?: string
  /** 团队事项新建时可选责任人 */
  assignee?: string
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
  transferred: '已转处理',
  assigned: '已下发',
  processed: '已处理',
  accepted: '已验收',
  cancelled: '已取消',
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
