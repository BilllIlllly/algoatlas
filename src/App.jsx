import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  LayoutDashboard,
  Moon,
  Plus,
  Settings2,
  Sparkles,
  Sun,
} from 'lucide-react';
import { fetchPlatform } from './api.js';
import { AccountModal } from './components/AccountModal.jsx';
import { ContestLibraryPage } from './components/ContestLibraryPage.jsx';
import { LuoguCookieModal } from './components/LuoguCookieModal.jsx';
import { ManualProblemModal } from './components/ManualProblemModal.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { Overview } from './components/Overview.jsx';
import { PlatformPage } from './components/PlatformPage.jsx';
import { PLATFORMS, PLATFORM_ORDER } from './lib/platforms.js';
import {
  accountsEqual,
  hasAnyAccount,
  normalizeAccounts,
  totalAccountCount,
} from './lib/accounts.js';
import {
  MANUAL_STORAGE_KEY,
  addManualEntry,
  applyManualProblems,
  normalizeManual,
  removeManualEntry,
} from './lib/manual.js';
import { mergeAccountResults } from './lib/merge.js';

const STORAGE_KEY = 'algatlas.accounts.v1';
const THEME_KEY = 'algatlas.theme';

function readInitialTheme() {
  const current = document.documentElement.dataset.theme;
  if (current === 'dark' || current === 'light') return current;

  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Ignore storage failures.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function readStoredAccounts() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeAccounts();
    return normalizeAccounts(JSON.parse(raw));
  } catch {
    return normalizeAccounts();
  }
}

function readStoredManualProblems() {
  try {
    const raw = window.localStorage.getItem(MANUAL_STORAGE_KEY);
    if (!raw) return normalizeManual();
    return normalizeManual(JSON.parse(raw));
  } catch {
    return normalizeManual();
  }
}

