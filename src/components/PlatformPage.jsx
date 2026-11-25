import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  LUOGU_TIERS,
  PLATFORMS,
  formatContestDate,
  formatFullTime,
  formatNumber,
  formatShortDate,
  ratingColor,
  tierFor,
} from '../lib/platforms.js';
import {
  buildTierStats,
  groupByContest,
  matchesQuery,
  meanDifficulty,
  sortContestGroups,
} from '../lib/utils.js';
import { DifficultyBadge } from './DifficultyBadge.jsx';
import { PlatformMark } from './PlatformMark.jsx';
import { RatingBreakdown } from './RatingBreakdown.jsx';
import { TierProfileCard } from './TierProfileCard.jsx';

function ProfileAvatar({ data, platform }) {
  const [failed, setFailed] = useState(false);
  const src = data?.profile?.avatar;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`profile-avatar${!src || failed ? ' profile-avatar--mark' : ''}`}>
      <PlatformMark platform={platform} size="lg" />
      {src && !failed ? (
        <img
          src={src}
          alt={data?.profile?.displayName || data?.handle || ''}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

function buildStats(platform, data) {
  const solved = data?.solved || [];
  const total = data?.stats?.solvedCount ?? solved.length;
  const accountCount =
    data?.stats?.accountCount ?? data?.profiles?.length ?? 0;
  const profiles = (data?.profiles || [])
    .map((item) => item.profile)
    .filter(Boolean);
  const topRating = profiles.reduce(
    (max, profile) =>
      Number.isFinite(profile.rating) ? Math.max(max, profile.rating) : max,
    -Infinity,
  );
  const topMaxRating = profiles.reduce(
    (max, profile) =>
      Number.isFinite(profile.maxRating)
        ? Math.max(max, profile.maxRating)
        : max,
    -Infinity,
  );
  const ratedCount = profiles.filter((profile) =>
    Number.isFinite(profile.rating),
  ).length;

  if (platform === 'luogu') {
    const maxDifficulty = solved.reduce(
      (max, problem) =>
        Number.isFinite(problem.difficulty)
          ? Math.max(max, problem.difficulty)
          : max,
      0,
    );
    const highest = tierFor(platform, maxDifficulty);
    const blueUp = solved.filter(
      (problem) => Number.isFinite(problem.difficulty) && problem.difficulty >= 6,
    ).length;

    return [
      { label: '已通过', value: formatNumber(total), hint: '道不重复题目' },
      {
        label: '最高难度',
        value: highest.short,
        hint: highest.label,
        color: highest.value === 8 ? undefined : highest.color,
      },
      {
        label: '蓝题及以上',
        value: formatNumber(blueUp),
        hint: total ? `占 ${Math.round((blueUp / total) * 100)}%` : '继续加油',
      },
      {
        label: '追踪账号',
        value: formatNumber(accountCount),
        hint:
          accountCount > 1
            ? '多号题迹已合并'
            : accountCount === 1
              ? '当前追踪中'
              : '仅手动补题',
      },
    ];
  }

  return [
    { label: '已通过', value: formatNumber(total), hint: '道不重复题目' },
    {
      label: '当前 Rating',
      value: topRating === -Infinity ? '—' : formatNumber(topRating),
      hint:
        accountCount > 1
          ? `账号中最高 · ${ratedCount} 个已定级`
          : platform === 'atcoder'
            ? `${profiles[0]?.ratedMatches || 0} 场 rated`
            : profiles[0]?.rank || '未定级',
      color: ratingColor(
        platform,
        topRating === -Infinity ? null : topRating,
      ),
    },
    {
      label: '最高 Rating',
      value:
        topMaxRating === -Infinity ? '—' : formatNumber(topMaxRating),
      hint: accountCount > 1 ? '账号中历史最高' : '历史最好成绩',
      color: ratingColor(
        platform,
        topMaxRating === -Infinity ? null : topMaxRating,
      ),
    },
    {
      label: '比赛归档',
      value: formatNumber(data?.stats?.contestCount ?? 0),
      hint: '场有通过记录的比赛',
    },
  ];
}

function accountMetric(platform, entry) {
  if (platform === 'luogu') {
    return `${entry.stats?.solvedCount ?? 0} 题`;
  }
  return entry.profile?.rating == null ? '未定级' : `Rating ${entry.profile.rating}`;
}

function AccountAvatarTile({ platform, entry }) {
  const [failed, setFailed] = useState(false);
  const src = entry.profile?.avatar;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="avatar-stack__tile" title={entry.handle}>
      <PlatformMark platform={platform} size="sm" />
      {src && !failed ? (
        <img
          src={src}
          alt={entry.profile?.displayName || entry.handle}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

function AccountAvatarStack({ platform, entries }) {
  const shown = entries.slice(0, 3);
  const extra = entries.length - shown.length;

  return (
    <div className="avatar-stack">
      {shown.map((entry) => (
        <AccountAvatarTile
          platform={platform}
          entry={entry}
          key={entry.handle}
        />
      ))}
      {extra > 0 ? <span className="avatar-stack__more">+{extra}</span> : null}
    </div>
  );
}

function PlatformHero({
  platform,
  data,
  loading,
  error,
  onRetry,
  onOpenAccounts,
  onOpenManual,
  onOpenCookie,
}) {
  const meta = PLATFORMS[platform];
  const entries = data.profiles?.length ? data.profiles : [];
  const hasAccounts = entries.length > 0;
  const isMulti = entries.length > 1;
  const profile = entries[0]?.profile || data.profile || {};
  const stats = buildStats(platform, data);
  const subtitle =
    platform === 'luogu'
      ? profile.slogan
      : platform === 'codeforces'
        ? profile.organization || profile.country || 'Codeforces 选手'
        : `${profile.ratedMatches || 0} 场 Rated Contest`;

  return (
    <section
      className={`platform-hero platform-hero--${platform}`}
      style={{
        '--hero-accent': meta.accent,
        '--hero-soft': meta.accentSoft,
        '--hero-strong': meta.accentStrong,
      }}
    >
      <div className="platform-hero__mesh" />
      <div className="platform-hero__top">
        <div className="platform-hero__identity">
          {isMulti ? (
            <AccountAvatarStack platform={platform} entries={entries} />
          ) : hasAccounts ? (
            <ProfileAvatar data={data} platform={platform} />
          ) : null}
          <div className="platform-hero__name">
            <span className="platform-hero__kicker">
              <PlatformMark platform={platform} size="xs" />
              {meta.name} ·{' '}
              {isMulti
                ? '多账号合并题迹'
                : hasAccounts
                  ? '题迹档案'
                  : '手动补题记录'}
            </span>
            <h1>
              {isMulti
                ? `${entries.length} 个账号`
                : hasAccounts
                  ? profile.displayName || profile.handle
                  : '手动题迹'}
            </h1>
            <div className="platform-hero__meta">
              {hasAccounts ? (
                <div className="account-chip-row">
                  {entries.map((entry) => (
                    <a
                      href={meta.href(entry.profile)}
                      target="_blank"
                      rel="noreferrer"
                      className="account-chip"
                      key={entry.handle}
                      title={`${entry.handle} · ${accountMetric(platform, entry)}`}
                    >
                      <span>@{entry.handle}</span>
                      <strong
                        style={
                          platform === 'luogu'
                            ? undefined
                            : {
                                color: ratingColor(
                                  platform,
                                  entry.profile?.rating,
                                ),
                              }
                        }
                      >
                        {accountMetric(platform, entry)}
                      </strong>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              ) : (
                <span className="hero-subtitle">
                  这些题目来自本地手动补录，可随时在「补题」中管理。
                </span>
              )}
              {hasAccounts && !isMulti && subtitle ? (
                <span className="hero-subtitle">{subtitle}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="platform-hero__actions">
          <button
            type="button"
            className="soft-button"
            onClick={onOpenManual}
          >
            <Plus size={15} />
            补题
          </button>
          {platform === 'luogu' ? (
            <button
              type="button"
              className="soft-button"
              onClick={onOpenCookie}
              title="配置洛谷登录 Cookie"
            >
              <KeyRound size={15} />
              Cookie
            </button>
          ) : null}
          <button
            type="button"
            className="soft-button"
            onClick={onOpenAccounts}
          >
            <Settings2 size={15} />
            管理账号
          </button>
          <button
            type="button"
            className="soft-button"
            onClick={onRetry}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? '同步中…' : '刷新'}
          </button>
        </div>
      </div>

      <div className="platform-hero__stats">
        {stats.map((stat) => (
          <div className="hero-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong style={stat.color ? { color: stat.color } : undefined}>
              {stat.value}
            </strong>
            <small>{stat.hint}</small>
          </div>
        ))}
      </div>

      <div className="platform-hero__source">
        <span>
          <Database size={12} />
          {data.source}
        </span>
        <span>同步于 {formatFullTime(data.fetchedAt)}</span>
        {isMulti ? (
          <span>
            <Sparkles size={12} />
            {entries.length} 个账号的数据已合并去重
          </span>
        ) : null}
        {data.stats?.manualCount ? (
          <span>
            <Plus size={12} />
            含 {data.stats.manualCount} 道手动补题
          </span>
        ) : null}
        {error ? (
          <span className="hero-source-error" title={error.message}>
            <AlertCircle size={12} />
            {error.failures?.length
              ? `${error.failures.length} 个账号同步失败`
              : '本次刷新失败'}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function FilterToolbar({
  platform,
  solved,
  query,
  setQuery,
  tierFilter,
  setTierFilter,
  sortMode,
  setSortMode,
  resultCount,
  groupCount,
}) {
  const tierCounts = useMemo(() => {
    const counts = new Map();
    for (const problem of solved) {
      const tier = tierFor(platform, problem.difficulty);
      counts.set(tier.key, (counts.get(tier.key) || 0) + 1);
    }
    return counts;
  }, [platform, solved]);

  const tiers = useMemo(() => {
    const filtered = buildTierStats(platform, solved).filter(
      (tier) => tier.count > 0 && tierCounts.has(tier.key),
    );

    if (platform === 'luogu') {
      const unrated = filtered.filter((tier) => tier.value === 0);
      const rated = filtered.filter((tier) => tier.value !== 0);
      return [...rated, ...unrated];
    }
    return filtered;
  }, [platform, solved, tierCounts]);

  const sortOptions =
    platform === 'luogu'
      ? [
          ['easy', '难度：由易到难'],
          ['hard', '难度：由难到易'],
        ]
      : [
          ['recent', '比赛：最新优先'],
          ['difficulty', '难度：最高优先'],
        ];

  return (
    <div className="toolbar card">
      <div className="toolbar__top">
        <label className="search-box">
          <Search size={17} />
          <input
            type="search"
            value={query}
            placeholder={
              platform === 'luogu'
                ? '搜索题目名称或题号…'
                : '搜索题目、比赛或题号…'
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

        <div className="toolbar__result">
          <strong>{formatNumber(resultCount)}</strong>
          <span>题匹配</span>
          {platform !== 'luogu' ? (
            <span className="toolbar__group-count">/ {groupCount} 场比赛</span>
          ) : null}
        </div>

        <label className="sort-select">
          <SlidersHorizontal size={15} />
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="sort-select__chevron" />
        </label>
      </div>

      <div className="filter-chips">
        <button
          type="button"
          className={`filter-chip${tierFilter === 'all' ? ' is-active' : ''}`}
          onClick={() => setTierFilter('all')}
        >
          全部
          <span>{solved.length}</span>
        </button>
        {tiers.map((tier) => (
          <button
            type="button"
            key={tier.key}
            className={`filter-chip${
              tierFilter === tier.key ? ' is-active' : ''
            }`}
            style={{ '--chip-color': tier.color, '--chip-soft': tier.soft }}
            onClick={() =>
              setTierFilter((current) =>
                current === tier.key ? 'all' : tier.key,
              )
            }
          >
            <span className="filter-chip__dot" />
            {tier.label}
            <span>{tier.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyFiltered({ onReset }) {
  return (
    <div className="card empty-filtered">
      <span className="empty-filtered__icon">
        <Search size={21} />
      </span>
      <h3>没有找到匹配的题目</h3>
      <p>换一个关键词，或清除难度筛选后再看看。</p>
      <button type="button" className="ghost-button" onClick={onReset}>
        清除筛选
      </button>
    </div>
  );
}

function LuoguProblemRow({ problem }) {
  return (
    <a
      className="problem-row problem-row--luogu"
      href={problem.url}
      target="_blank"
      rel="noreferrer"
    >
      <DifficultyBadge platform="luogu" difficulty={problem.difficulty} />
      <span className="problem-row__pid">{problem.id}</span>
      <strong className="problem-row__title">
        {problem.title}
        {problem.manual ? <span className="manual-pill">手动</span> : null}
      </strong>
      <span className="problem-row__type">{problem.type} 题</span>
      <span className="problem-row__solved">
        {problem.manual ? '手动补录' : '已通过'}
      </span>
      <ExternalLink size={14} className="problem-row__external" />
    </a>
  );
}

function LuoguTierGroup({ tier, total, problems }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 28;
  const visible = expanded ? problems : problems.slice(0, limit);
  const remaining = problems.length - visible.length;

  return (
    <section className="luogu-group">
      <header
        className="luogu-group__head"
        style={{ '--group-color': tier.color, '--group-soft': tier.soft }}
      >
        <span className="luogu-group__mark" />
        <div className="luogu-group__title">
          <strong>{tier.label}</strong>
        </div>
        <div className="luogu-group__ratio">
          <span>{problems.length}</span> 题
        </div>
        <div className="luogu-group__progress">
          <span
            style={{
              width: `${Math.min(100, (problems.length / Math.max(total, 1)) * 100)}%`,
            }}
          />
        </div>
      </header>
      <div className="luogu-group__list">
        {visible.map((problem) => (
          <LuoguProblemRow problem={problem} key={problem.id} />
        ))}
      </div>
      {remaining > 0 ? (
        <button
          type="button"
          className="group-more"
          onClick={() => setExpanded(true)}
        >
          展开其余 {remaining} 题
          <ChevronDown size={14} />
        </button>
      ) : null}
    </section>
  );
}

function ContestProblemRow({ platform, problem, sortMode }) {
  return (
    <a
      className="problem-row problem-row--contest"
      href={problem.url}
      target="_blank"
      rel="noreferrer"
    >
      <DifficultyBadge platform={platform} difficulty={problem.difficulty} />
      <div className="problem-row__main">
        <div className="problem-row__title-line">
          <span className="problem-row__index">{problem.index}</span>
          <strong className="problem-row__title">
            {problem.title}
            {problem.manual ? <span className="manual-pill">手动</span> : null}
          </strong>
        </div>
        {platform === 'codeforces' && problem.tags?.length ? (
          <div className="problem-row__tags">
            {problem.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="problem-row__right">
        {problem.solvedAt ? (
          <span className="problem-row__date">
            AC {formatShortDate(problem.solvedAt)}
          </span>
        ) : problem.manual ? (
          <span className="problem-row__date">手动补录</span>
        ) : null}
        {problem.attempts > 1 ? (
          <span className="problem-row__attempts">{problem.attempts} 次提交</span>
        ) : null}
      </div>
      <ExternalLink size={14} className="problem-row__external" />
    </a>
  );
}

function ContestGroup({ platform, group, sortMode }) {
  const difficulties = group.problems
    .map((problem) => problem.difficulty)
    .filter((value) => Number.isFinite(value));
  const maxDifficulty = difficulties.length ? Math.max(...difficulties) : null;
  const tier = tierFor(platform, maxDifficulty);

  return (
    <section className="contest-group">
      <header className="contest-group__head">
        <span
          className="contest-group__rail"
          style={{ background: tier.color }}
        />
        <div className="contest-group__identity">
          <div className="contest-group__title-row">
            {group.url ? (
              <a href={group.url} target="_blank" rel="noreferrer">
                {group.name}
                <ExternalLink size={12} />
              </a>
            ) : (
              <span>{group.name}</span>
            )}
          </div>
          <div className="contest-group__meta">
            <span>{formatContestDate(group.start)}</span>
            {group.id && platform !== 'atcoder' ? (
              <span className="contest-group__id">#{group.id}</span>
            ) : null}
          </div>
        </div>
        <div className="contest-group__side">
          <span className="contest-group__count">{group.problems.length} AC</span>
          {maxDifficulty != null ? (
            <span
              className="contest-group__max"
              style={{ color: tier.color }}
              title={`本场最高难度 ${maxDifficulty}`}
            >
              最高 {maxDifficulty}
            </span>
          ) : null}
        </div>
      </header>
      <div className="contest-group__list">
        {group.problems.map((problem) => (
          <ContestProblemRow
            platform={platform}
            problem={problem}
            sortMode={sortMode}
            key={problem.id}
          />
        ))}
      </div>
    </section>
  );
}

function PageSkeleton({ platform }) {
  return (
    <div className="page platform-page">
      <section className={`hero-skeleton hero-skeleton--${platform}`}>
        <div className="hero-skeleton__top">
          <span className="skeleton skeleton--avatar" />
          <div>
            <span className="skeleton skeleton--kicker" />
            <span className="skeleton skeleton--heading" />
            <span className="skeleton skeleton--line short" />
          </div>
        </div>
        <div className="hero-skeleton__stats">
          {[1, 2, 3, 4].map((item) => (
            <span className="skeleton skeleton--stat" key={item} />
          ))}
        </div>
      </section>
      <div className="skeleton skeleton--toolbar" />
      <div className="skeleton skeleton--panel" />
    </div>
  );
}

function Unconnected({ platform, onOpenAccounts }) {
  const meta = PLATFORMS[platform];
  return (
    <div className="page">
      <div className="card unconnected-state">
        <PlatformMark platform={platform} size="xl" />
        <span className="card-kicker">NOT CONNECTED</span>
        <h1>还没有连接 {meta.name}</h1>
        <p>
          填入你的 {meta.handleLabel}，就可以把 {meta.name} 的通过题目收进总览。
        </p>
        <button type="button" className="primary-button" onClick={onOpenAccounts}>
          连接账号
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PageError({
  error,
  onRetry,
  onOpenAccounts,
  onOpenCookie,
  onBack,
  platform,
}) {
  return (
    <div className="page">
      <div className="card page-error-state">
        <span className="page-error-state__icon">
          <AlertCircle size={25} />
        </span>
        <span className="card-kicker">SYNC FAILED</span>
        <h1>这次没有读到题迹</h1>
        <p>{error?.message || '同步失败了，请稍后重试。'}</p>
        <div className="page-error-state__actions">
          <button type="button" className="ghost-button" onClick={onBack}>
            <ArrowLeft size={16} />
            返回总览
          </button>
          <button type="button" className="primary-button" onClick={onRetry}>
            <RefreshCw size={16} />
            重新同步
          </button>
          {platform === 'luogu' ? (
            <button
              type="button"
              className="text-button"
              onClick={onOpenCookie}
            >
              使用 Cookie 尝试读取
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={onOpenAccounts}>
            修改账号
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlatformPage({
  platform,
  accounts,
  data,
  loading,
  error,
  onRetry,
  onOpenAccounts,
  onOpenManual,
  onOpenCookie,
  onBack,
}) {
  const meta = PLATFORMS[platform];
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortMode, setSortMode] = useState(
    platform === 'luogu' ? 'easy' : 'recent',
  );
  const [groupLimit, setGroupLimit] = useState(12);

  useEffect(() => {
    setGroupLimit(12);
  }, [query, tierFilter, sortMode]);

  const solved = data?.solved || [];
  const filtered = useMemo(
    () =>
      solved.filter((problem) => {
        if (!matchesQuery(problem, query.trim())) return false;
        if (tierFilter === 'all') return true;
        return tierFor(platform, problem.difficulty).key === tierFilter;
      }),
    [solved, query, tierFilter, platform],
  );

  const luoguGroups = useMemo(() => {
    if (platform !== 'luogu') return [];

    const ratedTiers = LUOGU_TIERS.filter((tier) => tier.value !== 0);
    const unratedTiers = LUOGU_TIERS.filter((tier) => tier.value === 0);
    const orderedTiers =
      sortMode === 'hard'
        ? [...ratedTiers].reverse()
        : ratedTiers;

    return [...orderedTiers, ...unratedTiers]
      .map((tier) => ({
        tier,
        problems: filtered.filter(
          (problem) => tierFor(platform, problem.difficulty).key === tier.key,
        ),
      }))
      .filter((group) => group.problems.length > 0)
      .map((group) => ({
        ...group,
        problems: [...group.problems].sort((a, b) =>
          a.id.localeCompare(b.id, 'en', { numeric: true }),
        ),
      }));
  }, [filtered, platform, sortMode]);

  const contestGroups = useMemo(() => {
    if (platform === 'luogu') return [];
    const groups = groupByContest(filtered);
    const sorted = sortContestGroups(groups, sortMode);
    if (sortMode === 'difficulty') {
      for (const group of sorted) {
        group.problems.sort(
          (a, b) => (b.difficulty ?? -1) - (a.difficulty ?? -1),
        );
      }
    }
    return sorted;
  }, [filtered, platform, sortMode]);

  const visibleContestGroups = contestGroups.slice(0, groupLimit);
  const blueUp = solved.filter(
    (problem) => Number.isFinite(problem.difficulty) && problem.difficulty >= 6,
  ).length;

  if (!accounts?.length && !data) {
    return (
      <Unconnected platform={platform} onOpenAccounts={onOpenAccounts} />
    );
  }

  if (loading && !data) {
    return <PageSkeleton platform={platform} />;
  }

  if (error && !data) {
    return (
      <PageError
        platform={platform}
        error={error}
        onRetry={onRetry}
        onOpenAccounts={onOpenAccounts}
        onOpenCookie={onOpenCookie}
        onBack={onBack}
      />
    );
  }

  if (!data) {
    return <PageSkeleton platform={platform} />;
  }

  const resetFilters = () => {
    setQuery('');
    setTierFilter('all');
  };

  return (
    <div className="page platform-page">
      <PlatformHero
        platform={platform}
        data={data}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onOpenAccounts={onOpenAccounts}
        onOpenManual={onOpenManual}
        onOpenCookie={onOpenCookie}
      />

      {error && error.failures?.length ? (
        <div className="partial-sync-banner">
          <AlertCircle size={15} />
          <span>{error.message}</span>
          <button type="button" className="text-button" onClick={onRetry}>
            重新同步
          </button>
        </div>
      ) : null}

      {platform === 'codeforces' && solved.length ? (
        <RatingBreakdown data={data} />
      ) : null}

      {platform !== 'codeforces' && solved.length ? (
        <TierProfileCard platform={platform} data={data} />
      ) : null}

      {solved.length ? (
        <>
          <FilterToolbar
            platform={platform}
            solved={solved}
            query={query}
            setQuery={setQuery}
            tierFilter={tierFilter}
            setTierFilter={setTierFilter}
            sortMode={sortMode}
            setSortMode={setSortMode}
            resultCount={filtered.length}
            groupCount={contestGroups.length}
          />

          {filtered.length === 0 ? (
            <EmptyFiltered onReset={resetFilters} />
          ) : platform === 'luogu' ? (
            <div className="luogu-archive">
              <div className="archive-intro">
                <div>
                  <span className="card-kicker">
                    <Sparkles size={13} />
                    LUOGU ARCHIVE
                  </span>
                  <h2>按难度归档的题目</h2>
                  <p>
                    从红题到黑题，逐步看见自己走过的难度阶梯。
                    {blueUp > 0
                      ? ` 其中蓝题及以上 ${blueUp} 道。`
                      : ''}
                  </p>
                </div>
                <span className="archive-intro__count">
                  {formatNumber(filtered.length)}
                  <small>题在视野中</small>
                </span>
              </div>

              {luoguGroups.map((group) => (
                <LuoguTierGroup
                  key={group.tier.key}
                  tier={group.tier}
                  total={solved.length}
                  problems={group.problems}
                />
              ))}
            </div>
          ) : (
            <div className="contest-archive">
              <div className="archive-intro">
                <div>
                  <span className="card-kicker">
                    <Sparkles size={13} />
                    CONTEST ARCHIVE
                  </span>
                  <h2>按比赛归档的题迹</h2>
                  <p>
                    每场比赛都是一小段旅程，点开题目标题即可回到原题。
                  </p>
                </div>
                <span className="archive-intro__count">
                  {formatNumber(filtered.length)}
                  <small>题在视野中</small>
                </span>
              </div>

              <div className="contest-groups">
                {visibleContestGroups.map((group) => (
                  <ContestGroup
                    key={group.id}
                    platform={platform}
                    group={group}
                    sortMode={sortMode}
                  />
                ))}
              </div>

              {contestGroups.length > visibleContestGroups.length ? (
                <button
                  type="button"
                  className="load-more"
                  onClick={() => setGroupLimit((limit) => limit + 12)}
                >
                  显示更多比赛
                  <ChevronDown size={16} />
                  <span>
                    {visibleContestGroups.length} / {contestGroups.length}
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div className="card empty-platform">
          <PlatformMark platform={platform} size="lg" />
          <span className="card-kicker">A FRESH PAGE</span>
          <h2>还没有通过记录</h2>
          <p>
            在 {meta.name} 完成第一道题后，刷新这里就会看到你的题迹。
          </p>
          <a
            className="primary-button"
            href={meta.href(data.profile)}
            target="_blank"
            rel="noreferrer"
          >
            去 {meta.name} 看看
            <ExternalLink size={15} />
          </a>
        </div>
      )}
    </div>
  );
}
