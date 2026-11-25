import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react';
import { fetchLuoguProblems } from '../api.js';
import {
  LUOGU_TIERS,
  formatNumber,
  tierFor,
} from '../lib/platforms.js';

const TYPE_OPTIONS = [
  ['', '全部'],
  ['P', 'P'],
  ['B', 'B'],
  ['CF', 'CF'],
  ['AT', 'AT'],
  ['SP', 'SP'],
  ['UVA', 'UVA'],
];

function problemKey(problem) {
  return problem.id || problem.problemId;
}

function formatAccepted(problem) {
  if (problem.totalAccepted == null) return '—';
  return formatNumber(problem.totalAccepted);
}

export function LuoguTopicLibrary({
  data,
  reloadToken = 0,
  onTotalChange,
}) {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  const solved = useMemo(
    () => new Set((data?.solved || []).map(problemKey)),
    [data],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [difficulty, type]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchLuoguProblems({
      page,
      keyword: appliedQuery,
      difficulty,
      type,
      signal: controller.signal,
    })
      .then((nextPayload) => {
        setPayload(nextPayload);
        if (!appliedQuery && !difficulty && !type) {
          onTotalChange?.(nextPayload.totalCount || 0);
        }
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, appliedQuery, difficulty, type, reloadToken, retryToken]);

  const difficulties = useMemo(
    () =>
      LUOGU_TIERS.map((tier) => ({
        ...tier,
        value: String(tier.value),
      })),
    [],
  );

  const problems = payload?.problems || [];
  const totalPages = payload?.totalPages || 1;
  const safePage = Math.min(page, totalPages);
  const pageStart =
    ((payload?.page || safePage) - 1) * (payload?.perPage || 50);

  const resetFilters = () => {
    setQuery('');
    setAppliedQuery('');
    setDifficulty('');
    setType('');
    setPage(1);
  };

  return (
    <div className="luogu-topic-library">
      <section className="card luogu-topic-toolbar">
        <div className="luogu-topic-toolbar__head">
          <div>
            <span className="card-kicker">LUOGU · MAIN ARCHIVE</span>
            <h2>洛谷主题库</h2>
            <p>
              直接浏览洛谷公共主题库，不按比赛归档；支持题号、题目名、难度和题库类型筛选。
            </p>
          </div>
          <div className="luogu-topic-count">
            <strong>{formatNumber(payload?.totalCount || 0)}</strong>
            <span>道公开题目</span>
          </div>
        </div>

        <div className="luogu-topic-toolbar__row">
          <label className="search-box luogu-topic-search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              placeholder="搜索洛谷题目名或题号…"
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

          <div className="luogu-type-tabs">
            {TYPE_OPTIONS.map(([value, label]) => (
              <button
                type="button"
                key={value || 'all'}
                className={type === value ? 'is-active' : ''}
                onClick={() => setType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="luogu-difficulty-tabs">
          <button
            type="button"
            className={`luogu-difficulty luogu-difficulty--all${
              difficulty === '' ? ' is-active' : ''
            }`}
            onClick={() => setDifficulty('')}
          >
            全部难度
          </button>
          {difficulties.map((tier) => (
            <button
              type="button"
              key={tier.key}
              className={`luogu-difficulty${
                difficulty === tier.value ? ' is-active' : ''
              }`}
              style={{
                '--tier-color': tier.color,
                '--tier-soft': tier.soft,
              }}
              onClick={() =>
                setDifficulty((current) =>
                  current === tier.value ? '' : tier.value,
                )
              }
            >
              <i />
              {tier.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card luogu-topic-table-card">
        <div className="luogu-topic-table-meta">
          <span>
            {loading ? (
              <>
                <Loader2 size={12} className="spin" />
                正在读取主题库…
              </>
            ) : (
              <>
                共 {formatNumber(payload?.totalCount || 0)} 题 · 第 {safePage} /{' '}
                {totalPages} 页
              </>
            )}
          </span>
          <button
            type="button"
            className="text-button"
            onClick={resetFilters}
            disabled={!query && !difficulty && !type}
          >
            重置筛选
          </button>
        </div>

        {error && !payload ? (
          <div className="page-error-state luogu-topic-error">
            <span className="page-error-state__icon">
              <AlertCircle size={24} />
            </span>
            <h1>洛谷主题库加载失败</h1>
            <p>{error.message}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setRetryToken((value) => value + 1)}
            >
              <RotateCcw size={15} />
              重试
            </button>
          </div>
        ) : !payload && loading ? (
          <div className="luogu-topic-loading">
            <Loader2 size={17} className="spin" />
            正在读取洛谷主题库…
          </div>
        ) : (
          <div className="luogu-topic-table-scroll">
            <table className="luogu-topic-table">
              <thead>
                <tr>
                  <th className="luogu-col-number">#</th>
                  <th className="luogu-col-id">题号</th>
                  <th>题目</th>
                  <th className="luogu-col-difficulty">难度</th>
                  <th className="luogu-col-accepted">通过 / 提交</th>
                  <th className="luogu-col-status">状态</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem, index) => {
                  const isSolved = solved.has(problemKey(problem));
                  const tier = tierFor('luogu', problem.difficulty);

                  return (
                    <tr
                      className={isSolved ? 'is-solved' : ''}
                      key={problemKey(problem)}
                    >
                      <td className="luogu-col-number">
                        {pageStart + index + 1}
                      </td>
                      <td className="luogu-col-id">
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {problem.id}
                        </a>
                      </td>
                      <td className="luogu-col-title">
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {problem.title}
                          <ArrowUpRight size={11} />
                        </a>
                        <span>{problem.type || '洛谷'} 题</span>
                      </td>
                      <td className="luogu-col-difficulty">
                        <span
                          className="luogu-topic-tier"
                          style={{
                            '--tier-color': tier.color,
                            '--tier-soft': tier.soft,
                          }}
                        >
                          <i />
                          {tier.short}
                        </span>
                      </td>
                      <td className="luogu-col-accepted">
                        <strong>{formatAccepted(problem)}</strong>
                        <span>
                          {problem.totalSubmit == null
                            ? '—'
                            : formatNumber(problem.totalSubmit)}
                        </span>
                      </td>
                      <td className="luogu-col-status">
                        <span
                          className={`luogu-solve-state${
                            isSolved ? ' is-solved' : ''
                          }`}
                        >
                          {isSolved ? '已通过' : '未通过'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && !problems.length ? (
              <div className="luogu-topic-empty">
                <span>
                  <Search size={20} />
                </span>
                <strong>没有找到符合条件的题目</strong>
                <p>调整题号、关键词、难度或题库类型后再试。</p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={resetFilters}
                >
                  清除筛选
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className="luogu-topic-footer">
          <span>
            {payload?.cookieConfigured
              ? '已应用洛谷登录 Cookie。'
              : '数据来自洛谷公开主题库。'}
          </span>
          <div className="library-pagination">
            <button
              type="button"
              className="icon-button"
              disabled={safePage <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              disabled={safePage >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="下一页"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
