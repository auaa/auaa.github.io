import { useEffect, useMemo, useState } from 'react'
import { GithubClient, loadConfig } from './lib/github'
import { LANDING_KEY, todayYmd } from './lib/date'
import { CategoryTabs } from './components/CategoryTabs'
import { BottomNav } from './components/BottomNav'
import { UnlockPanel } from './components/UnlockPanel'
import { TodayPage } from './pages/TodayPage'
import { HistoryPage } from './pages/HistoryPage'
import { GanttPage } from './pages/GanttPage'
import type { AppConfigFile, TabId } from './types'

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

export default function App() {
  const [bootError, setBootError] = useState<string | null>(null)
  const [fileCfg, setFileCfg] = useState<AppConfigFile | null>(null)
  const [needUnlock, setNeedUnlock] = useState(false)
  const [client, setClient] = useState<GithubClient | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<TabId>(initialTab)

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
        setNeedUnlock(true)
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
    if (tab === 'today') return <TodayPage client={client} category={category} />
    if (tab === 'history') return <HistoryPage client={client} category={category} />
    return <GanttPage client={client} category={category} />
  }, [client, category, tab])

  if (bootError) {
    return (
      <div className="app shell">
        <header className="top">
          <h1>Daily</h1>
        </header>
        <div className="panel error">{bootError}</div>
      </div>
    )
  }

  if (needUnlock && fileCfg) {
    return (
      <div className="app shell">
        <header className="top">
          <h1>Daily</h1>
          <p className="muted">口令解锁</p>
        </header>
        <UnlockPanel
          vault={fileCfg.github.tokenVault}
          onUnlocked={(token) => {
            void bootWithToken(fileCfg, token).catch((e) =>
              setBootError(e instanceof Error ? e.message : String(e)),
            )
          }}
        />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="app shell">
        <header className="top">
          <h1>Daily</h1>
        </header>
        <div className="panel">启动中…</div>
      </div>
    )
  }

  return (
    <div className="app shell">
      <header className="top">
        <div>
          <h1>Daily</h1>
          <p className="muted">今日 {todayYmd()} · 上海时区</p>
        </div>
      </header>
      <CategoryTabs categories={categories} value={category} onChange={setCategory} />
      <main className="main">{body ?? <div className="panel">请先在仓库创建 data/分类名/</div>}</main>
      <BottomNav value={tab} onChange={setTab} />
    </div>
  )
}
