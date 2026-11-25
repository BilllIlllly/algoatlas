import { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import {
  CF_BAND_GROUPS,
  CF_RATING_BANDS,
  formatNumber,
} from '../lib/platforms.js';

export function RatingBreakdown({ data }) {
  const [expanded, setExpanded] = useState(true);
  const solved = data?.solved || [];

  const stats = useMemo(() => {
    const counts = new Map(CF_RATING_BANDS.map((band) => [band.key, 0]));
    let rated = 0;
    let unrated = 0;
    let totalRating = 0;

    for (const problem of solved) {
      if (!Number.isFinite(problem.difficulty)) {
        unrated += 1;
        continue;
      }
      const band =
        CF_RATING_BANDS.find(
          (item) =>
            problem.difficulty >= item.min && problem.difficulty <= item.max,
        ) || CF_RATING_BANDS[CF_RATING_BANDS.length - 1];
      counts.set(band.key, (counts.get(band.key) || 0) + 1);
      rated += 1;
      totalRating += problem.difficulty;
    }

    return {
      counts,
      rated,
      unrated,
      average: rated ? Math.round(totalRating / rated) : null,
      max: rated
        ? Math.max(
            ...solved
              .map((problem) => problem.difficulty)
              .filter((value) => Number.isFinite(value)),
          )
        : null,
    };
  }, [solved]);

  const maxCount = Math.max(1, ...stats.counts.values());
  const ratedTotal = Math.max(1, stats.rated);

  return (
    <section className="card rating-breakdown">
      <div className="rating-breakdown__head">
        <div>
          <span className="card-kicker">
            <BarChart3 size={14} />
            RATING MATRIX
          </span>
          <h2>Rating 分段明细</h2>
          <p>
            每 100 分一档；2400 以上拆成 11 档，不再用一个 2400+ 草草概括。
          </p>
        </div>
        <div className="rating-breakdown__summary">
          <div>
            <strong>{formatNumber(stats.rated)}</strong>
            <span>已评级题目</span>
          </div>
          <div>
            <strong>{stats.average ?? '—'}</strong>
            <span>平均 Rating</span>
          </div>
          <div>
            <strong>{stats.max ?? '—'}</strong>
            <span>最高 Rating</span>
          </div>
          <button
            type="button"
            className="icon-button rating-breakdown__toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? '收起 Rating 明细' : '展开 Rating 明细'}
            title={expanded ? '收起明细' : '展开明细'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded ? (
        <>
          <div className="rating-band-columns">
            {CF_BAND_GROUPS.map((group) => (
              <div className="rating-band-group" key={group.key}>
                <div className="rating-band-group__head">
                  <strong>{group.title}</strong>
                  <span>{group.subtitle}</span>
                </div>
                <div className="rating-band-list">
                  {group.bands.map((band) => {
                    const count = stats.counts.get(band.key) || 0;
                    const percent = count
                      ? Math.round((count / ratedTotal) * 100)
                      : 0;

                    return (
                      <div
                        className={`rating-band-row${count ? ' has-value' : ''}`}
                        key={band.key}
                        title={`${band.label} · ${band.rank} · ${count} 题`}
                      >
                        <span className="rating-band-row__label">
                          {band.label}
                        </span>
                        <span className="rating-band-row__track">
                          <span
                            style={{
                              width: `${Math.max(
                                count ? 3 : 0,
                                (count / maxCount) * 100,
                              )}%`,
                              background: band.color,
                            }}
                          />
                        </span>
                        <strong>{count}</strong>
                        <em>{count ? `${percent}%` : '—'}</em>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rating-breakdown__foot">
            <span>
              <i className="rating-foot-dot" />
              {stats.unrated
                ? `另有 ${stats.unrated} 道未定级题目未计入分段`
                : '所有题目均已评级'}
            </span>
            <span>
              高难段：2400–2499 / 2500–2599 / … / 3300–3399 / 3400+
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}
