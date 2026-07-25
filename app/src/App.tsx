import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { GithubClient, loadConfig } from './lib/github'
import { decryptTokenWithPassword } from './lib/crypto'
import { LANDING_KEY, todayYmd } from './lib/date'
import { CategoryTabs } from './components/CategoryTabs'
import { BottomNav } from './components/BottomNav'
import { UnlockPanel, UNLOCK_PASSWORD_LS } from './components/UnlockPanel'
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

function Shell({
  children,
  gantt,
  subtitle,
}: {
  children: ReactNode
  gantt?: boolean
  subtitle?: string
}) {
  return (
    <div className={`app-shell${gantt ? ' shell-gantt' : ''}`}>
      <header className="mb-2">
        <h1 className="title is-5 mb-0">Daily</h1>
        {subtitle ? <p className="subtitle is-7 has-text-grey">{subtitle}</p> : null}
      </header>
      {children}
    </div>
  )
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
    document.documentElement.classList.toggle('mode-gantt', tab === 'gantt')
    return () => document.documentElement.classList.remove('mode-gantt')
  }, [tab])

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
    if (tab === 'today') return <TodayPage client={client} category={category} />
    if (tab === 'history') return <HistoryPage client={client} category={category} />
    return <GanttPage client={client} category={category} />
  }, [client, category, tab])

  if (bootError) {
    return (
      <Shell>
        <div className="notification is-danger is-light is-size-7 py-3">{bootError}</div>
      </Shell>
    )
  }

  if (needUnlock && fileCfg) {
    return (
      <Shell subtitle="口令解锁">
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
        <p className="has-text-grey is-size-7">启动中…</p>
      </Shell>
    )
  }

  return (
    <Shell gantt={tab === 'gantt'} subtitle={`今日 ${todayYmd()}`}>
      <CategoryTabs categories={categories} value={category} onChange={setCategory} />
      <main className="mt-2">
        {body ?? <div className="notification is-warning is-light is-size-7 py-3">请先在仓库创建 data/分类名/</div>}
      </main>
      <BottomNav value={tab} onChange={setTab} />
    </Shell>
  )
}
