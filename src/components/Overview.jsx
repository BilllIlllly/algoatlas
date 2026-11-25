import { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Plus,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import {
  PLATFORMS,
  PLATFORM_ORDER,
  formatFullTime,
  formatNumber,
  formatShortDate,
  ratingColor,
  tierFor,
} from '../lib/platforms.js';
import {
  buildTierStats,
  getRecentSolved,
  pluralProblem,
} from '../lib/utils.js';
import { DifficultyBadge } from './DifficultyBadge.jsx';
import { DifficultyComposition } from './DifficultyComposition.jsx';
import { Heatmap } from './Heatmap.jsx';
import { PlatformMark } from './PlatformMark.jsx';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
}

function SummaryCard({ platform, accounts, data, loading, error, onOpen, onRetry }) {
  const meta = PLATFORMS[platform];
  const solved = data?.solved || [];
  const tiers = buildTierStats(platform, solved).filter((tier) => tier.count > 0);
  const profile = data?.profile;
  const accountList = accounts || [];
  const primaryAccount = accountList[0] || '';
  const extraAccounts = Math.max(0, accountList.length - 1);
  const hasData = Boolean(data);
  const isUnavailable = !loading && !hasData && error;
  const ratedProfiles = (data?.profiles || [])
    .map((item) => item.profile)
    .filter(Boolean);
  const topRating = ratedProfiles.reduce(
    (max, item) =>
      Number.isFinite(item.rating) ? Math.max(max, item.rating) : max,
    -Infinity,
  );
  const topMaxRating = ratedProfiles.reduce(
    (max, item) =>
      Number.isFinite(item.maxRating) ? Math.max(max, item.maxRating) : max,
    -Infinity,
  );

  const handleActivate = () => {
    if (hasData) onOpen();
    else if (!loading) onRetry();
  };

  return (
    <div
      className={`summary-card summary-card--${platform}${
        isUnavailable ? ' has-error' : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
    >
      <div className="summary-card__glow" />
      <div className="summary-card__head">
        <div className="summary-card__identity">
          <PlatformMark platform={platform} size="md" />
          <div>
            <div className="summary-card__title-row">
              <strong>{meta.name}</strong>
              {loading ? <span className="live-dot is-loading" /> : null}
              {!loading && hasData ? (
                <span
                  className={`live-dot${error ? ' is-partial' : ''}`}
                  title={error?.message || ''}
                />
              ) : null}
            </div>
            <span>
              @{primaryAccount}
              {extraAccounts ? ` +${extraAccounts}` : ''}
            </span>
          </div>
        </div>
        <span className="summary-card__arrow">
          <ArrowUpRight size={17} />
        </span>
      </div>

      {loading && !hasData ? (
        <div className="summary-card__loading">
          <span className="skeleton skeleton--number" />
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--bar" />
        </div>
      ) : isUnavailable ? (
        <div className="summary-card__error">
          <AlertCircle size={18} />
          <div>
            <strong>同步没有成功</strong>
            <p>{error.message}</p>
            <span>点击卡片重试</span>
          </div>
        </div>
      ) : hasData ? (
        <>
          <div className="summary-card__metric">
            <div>
              <strong>{formatNumber(data.stats?.solvedCount ?? solved.length)}</strong>
              <span>题已通过</span>
            </div>
            {platform === 'codeforces' || platform === 'atcoder' ? (
              <div className="summary-rating">
                <span>Rating</span>
                <strong
                  style={{
                    color: ratingColor(
                      platform,
                      topRating === -Infinity ? null : topRating,
                    ),
                  }}
                >
                  {topRating === -Infinity ? '—' : topRating}
                </strong>
                <small>
                  最高 {topMaxRating === -Infinity ? '—' : topMaxRating}
                </small>
              </div>
            ) : accountList.length > 1 ? (
              <div className="summary-rating">
                <span>Accounts</span>
                <strong>{accountList.length}</strong>
                <small>合并题迹</small>
              </div>
            ) : (
              <div className="summary-rating">
                <span>UID</span>
                <strong>{profile?.uid ?? '—'}</strong>
                <small>排名 {profile?.ranking ? `#${profile.ranking}` : '—'}</small>
              </div>
            )}
          </div>

          <div className="summary-card__distribution">
            <div className="mini-stacked-bar">
              {tiers.map((tier) => (
                <span
                  key={tier.key}
                  style={{
                    width: `${(tier.count / Math.max(solved.length, 1)) * 100}%`,
                    background: tier.color,
                  }}
                  title={`${tier.label} · ${tier.count}`}
                />
              ))}
              {solved.length === 0 ? <span className="is-empty" /> : null}
            </div>
            <div className="summary-card__foot">
              <span>
                {platform === 'luogu'
                  ? solved.length
                    ? `最高 ${tierFor(platform, Math.max(...solved.map((item) => item.difficulty ?? 0))).short}${
                        accountList.length > 1
                          ? ` · ${accountList.length} 个账号`
                          : ''
                      }${data.stats?.manualCount ? ` · 手动 ${data.stats.manualCount}` : ''}`
                    : '等待第一道 AC'
                  : `${pluralProblem(solved.length)}${
                      accountList.length > 1
                        ? ` · ${accountList.length} 个账号`
                        : ''
                    }${data.stats?.manualCount ? ` · 手动 ${data.stats.manualCount}` : ''}`}
              </span>
              <span className="summary-card__enter">
                查看题迹
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AddPlatformCard({ missing, onClick }) {
  return (
    <button type="button" className="summary-card summary-card--add" onClick={onClick}>
      <span className="add-platform__icon">
        <Plus size={19} />
      </span>
      <strong>接入更多 OJ</strong>
      <p>还可以连接 {missing.map((item) => PLATFORMS[item].name).join(' / ')}</p>
      <span className="add-platform__link">
        管理账号
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

function RecentSolved({ dataByPlatform }) {
  const recent = useMemo(() => getRecentSolved(dataByPlatform, 6), [dataByPlatform]);

  return (
    <section className="card recent-card">
      <div className="card-header recent-card__head">
        <div>
          <span className="card-kicker">
            <Clock3 size={14} />
            RECENT AC
          </span>
          <h2>最近通过</h2>
          <p>按 AC 时间排列的最近足迹。</p>
        </div>
        <span className="recent-card__hint">
          <CalendarDays size={14} />
          近 6 次
        </span>
      </div>

      {recent.length ? (
        <div className="recent-list">
          {recent.map((problem) => (
            <a
              className="recent-row"
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              key={`${problem.platform}-${problem.id}`}
            >
              <PlatformMark platform={problem.platform} size="sm" />
              <div className="recent-row__main">
                <strong>{problem.title}</strong>
                <span>
                  {problem.platform === 'atcoder'
                    ? `${problem.contestName} · ${problem.index}`
                    : problem.contestName}
                </span>
              </div>
              <DifficultyBadge
                platform={problem.platform}
                difficulty={problem.difficulty}
              />
              <span className="recent-row__date">
                {formatShortDate(problem.solvedAt)}
              </span>
              <ArrowUpRight size={15} className="recent-row__arrow" />
            </a>
          ))}
        </div>
      ) : (
        <div className="recent-empty">
          完成下一道题后，最近的 AC 会出现在这里。
        </div>
      )}
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="overview-grid">
      <section className="card analytics-skeleton">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--heatmap" />
      </section>
      <section className="card analytics-skeleton">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--chart" />
      </section>
    </div>
  );
}

export function Overview({
  accounts,
  dataByPlatform,
  loadingByPlatform,
  errors,
  lastSync,
  onNavigate,
  onOpenAccounts,
  onOpenManual,
  onRefresh,
  onRetryPlatform,
}) {
  const configured = PLATFORM_ORDER.filter(
    (platform) => accounts[platform]?.length,
  );
  const missing = PLATFORM_ORDER.filter(
    (platform) => !accounts[platform]?.length,
  );
  const loadedCount = PLATFORM_ORDER.filter(
    (platform) => dataByPlatform[platform],
  ).length;
  const isLoading = PLATFORM_ORDER.some(
    (platform) => accounts[platform]?.length && loadingByPlatform[platform],
  );
  const hasAnyData = loadedCount > 0;

  return (
    <div className="page overview-page">
      <section className="overview-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            {todayLabel()}
          </div>
          <h1>
            {greeting()}，<span>继续向前。</span>
          </h1>
          <p>
            把散落在三座 OJ 的每一次 AC，收进同一张个人题迹地图。
            {lastSync ? (
              <span className="sync-time">
                上次同步 {formatFullTime(lastSync)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="overview-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onOpenAccounts}
          >
            <Settings2 size={16} />
            管理账号
          </button>
          <button type="button" className="ghost-button" onClick={onOpenManual}>
            <Plus size={16} />
            补题
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            {isLoading ? '同步中…' : '刷新数据'}
          </button>
        </div>
      </section>

      <section className="summary-grid">
        {configured.map((platform) => (
          <SummaryCard
            key={platform}
            platform={platform}
            accounts={accounts[platform]}
            data={dataByPlatform[platform]}
            loading={Boolean(loadingByPlatform[platform])}
            error={errors[platform]}
            onOpen={() => onNavigate(platform)}
            onRetry={() => onRetryPlatform(platform)}
          />
        ))}
        {missing.length ? (
          <AddPlatformCard missing={missing} onClick={onOpenAccounts} />
        ) : null}
      </section>

      {hasAnyData ? (
        <div className="overview-grid">
          <Heatmap dataByPlatform={dataByPlatform} />
          <DifficultyComposition
            dataByPlatform={dataByPlatform}
            loading={isLoading}
            onNavigate={onNavigate}
          />
        </div>
      ) : (
        <AnalyticsSkeleton />
      )}

      {hasAnyData ? <RecentSolved dataByPlatform={dataByPlatform} /> : null}
    </div>
  );
}
