import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { PLATFORMS, PLATFORM_ORDER, formatNumber } from '../lib/platforms.js';
import { buildTierStats, meanDifficulty } from '../lib/utils.js';
import { DonutChart } from './DonutChart.jsx';
import { PlatformMark } from './PlatformMark.jsx';

export function DifficultyComposition({ dataByPlatform, loading, onNavigate }) {
  const available = useMemo(
    () => PLATFORM_ORDER.filter((platform) => Boolean(dataByPlatform[platform]?.solved)),
    [dataByPlatform],
  );
  const [active, setActive] = useState('luogu');
  const userPicked = useRef(false);

  useEffect(() => {
    if (!available.length) return;

    if (userPicked.current) {
      if (!available.includes(active)) setActive(available[0]);
      return;
    }

    const preferred = PLATFORM_ORDER.find((platform) =>
      available.includes(platform),
    );
    if (preferred && preferred !== active) setActive(preferred);
  }, [available, active]);

  const data = dataByPlatform[active];
  const solved = data?.solved || [];
  const stats = useMemo(
    () => buildTierStats(active, solved).filter((tier) => tier.count > 0),
    [active, solved],
  );
  const total = solved.length;
  const average = meanDifficulty(solved);
  const platform = PLATFORMS[active];

  return (
    <section className="card composition-card">
      <div className="card-header composition-head">
        <div>
          <span className="card-kicker">
            <BarChart3 size={14} />
            DIFFICULTY MIX
          </span>
          <h2>难度构成</h2>
          <p>看看你的舒适区，和正在攀登的那一格。</p>
        </div>
      </div>

      {available.length > 1 ? (
        <div className="mini-tabs" role="tablist" aria-label="平台难度构成">
          {available.map((item) => (
            <button
              type="button"
              key={item}
              className={item === active ? 'is-active' : ''}
              onClick={() => {
                userPicked.current = true;
                setActive(item);
              }}
              role="tab"
              aria-selected={item === active}
            >
              <PlatformMark platform={item} size="xs" />
              {PLATFORMS[item].name}
            </button>
          ))}
        </div>
      ) : null}

      {!data ? (
        <div className="composition-empty">
          {loading ? (
            <div className="skeleton skeleton--chart" />
          ) : (
            <p>同步一个账号后，这里会长出你的难度构成。</p>
          )}
        </div>
      ) : total === 0 ? (
        <div className="composition-empty">
          <p>还没有通过的题目，去写下第一行 AC 吧。</p>
        </div>
      ) : (
        <>
          <div className="composition-visual">
            <DonutChart
              segments={stats}
              total={total}
              size={118}
              thickness={12}
              subLabel="题已通过"
            />
            <div className="composition-stat-stack">
              <div>
                <strong>{formatNumber(total)}</strong>
                <span>{platform.name} 已通过</span>
              </div>
              <div>
                <strong>{average == null ? '—' : average.toFixed(0)}</strong>
                <span>
                  {active === 'luogu' ? '平均难度等级' : '平均题目难度'}
                </span>
              </div>
            </div>
          </div>

          <div className="difficulty-bar" aria-hidden="true">
            {stats.map((tier) => (
              <span
                key={tier.key}
                style={{
                  width: `${(tier.count / total) * 100}%`,
                  background: tier.color,
                }}
                title={`${tier.label} · ${tier.count} 题`}
              />
            ))}
          </div>

          <div className="composition-list">
            {stats.map((tier) => (
              <div className="composition-row" key={tier.key}>
                <span
                  className="composition-dot"
                  style={{ background: tier.color }}
                />
                <span className="composition-label">{tier.label}</span>
                <span className="composition-count">{tier.count}</span>
                <span className="composition-percent">
                  {Math.round((tier.count / total) * 100)}%
                </span>
              </div>
            ))}
          </div>

          {active === 'codeforces' && onNavigate ? (
            <button
              type="button"
              className="composition-detail-link"
              onClick={() => onNavigate('codeforces')}
            >
              2400+ 已拆成 11 档，查看完整 Rating 分段表
              <ArrowRight size={13} />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
