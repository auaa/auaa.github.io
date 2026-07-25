export type TaskStatus = 'planned' | 'started' | 'completed'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  plannedAt: string
  startedAt?: string
  completedAt?: string
}

/** Stored in config.json (public) */
export interface AppConfigFile {
  github: {
    owner: string
    repo: string
    branch: string
    dataPath: string
    /** RSA-OAEP(SHA-256) ciphertext, base64. No plaintext token. */
    tokenEncrypted: string
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
