export type TaskStatus = 'planned' | 'started' | 'completed'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  plannedAt: string
  startedAt?: string
  completedAt?: string
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

export type TabId = 'today' | 'history' | 'gantt'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  planned: '规划中',
  started: '进行中',
  completed: '已完成',
}
