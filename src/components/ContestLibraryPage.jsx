import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { fetchContestArchive } from '../api.js';
import {
  PLATFORMS,
  formatContestDate,
  formatNumber,
  tierFor,
} from '../lib/platforms.js';
import { LuoguTopicLibrary } from './LuoguTopicLibrary.jsx';
import { PlatformMark } from './PlatformMark.jsx';

const PAGE_SIZE = 20;
const MIN_COLUMNS = 8;
const MAX_COLUMNS = 16;
const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
const LIBRARY_PLATFORMS = ['codeforces', 'atcoder', 'luogu'];

const contestArchiveCache = new Map();

const CATEGORY_OPTIONS = {
  codeforces: [
    ['div1', 'Div. 1'],
    ['div2', 'Div. 2'],
    ['div3', 'Div. 3'],
    ['div4', 'Div. 4'],
    ['educational', 'Educational'],
    ['global', 'Global'],
    ['other', '其他'],
  ],
  atcoder: [
    ['abc', 'ABC'],
    ['arc', 'ARC'],
    ['agc', 'AGC'],
    ['ahc', 'AHC'],
    ['joi', 'JOI'],
    ['jag', 'JAG'],
    ['past', 'PAST'],
    ['other', '其他'],
  ],
};

function problemKey(platform, problem) {
  if (platform === 'codeforces') return problem.id || problem.problemId;
  if (platform === 'atcoder') return problem.id || problem.problemId;
  return problem.id;
}

function baseColumn(platform, index) {
  const value = String(index || '').trim();
  if (!value) return '';
  if (platform === 'atcoder' && /^ex$/i.test(value)) return 'H';
  const match = value.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : '';
}

function difficultyLabel(platform, difficulty) {
  if (difficulty == null) return '—';
  if (platform === 'luogu') return tierFor(platform, difficulty).short;
  return String(difficulty);
}

function buildCells(platform, problems) {
  const cells = new Map();
  for (const problem of problems) {
    const column = baseColumn(platform, problem.index);
    if (!column) continue;
    if (!cells.has(column)) cells.set(column, []);
    cells.get(column).push(problem);
  }
  return cells;
}

function buildSolvedSet(platform, data) {
  const solved = new Set();
  const attempted = new Set();
  for (const problem of data?.solved || []) {
    solved.add(problemKey(platform, problem));
  }
  for (const problem of data?.attempted || []) {
    attempted.add(problemKey(platform, problem));
  }
  return { solved, attempted };
}

