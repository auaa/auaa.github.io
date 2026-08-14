import type { Task, TaskStatus } from '../types'

export const TEAM_CATEGORY = '团队事项'
export const PERSONAL_CATEGORY = '每日待办'

/** 个人 → 团队：允许「转处理」的状态 */
export function canTransferOut(status: TaskStatus): boolean {
  return status === 'planned' || status === 'started'
}

/** 团队 → 个人：允许「转给我」的状态 */
export function canTakeToSelf(status: TaskStatus): boolean {
  return status === 'planned' || status === 'assigned' || status === 'processed'
}

export const TEAM_ASSIGNEES = ['马力', '周伟', '桂礼显', '杨阳', '邱晓晗'] as const
export type TeamAssignee = (typeof TEAM_ASSIGNEES)[number]

export const PERSONAL_STATUSES: TaskStatus[] = ['planned', 'started', 'completed', 'transferred']
export const TEAM_STATUSES: TaskStatus[] = ['planned', 'assigned', 'processed', 'accepted']

export function isTeamCategory(category: string): boolean {
  return category === TEAM_CATEGORY
}

/** 列表/下拉可用的状态（按分类） */
export function statusesForCategory(category: string): TaskStatus[] {
  return isTeamCategory(category) ? TEAM_STATUSES : ['planned', 'started', 'completed']
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return (
    status === 'completed' ||
    status === 'accepted' ||
    status === 'transferred' ||
    status === 'cancelled'
  )
}

export function isOpenStatus(status: TaskStatus, category: string): boolean {
  if (isTeamCategory(category)) {
    return status === 'planned' || status === 'assigned' || status === 'processed'
  }
  // 已转处理不继承
  return status === 'planned' || status === 'started'
}

/** 已下发及之后必须有责任人 */
export function teamStatusRequiresAssignee(status: TaskStatus): boolean {
  return status === 'assigned' || status === 'processed' || status === 'accepted'
}

const TITLE_ASSIGNEE_RE = /^【([^】]+)】\s*/

/** 从旧标题解析责任人；仅名单内有效 */
export function parseAssigneeFromTitle(title: string): { assignee?: string; title: string } {
  const m = title.match(TITLE_ASSIGNEE_RE)
  if (!m) return { title }
  const name = m[1].trim()
  if (!(TEAM_ASSIGNEES as readonly string[]).includes(name)) return { title }
  return { assignee: name, title: title.slice(m[0].length).trim() }
}

/** 旧三态 → 团队四态（读时） */
export function mapLegacyTeamStatus(status: TaskStatus): TaskStatus {
  if (status === 'started') return 'assigned'
  if (status === 'completed') return 'accepted'
  return status
}

/** 读入后规范化（分类相关） */
export function normalizeTaskForCategory(task: Task, category: string): Task {
  let next = { ...task }
  if (isTeamCategory(category)) {
    next.status = mapLegacyTeamStatus(next.status)
    if (!next.assignee) {
      const parsed = parseAssigneeFromTitle(next.title)
      if (parsed.assignee) {
        next.assignee = parsed.assignee
        next.title = parsed.title
      }
    } else {
      // 已有 assignee 时仍尽量剥掉重复前缀
      const parsed = parseAssigneeFromTitle(next.title)
      if (parsed.assignee === next.assignee) next.title = parsed.title
    }
  }
  return next
}

/** 侧栏三态语义：团队映射；已转处理/已取消不计 */
export function toStatsBucket(status: TaskStatus): 'planned' | 'started' | 'completed' | null {
  if (status === 'transferred' || status === 'cancelled') return null
  if (status === 'planned') return 'planned'
  if (status === 'started' || status === 'assigned' || status === 'processed') return 'started'
  if (status === 'completed' || status === 'accepted') return 'completed'
  return null
}

export function statusColor(status: TaskStatus): string {
  switch (status) {
    case 'planned':
      return '#8590a2'
    case 'started':
    case 'assigned':
      return '#b38600'
    case 'processed':
      return '#0c66e4'
    case 'completed':
    case 'accepted':
      return '#216e4e'
    case 'transferred':
    case 'cancelled':
      return '#626f86'
    default:
      return '#8590a2'
  }
}

export function statusTagColor(
  status: TaskStatus,
): 'default' | 'processing' | 'success' | 'warning' | 'blue' {
  switch (status) {
    case 'planned':
      return 'default'
    case 'started':
    case 'assigned':
      return 'processing'
    case 'processed':
      return 'blue'
    case 'completed':
    case 'accepted':
      return 'success'
    case 'transferred':
    case 'cancelled':
      return 'default'
    default:
      return 'default'
  }
}
