import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { GithubClient, loadConfig } from './lib/github'
import { decryptTokenWithPassword } from './lib/crypto'
import { LANDING_KEY, todayYmd } from './lib/date'
import { Sidebar } from './components/Sidebar'
import { UnlockPanel, UNLOCK_PASSWORD_LS } from './components/UnlockPanel'
import { TaskDialog } from './components/TaskDialog'
import { TodayPage } from './pages/TodayPage'
import { HistoryPage } from './pages/HistoryPage'
import { CalendarPage } from './pages/CalendarPage'
import { GanttPage } from './pages/GanttPage'
import type { AppConfigFile, TabId, TaskDraft } from './types'

function initialTab(): TabId {
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
  const [fileCfg, setFileCfg] = useState<AppConfigFile | null>(null)
  const [needUnlock, setNeedUnlock] = useState(false)
  const [client, setClient] = useState<GithubClient | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<TabId>(initialTab)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingCreate, setPendingCreate] = useState<TaskDraft | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cfg = await loadConfig()
        if (!cfg.github?.tokenVault?.ciphertext) {
          throw new Error('config.json 缺少 github.tokenVault，请先运行 scripts/encrypt-token.mjs')
        }
        if (cancelled) return
        setFileCfg(cfg)

        let stored = ''
        try {
          stored = localStorage.getItem(UNLOCK_PASSWORD_LS) || ''
        } catch {
          stored = ''
        }
        if (stored) {
          try {
            const token = await decryptTokenWithPassword(stored, cfg.github.tokenVault)
            if (cancelled) return
            await bootWithToken(cfg, token)
            return
          } catch {
            try {
              localStorage.removeItem(UNLOCK_PASSWORD_LS)
            } catch {
              /* ignore */
            }
          }
        }
        if (!cancelled) setNeedUnlock(true)
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
    setNeedUnlock(false)
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

  if (needUnlock && fileCfg) {
    return (
      <Shell>
        <UnlockPanel
          vault={fileCfg.github.tokenVault}
          onUnlocked={(token) => {
            void bootWithToken(fileCfg, token).catch((e) =>
              setBootError(e instanceof Error ? e.message : String(e)),
            )
          }}
        />
      </Shell>
    )
  }

  if (!client) {
    return (
      <Shell>
        <p className="hint">启动中…</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="app-layout">
        <Sidebar
          tab={tab}
          onTabChange={setTab}
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
          setTab('today')
        }}
      />
    </Shell>
  )
}