function MatrixSkeleton() {
  return (
    <div className="contest-matrix-card card">
      <div className="contest-matrix-skeleton">
        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div className="contest-matrix-skeleton__row" key={row}>
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContestLibraryPage({ dataByPlatform, onOpenManual }) {
  const [platform, setPlatform] = useState('codeforces');
  const [archive, setArchive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [topicReloadToken, setTopicReloadToken] = useState(0);
  const [luoguTotal, setLuoguTotal] = useState(null);

  useEffect(() => {
    if (platform === 'luogu') {
      setArchive(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const cached = contestArchiveCache.get(platform);

    if (cached) {
      setArchive(cached);
      setLoading(false);
      setError(null);
      return () => controller.abort();
    }

    setArchive(null);
    setLoading(true);
    setError(null);

    fetchContestArchive(platform, {
      page,
      signal: controller.signal,
    })
      .then((payload) => {
        contestArchiveCache.set(platform, payload);
        setArchive(payload);
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [platform, page, reloadToken]);

  useEffect(() => {
    setPage(1);
  }, [query, category, hideCompleted]);

  const { solved, attempted } = useMemo(
    () => buildSolvedSet(platform, dataByPlatform?.[platform]),
    [platform, dataByPlatform],
  );

  const allContests = archive?.contests || [];
  const platformMeta = PLATFORMS[platform];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allContests.filter((contest) => {
      if (q) {
        const haystack = `${contest.name} ${contest.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (
        category !== 'all' &&
        !(contest.categories || []).includes(category)
      ) {
        return false;
      }

      if (hideCompleted) {
        const complete =
          contest.problems.length > 0 &&
          contest.problems.every((problem) =>
            solved.has(problemKey(platform, problem)),
          );
        if (complete) return false;
      }

      return true;
    });
  }, [allContests, query, category, hideCompleted, solved, platform]);

  const clientTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );
  const totalPages =
    platform === 'luogu' ? archive?.totalPages || 1 : clientTotalPages;
  const safePage = Math.min(page, totalPages);
  const pageContests =
    platform === 'luogu'
      ? filtered
      : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns = useMemo(() => {
    let maxIndex = MIN_COLUMNS - 1;

    for (const contest of pageContests) {
      for (const problem of contest.problems) {
        const column = baseColumn(platform, problem.index);
        const index = COLUMN_LETTERS.indexOf(column);
        if (index > maxIndex) maxIndex = index;
      }
    }

    return COLUMN_LETTERS.slice(0, Math.min(MAX_COLUMNS, maxIndex + 1));
  }, [pageContests, platform]);

  const switchPlatform = (nextPlatform) => {
    if (nextPlatform === platform) return;
    setArchive(null);
    setLoading(true);
    setPlatform(nextPlatform);
    setPage(1);
    setCategory(nextPlatform === 'atcoder' ? 'abc' : 'all');
    setQuery('');
    setHideCompleted(false);
  };

  const reload = () => {
    if (platform === 'luogu') {
      setTopicReloadToken((value) => value + 1);
      return;
    }
    contestArchiveCache.delete(platform);
    setReloadToken((value) => value + 1);
  };

  const goToPage = (nextPage) => {
    const target = Math.max(1, Math.min(totalPages, nextPage));
    if (target !== page) {
      if (platform === 'luogu') {
        setArchive(null);
        setLoading(true);
      }
      setPage(target);
    }
  };

  const pageStart =
    platform === 'luogu'
      ? ((archive?.page || 1) - 1) * (archive?.perPage || PAGE_SIZE)
      : (safePage - 1) * PAGE_SIZE;

  const resultLabel =
    platform === 'luogu'
      ? `本页 ${filtered.length} 场`
      : `${formatNumber(filtered.length)} 场匹配`;

  const metaNote =
    platform === 'luogu'
      ? '洛谷题库按比赛分页加载，只展示已结束且题目公开的比赛。'
      : platform === 'codeforces'
        ? '按 Codeforces 比赛归档，覆盖完整 Problemset。'
        : '按 AtCoder 比赛归档，难度来自 AtCoder Problems。';

  return (
    <div className="page contest-library-page">
      <section className="library-heading">
        <div>
          <span className="card-kicker">
            <Sparkles size={13} />
            {platform === 'luogu' ? 'PROBLEM ARCHIVE' : 'CONTEST LIBRARY'}
          </span>
          <h1>{platform === 'luogu' ? '洛谷主题库' : '比赛题库'}</h1>
          <p>
            {platform === 'luogu'
              ? '洛谷不按比赛归档，直接浏览公共主题库；支持题号、题目名、难度和题目类型筛选。'
              : '像 CFTracker 和 AtCoder Problems 一样，按比赛浏览整场题单。点比赛名进入比赛，点题目标题直接跳转原题。'}
          </p>
        </div>
        <div className="library-heading__actions">
          <button type="button" className="ghost-button" onClick={onOpenManual}>
            <Plus size={16} />
            手动补题
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            重新加载
          </button>
        </div>
      </section>

      <div className="library-tabs" role="tablist" aria-label="题库平台">
        {LIBRARY_PLATFORMS.map((item) => (
          <button
            type="button"
            key={item}
            className={item === platform ? 'is-active' : ''}
            onClick={() => switchPlatform(item)}
            role="tab"
            aria-selected={item === platform}
          >
            <PlatformMark platform={item} size="sm" />
            <span>
              <strong>{PLATFORMS[item].name}</strong>
              <small>
                {item === 'luogu'
                  ? '主题库'
                  : 'Contests'}
              </small>
            </span>
            {item === 'luogu' && luoguTotal != null ? (
              <em>{formatNumber(luoguTotal)}</em>
            ) : archive && item === platform ? (
              <em>{formatNumber(archive.total)}</em>
            ) : null}
          </button>
        ))}
      </div>

      {platform === 'luogu' ? (
        <LuoguTopicLibrary
          data={dataByPlatform?.luogu}
          reloadToken={topicReloadToken}
          onTotalChange={setLuoguTotal}
        />
      ) : (
        <>
      <section className="card library-toolbar">
        <div className="library-toolbar__top">
          <label className="search-box library-search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              placeholder={
                platform === 'luogu'
                  ? '搜索当前页比赛名或 ID…'
                  : '搜索比赛名或 ID…'
              }
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="search-clear"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
              >
                ×
              </button>
            ) : null}
          </label>

          <label className="library-switch">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(event) => setHideCompleted(event.target.checked)}
            />
            <span className="library-switch__track">
              <span />
            </span>
            隐藏已完成比赛
          </label>

          <div className="library-count">
            <strong>{resultLabel}</strong>
            <span>{metaNote}</span>
          </div>
        </div>

        <div className="library-filters">
          <div className="library-category-tabs">
            <button
              type="button"
              className={category === 'all' ? 'is-active' : ''}
              onClick={() => setCategory('all')}
            >
              全部
            </button>
            {CATEGORY_OPTIONS[platform].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={category === value ? 'is-active' : ''}
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="library-page-mini">
            <span>
              第 {safePage} / {totalPages} 页
            </span>
            <button
              type="button"
              className="icon-button"
              disabled={safePage <= 1}
              onClick={() => goToPage(safePage - 1)}
              aria-label="上一页"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="icon-button"
              disabled={safePage >= totalPages}
              onClick={() => goToPage(safePage + 1)}
              aria-label="下一页"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {error && !archive ? (
        <div className="card page-error-state">
          <span className="page-error-state__icon">
            <AlertCircle size={25} />
          </span>
          <span className="card-kicker">LIBRARY FAILED</span>
          <h1>这场比赛题库没有加载出来</h1>
          <p>{error.message}</p>
          <div className="page-error-state__actions">
            <button type="button" className="primary-button" onClick={reload}>
              <RefreshCw size={16} />
              重新加载
            </button>
          </div>
        </div>
      ) : loading && !archive ? (
        <MatrixSkeleton />
      ) : (
        <section className="contest-matrix-card card">
          <div className="contest-matrix-meta">
            <div>
              <span className="card-kicker">
                <CalendarDays size={13} />
                {platformMeta.name.toUpperCase()} CONTEST TABLE
              </span>
              <p>
                {platform === 'luogu'
                  ? `第 ${safePage} 页 · 共 ${formatNumber(archive?.totalCount || 0)} 场`
                  : `${resultLabel} · 共 ${formatNumber(archive?.total || 0)} 场`}
              </p>
            </div>
            <div className="contest-matrix-legend">
              <span>
                <i className="matrix-status matrix-status--solved" />
                已通过
              </span>
              <span>
                <i className="matrix-status matrix-status--attempted" />
                尝试过
              </span>
              <span>
                <i className="matrix-status matrix-status--todo" />
                未做
              </span>
            </div>
          </div>

          <div className="contest-matrix-scroll">
            <table
              className="contest-matrix"
              style={{
                minWidth: `${42 + 220 + columns.length * 128}px`,
              }}
            >
              <thead>
                <tr>
                  <th className="matrix-index">#</th>
                  <th className="matrix-contest-head">比赛</th>
                  {columns.map((column) => (
                    <th key={column} className="matrix-problem-head">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageContests.map((contest, index) => {
                  const cells = buildCells(platform, contest.problems);
                  const solvedCount = contest.problems.filter((problem) =>
                    solved.has(problemKey(platform, problem)),
                  ).length;
                  const complete =
                    contest.problems.length > 0 &&
                    solvedCount === contest.problems.length;

                  return (
                    <tr key={`${platform}-${contest.id}`}>
                      <td className="matrix-index">{pageStart + index + 1}</td>
                      <td className="matrix-contest-cell">
                        <a
                          href={contest.url}
                          target="_blank"
                          rel="noreferrer"
                          className="matrix-contest-link"
                          title={contest.name}
                        >
                          {contest.name}
                          <ExternalLink size={11} />
                        </a>
                        <div className="matrix-contest-meta">
                          <span>
                            {contest.startTime
                              ? formatContestDate(contest.startTime)
                              : '日期未知'}
                          </span>
                          <span
                            className={`matrix-progress${
                              complete ? ' is-complete' : ''
                            }`}
                          >
                            {solvedCount}/{contest.problems.length}
                          </span>
                        </div>
                      </td>

                      {columns.map((column) => {
                        const problems = cells.get(column) || [];
                        if (!problems.length) {
                          return (
                            <td
                              className="matrix-problem-cell is-empty"
                              key={column}
                            />
                          );
                        }

                        return (
                          <td className="matrix-problem-cell" key={column}>
                            {problems.map((problem) => {
                              const key = problemKey(platform, problem);
                              const isSolved = solved.has(key);
                              const isAttempted =
                                !isSolved && attempted.has(key);
                              const state = isSolved
                                ? 'solved'
                                : isAttempted
                                  ? 'attempted'
                                  : 'todo';
                              const tier = tierFor(
                                platform,
                                problem.difficulty,
                              );

                              return (
                                <a
                                  href={problem.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`matrix-problem is-${state}`}
                                  key={key}
                                  title={`${problem.index}. ${problem.title} · ${difficultyLabel(platform, problem.difficulty)}`}
                                >
                                  <span className="matrix-problem__top">
                                    <i
                                      className={`matrix-status matrix-status--${state}`}
                                    />
                                    {String(problem.index).length > 1 ? (
                                      <span className="matrix-problem__index">
                                        {problem.index}
                                      </span>
                                    ) : null}
                                    <span className="matrix-problem__name">
                                      {problem.title}
                                    </span>
                                  </span>
                                  <span
                                    className="matrix-problem__difficulty"
                                    style={{ color: tier.color }}
                                  >
                                    {difficultyLabel(
                                      platform,
                                      problem.difficulty,
                                    )}
                                  </span>
                                </a>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!pageContests.length ? (
            <div className="explorer-empty">
              <span>
                <Check size={20} />
              </span>
              <strong>没有符合条件的比赛</strong>
              <p>
                清空搜索、类别或「隐藏已完成比赛」后再看看。
              </p>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                  setHideCompleted(false);
                }}
              >
                清除筛选
              </button>
            </div>
          ) : null}

          <div className="contest-matrix-footer">
            <span>
              {platform === 'luogu'
                ? '比赛详情按页加载，已结束比赛才会显示。'
                : '横向滚动查看更多题号；点击比赛或题目在新标签页打开。'}
            </span>
            <div className="library-pagination">
              <button
                type="button"
                className="icon-button"
                disabled={safePage <= 1}
                onClick={() => goToPage(safePage - 1)}
                aria-label="上一页"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className="icon-button"
                disabled={safePage >= totalPages}
                onClick={() => goToPage(safePage + 1)}
                aria-label="下一页"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
