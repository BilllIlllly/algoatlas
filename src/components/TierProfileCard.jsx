import { useMemo } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { formatNumber, tierFor } from '../lib/platforms.js';
import {
  buildTierStats,
  meanDifficulty,
} from '../lib/utils.js';
import { DonutChart } from './DonutChart.jsx';

export function TierProfileCard({ platform, data }) {
  const solved = data?.solved || [];
  const stats = useMemo(
    () => buildTierStats(platform, solved),
    [platform, solved],
  );
  const nonEmpty = stats.filter((tier) => tier.count > 0);
  const total = solved.length;
  const average = meanDifficulty(solved);
  const highest = useMemo(() => {
    const values = solved
      .map((problem) => problem.difficulty)
      .filter((value) => Number.isFinite(value));
    return values.length ? tierFor(platform, Math.max(...values)) : null;
  }, [solved, platform]);

  const maxCount = Math.max(1, ...stats.map((tier) => tier.count));

  return (
    <section className="card tier-profile-card">
      <div className="card-header tier-profile-card__head">
        <div>
          <span className="card-kicker">
            <BarChart3 size={14} />
            DIFFICULTY PROFILE
          </span>
          <h2>{platform === 'luogu' ? '难度分布' : 'Difficulty 分布'}</h2>
          <p>
            {platform === 'luogu'
              ? '按洛谷 8 级难度与未定级题目统计已通过题迹。'
              : '按 AtCoder Problems 估算难度分段统计已通过题迹。'}
          </p>
        </div>
        <div className="tier-profile-stats">
          <div>
            <span>已通过</span>
            <strong>{formatNumber(total)}</strong>
          </div>
          <div>
            <span>平均难度</span>
            <strong>{average == null ? '—' : average.toFixed(0)}</strong>
          </div>
          <div>
            <span>最高难度</span>
            <strong
              style={
                highest && !(platform === 'luogu' && highest.value === 8)
                  ? { color: highest.color }
                  : undefined
              }
            >
              {highest
                ? platform === 'luogu'
                  ? highest.short
                  : Math.max(
                      ...solved
                        .map((problem) => problem.difficulty)
                        .filter((value) => Number.isFinite(value)),
                    )
                : '—'}
            </strong>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="tier-profile-empty">还没有已通过的题目。</div>
      ) : (
        <div className="tier-profile-body">
          <div className="tier-profile-chart">
            <DonutChart
              segments={nonEmpty}
              total={total}
              size={142}
              thickness={13}
              subLabel="题已通过"
            />
            <span className="tier-profile-chart__hint">
              <PieChart size={12} />
              {nonEmpty.length} 个难度段
            </span>
          </div>

          <div className="tier-profile-bars">
            {stats.map((tier) => {
              const percent = total
                ? Math.round((tier.count / total) * 100)
                : 0;
              return (
                <div
                  className={`tier-profile-row${
                    tier.count ? ' has-value' : ''
                  }`}
                  key={tier.key}
                >
                  <span className="tier-profile-row__label">
                    <i style={{ background: tier.color }} />
                    {tier.label}
                  </span>
                  <span className="tier-profile-row__track">
                    <span
                      style={{
                        width: `${
                          tier.count
                            ? Math.max(2, (tier.count / maxCount) * 100)
                            : 0
                        }%`,
                        background: tier.color,
                      }}
                    />
                  </span>
                  <strong>{tier.count}</strong>
                  <em>{tier.count ? `${percent}%` : '—'}</em>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
