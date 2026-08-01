import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Spin } from 'antd'
import { GithubClient, loadConfig } from './lib/github'
import { decryptTokenWithPassword } from './lib/crypto'
import { LANDING_KEY, todayYmd } from './lib/date'
import { Sidebar } from './components/Sidebar'
import { TaskDialog } from './components/TaskDialog'
import { TodayPage } from './pages/TodayPage'
import { HistoryPage } from './pages/HistoryPage'
import { CalendarPage } from './pages/CalendarPage'
import { GanttPage } from './pages/GanttPage'
import type { AppConfigFile, TabId, TaskDraft } from './types'

/** 临时：默认解锁口令，打开即自动登录（勿用于长期公开环境） */
const DEFAULT_UNLOCK_PASSWORD = 'REDACTED'

const TAB_IDS: TabId[] = ['today', 'history', 'calendar', 'gantt']

function tabFromHash(): TabId | null {
  const raw = location.hash.replace(/^#/, '')
  return TAB_IDS.includes(raw as TabId) ? (raw as TabId) : null
}

function initialTab(): TabId {
  const fromHash = tabFromHash()
  if (fromHash) return fromHash
  const today = todayYmd()
  try {
    const last = localStorage.getItem(LANDING_KEY)
    if (last !== today) {
      localStorage.setItem(LANDING_KEY, today)
      return 'gantt'
    }
  } catch {
    /* ignore */
  }
  return 'today'
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="app-shell is-wide">{children}</div>
}

export default function App() {
  const [bootError, setBootError] = useState<string | null>(null)
  const [client, setClient] = useState<GithubClient | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<TabId>(initialTab)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingCreate, setPendingCreate] = useState<TaskDraft | null>(null)

  function changeTab(next: TabId) {
    setTab(next)
    if (location.hash.replace(/^#/, '') !== next) {
      location.hash = next
    }
  }

  useEffect(() => {
    // 首次进入无 hash 时补上，用 replace 避免多一条历史
    if (!tabFromHash()) {
      history.replaceState(null, '', `#${tab}`)
    }
    const onHashChange = () => {
      const fromHash = tabFromHash()
      if (fromHash) setTab(fromHash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cfg = await loadConfig()
        if (!cfg.github?.tokenVault?.ciphertext) {
          throw new Error('config.json 缺少 github.tokenVault，请先运行 scripts/encrypt-token.mjs')
        }
        const token = await decryptTokenWithPassword(DEFAULT_UNLOCK_PASSWORD, cfg.github.tokenVault)
        if (cancelled) return
        await bootWithToken(cfg, token)
      } catch (e) {
        if (!cancelled) setBootError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function bootWithToken(cfg: AppConfigFile, token: string) {
    const c = new GithubClient({
      owner: cfg.github.owner,
      repo: cfg.github.repo,
      branch: cfg.github.branch,
      dataPath: cfg.github.dataPath,
      token,
    })
    const cats = await c.listCategories()
    setClient(c)
    setCategories(cats)
    setCategory(cats[0] ?? '')
  }

  const body = useMemo(() => {
    if (!client || !category) return null
    if (tab === 'today') {
      return (
        <TodayPage
          client={client}
          category={category}
          pendingCreate={pendingCreate}
          onPendingCreateHandled={() => setPendingCreate(null)}
        />
      )
    }
    if (tab === 'history') return <HistoryPage client={client} category={category} />
    if (tab === 'calendar') return <CalendarPage client={client} category={category} />
    return <GanttPage client={client} category={category} />
  }, [client, category, tab, pendingCreate])

  if (bootError) {
    return (
      <Shell>
        <div className="alert alert-danger">{bootError}</div>
      </Shell>
    )
  }

  if (!client) {
    return (
      <Shell>
        <div className="boot-loading">
          <Spin size="large" />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="app-layout">
        <Sidebar
          tab={tab}
          onTabChange={changeTab}
          categories={categories}
          category={category}
          onCategoryChange={setCategory}
          onCreate={() => setCreateOpen(true)}
          dateLabel={todayYmd()}
        />
        <main className="app-main">
          {body ?? <div className="alert alert-warn">请先在仓库创建 data/分类名/</div>}
        </main>
      </div>

      <TaskDialog
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(draft) => {
          setPendingCreate(draft)
          changeTab('today')
        }}
      />
    </Shell>
  )
}