export default function App() {
  const [accounts, setAccounts] = useState(readStoredAccounts);
  const [manualProblems, setManualProblems] = useState(readStoredManualProblems);
  const [accountResults, setAccountResults] = useState({});
  const [loadingByPlatform, setLoadingByPlatform] = useState({});
  const [errors, setErrors] = useState({});
  const [view, setView] = useState('overview');
  const [theme, setTheme] = useState(readInitialTheme);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [luoguCookieModalOpen, setLuoguCookieModalOpen] = useState(false);
  const [manualDefaultPlatform, setManualDefaultPlatform] =
    useState('codeforces');
  const [lastSync, setLastSync] = useState(null);

  const controllers = useRef({});
  const requestIds = useRef({});
  const initialSyncStarted = useRef(false);

  const syncPlatform = useCallback(
    async (platform, handles, { force = false } = {}) => {
      const handleList = (handles || []).filter(Boolean);
      if (!handleList.length) return;

      controllers.current[platform]?.abort();
      const controller = new AbortController();
      controllers.current[platform] = controller;

      const requestId = (requestIds.current[platform] || 0) + 1;
      requestIds.current[platform] = requestId;

      setLoadingByPlatform((prev) => ({ ...prev, [platform]: true }));
      setErrors((prev) => ({ ...prev, [platform]: null }));

      const results = [];
      const failures = [];

      try {
        // Sequential on purpose: Codeforces rate-limits bursts and this also
        // keeps error attribution readable when several accounts are tracked.
        for (const handle of handleList) {
          try {
            const data = await fetchPlatform(platform, handle, {
              force,
              signal: controller.signal,
            });
            results.push({ handle, data, error: null });
          } catch (error) {
            if (error.name === 'AbortError') return;
            failures.push({ handle, error });
          }
        }

        if (requestIds.current[platform] !== requestId) return;

        // If every account fails during a refresh, keep the last good snapshot
        // instead of wiping the dashboard.
        if (results.length > 0) {
          setAccountResults((prev) => ({ ...prev, [platform]: results }));
        }

        if (failures.length) {
          const failureText = failures
            .map(({ handle, error }) => `@${handle}：${error.message}`)
            .join('；');
          setErrors((prev) => ({
            ...prev,
            [platform]: {
              message:
                results.length === 0
                  ? failureText
                  : `部分账号同步失败 — ${failureText}`,
              failures: failures.map(({ handle, error }) => ({
                handle,
                message: error.message,
                code: error.code,
              })),
            },
          }));
        }

        if (results.length) setLastSync(Date.now());
      } finally {
        if (requestIds.current[platform] === requestId) {
          setLoadingByPlatform((prev) => ({ ...prev, [platform]: false }));
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (initialSyncStarted.current) return;
    initialSyncStarted.current = true;

    for (const platform of PLATFORM_ORDER) {
      if (accounts[platform]?.length) {
        syncPlatform(platform, accounts[platform]);
      }
    }
  }, [accounts, syncPlatform]);

  useEffect(
    () => () => {
      for (const controller of Object.values(controllers.current)) {
        controller.abort();
      }
    },
    [],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#f5f7fb');

    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  useEffect(() => {
    const names = {
      overview: '总览',
      problems: '题库',
      luogu: '洛谷',
      codeforces: 'Codeforces',
      atcoder: 'AtCoder',
    };
    document.title = `AlgoAtlas · ${names[view] || 'OJ 题迹'}`;
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MANUAL_STORAGE_KEY,
        JSON.stringify(manualProblems),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [manualProblems]);

  const dataByPlatform = useMemo(() => {
    const merged = {};
    for (const platform of PLATFORM_ORDER) {
      const accountData = mergeAccountResults(
        platform,
        accountResults[platform] || [],
      );
      const withManual = applyManualProblems(
        platform,
        accountData,
        manualProblems[platform] || [],
      );
      if (withManual) merged[platform] = withManual;
    }
    return merged;
  }, [accountResults, manualProblems]);

  const addManualProblem = useCallback((platform, entry) => {
    setManualProblems((prev) => ({
      ...prev,
      [platform]: addManualEntry(prev[platform] || [], platform, entry),
    }));
  }, []);

  const removeManualProblem = useCallback((platform, problemKey) => {
    setManualProblems((prev) => ({
      ...prev,
      [platform]: removeManualEntry(prev[platform] || [], platform, problemKey),
    }));
  }, []);

  const openManualModal = (platform) => {
    setManualDefaultPlatform(
      PLATFORM_ORDER.includes(platform) ? platform : 'codeforces',
    );
    setManualModalOpen(true);
  };

  const configured = useMemo(
    () => PLATFORM_ORDER.filter((platform) => accounts[platform]?.length),
    [accounts],
  );
  const loadingAny = PLATFORM_ORDER.some(
    (platform) => accounts[platform]?.length && loadingByPlatform[platform],
  );
  const hasLoadedAny = PLATFORM_ORDER.some(
    (platform) => dataByPlatform[platform],
  );
  const hasErrors = PLATFORM_ORDER.some(
    (platform) => accounts[platform]?.length && errors[platform],
  );
  const accountTotal = totalAccountCount(accounts);

  const refreshAll = () => {
    for (const platform of PLATFORM_ORDER) {
      if (accounts[platform]?.length) {
        syncPlatform(platform, accounts[platform], { force: true });
      }
    }
  };

  const retryPlatform = (platform) => {
    if (!accounts[platform]?.length) {
      setAccountModalOpen(true);
      return;
    }
    syncPlatform(platform, accounts[platform], { force: true });
  };

  const saveAccounts = (values) => {
    const next = normalizeAccounts(values);
    const previous = accounts;

    setAccounts(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode / disabled storage should not block the dashboard.
    }
    setAccountModalOpen(false);

    let changed = false;
    for (const platform of PLATFORM_ORDER) {
      if (accountsEqual(platform, previous[platform], next[platform])) continue;
      changed = true;

      controllers.current[platform]?.abort();
      requestIds.current[platform] = (requestIds.current[platform] || 0) + 1;
      setAccountResults((prev) => ({ ...prev, [platform]: [] }));
      setErrors((prev) => ({ ...prev, [platform]: null }));
      setLoadingByPlatform((prev) => ({ ...prev, [platform]: false }));

      if (next[platform].length) {
        syncPlatform(platform, next[platform]);
      }
    }

    if (changed && !hasAnyAccount(previous)) {
      setView('overview');
    }
  };

  const clearAccounts = () => {
    if (!window.confirm('确定清空所有已连接账号吗？本地保存的追踪配置也会一起移除。')) {
      return;
    }

    for (const platform of PLATFORM_ORDER) {
      controllers.current[platform]?.abort();
      requestIds.current[platform] = (requestIds.current[platform] || 0) + 1;
    }

    setAccounts(normalizeAccounts());
    setAccountResults({});
    setErrors({});
    setLoadingByPlatform({});
    setLastSync(null);
    setAccountModalOpen(false);
    setView('overview');
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const handleNavigate = (nextView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showOnboarding = configured.length === 0;

  return (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true">
        <span className="ambient ambient--one" />
        <span className="ambient ambient--two" />
        <span className="ambient ambient--three" />
      </div>

      <header className="topbar">
        <div className="topbar__inner">
          <button
            type="button"
            className="brand"
            onClick={() => handleNavigate('overview')}
            aria-label="回到总览"
          >
            <span className="brand__mark">
              <Compass size={20} strokeWidth={2.2} />
            </span>
            <span className="brand__text">
              <strong>AlgoAtlas</strong>
              <small>OJ 题迹</small>
            </span>
          </button>

          {!showOnboarding ? (
            <nav className="main-nav" aria-label="主导航">
              <button
                type="button"
                className={view === 'overview' ? 'is-active' : ''}
                onClick={() => handleNavigate('overview')}
              >
                <LayoutDashboard size={15} />
                <span>总览</span>
              </button>
              <button
                type="button"
                className={view === 'problems' ? 'is-active' : ''}
                onClick={() => handleNavigate('problems')}
              >
                <BookOpen size={15} />
                <span>题库</span>
              </button>
              {PLATFORM_ORDER.map((platform) => (
                <button
                  type="button"
                  key={platform}
                  className={view === platform ? 'is-active' : ''}
                  onClick={() => handleNavigate(platform)}
                >
                  <span
                    className={`nav-dot nav-dot--${platform}`}
                    aria-hidden="true"
                  />
                  <span>{PLATFORMS[platform].name}</span>
                  {dataByPlatform[platform] ? (
                    <span className="nav-count">
                      {dataByPlatform[platform].stats?.solvedCount ?? ''}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          ) : (
            <div className="onboarding-nav-note">
              <Sparkles size={14} />
              三站题迹，一处归档
            </div>
          )}

          <div className="topbar__actions">
            <button
              type="button"
              className="icon-button theme-toggle"
              onClick={() =>
                setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
              }
              aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到黑夜模式'}
              title={theme === 'dark' ? '切换到浅色模式' : '切换到黑夜模式'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {!showOnboarding ? (
              <span
                className={`sync-indicator${
                  loadingAny ? ' is-loading' : hasErrors ? ' has-error' : ''
                }`}
              >
                <span />
                {loadingAny
                  ? '同步中'
                  : hasErrors
                    ? '部分失败'
                    : lastSync
                      ? '已同步'
                      : '等待同步'}
              </span>
            ) : null}
            {!showOnboarding ? (
              <button
                type="button"
                className="account-trigger manual-trigger"
                onClick={() => openManualModal(view)}
              >
                <Plus size={16} />
                <span>补题</span>
              </button>
            ) : null}
            <button
              type="button"
              className="account-trigger manage-trigger"
              onClick={() => setAccountModalOpen(true)}
            >
              <Settings2 size={16} />
              <span>管理账号</span>
              {accountTotal ? (
                <span className="account-trigger__count">{accountTotal}</span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {showOnboarding ? (
          <Onboarding onSave={saveAccounts} saving={false} />
        ) : view === 'overview' ? (
          <Overview
            accounts={accounts}
            dataByPlatform={dataByPlatform}
            loadingByPlatform={loadingByPlatform}
            errors={errors}
            lastSync={lastSync}
            onNavigate={handleNavigate}
            onOpenAccounts={() => setAccountModalOpen(true)}
            onOpenManual={() => openManualModal('codeforces')}
            onRefresh={refreshAll}
            onRetryPlatform={retryPlatform}
          />
        ) : view === 'problems' ? (
          <ContestLibraryPage
            dataByPlatform={dataByPlatform}
            onOpenManual={() => openManualModal('codeforces')}
          />
        ) : (
          <PlatformPage
            key={view}
            platform={view}
            accounts={accounts[view]}
            data={dataByPlatform[view]}
            loading={Boolean(loadingByPlatform[view])}
            error={errors[view]}
            onRetry={() => retryPlatform(view)}
            onOpenAccounts={() => setAccountModalOpen(true)}
            onOpenManual={() => openManualModal(view)}
            onOpenCookie={() => setLuoguCookieModalOpen(true)}
            onBack={() => handleNavigate('overview')}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>AlgoAtlas · v0.7</span>
        <span className="app-footer__dot" />
        <span>数据来自洛谷 / Codeforces / AtCoder Problems 公开接口</span>
        <span className="app-footer__dot" />
        <span>{hasLoadedAny ? '持续记录每一次 AC' : 'Built for the long run'}</span>
      </footer>

      <AccountModal
        open={accountModalOpen}
        accounts={accounts}
        onClose={() => setAccountModalOpen(false)}
        onSave={saveAccounts}
        onClear={clearAccounts}
        saving={false}
      />

      <ManualProblemModal
        open={manualModalOpen}
        defaultPlatform={manualDefaultPlatform}
        manualProblems={manualProblems}
        onClose={() => setManualModalOpen(false)}
        onAdd={addManualProblem}
        onRemove={removeManualProblem}
      />

      <LuoguCookieModal
        open={luoguCookieModalOpen}
        onClose={() => setLuoguCookieModalOpen(false)}
        onSaved={() => {
          if (accounts.luogu?.length) {
            syncPlatform('luogu', accounts.luogu, { force: true });
          }
        }}
      />
    </div>
  );
}
