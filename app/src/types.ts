export type TaskStatus = 'planned' | 'started' | 'completed'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  plannedAt: string
  startedAt?: string
  completedAt?: string
}

export interface AppConfig {
  github: {
    owner: string
    repo: string
    branch: string
    token: string
    dataPath: string
  }
}

export type TabId = 'today' | 'history' | 'gantt'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  planned: '规划中',
  started: '进行中',
  completed: '已完成',
}
