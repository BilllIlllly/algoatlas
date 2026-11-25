import { useMemo } from 'react';
import { Activity, Flame, Sparkles } from 'lucide-react';
import {
  buildActivityMap,
  buildHeatmap,
  currentStreak,
} from '../lib/utils.js';

const WEEKDAYS = ['一', '', '三', '', '五', '', '日'];

function levelFor(count, max) {
  if (!count) return 0;
  if (max <= 2) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.78) return 3;
  return 4;
}

function dateLabel(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function Heatmap({ dataByPlatform }) {
  const activityMap = useMemo(() => buildActivityMap(dataByPlatform), [dataByPlatform]);
  const heatmap = useMemo(() => buildHeatmap(activityMap), [activityMap]);
  const streak = useMemo(() => currentStreak(activityMap), [activityMap]);
  const monthLabels = useMemo(() => {
    const map = new Map();
    for (const item of heatmap.monthLabels) map.set(item.week, item.label);
    return map;
  }, [heatmap.monthLabels]);

  return (
    <section className="card heatmap-card">
      <div className="card-header heatmap-card__head">
        <div>
          <span className="card-kicker">
            <Activity size={14} />
            ACTIVITY
          </span>
          <h2>AC 热力图</h2>
          <p>过去一年里，CF 与 AtCoder 的每一次通过。</p>
        </div>
        <div className="heatmap-stats">
          <div>
            <strong>{heatmap.total}</strong>
            <span>年度 AC</span>
          </div>
          <div>
            <strong>{heatmap.activeDays}</strong>
            <span>活跃天数</span>
          </div>
          <div>
            <strong>{streak}</strong>
            <span>连续天数</span>
          </div>
        </div>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap-shell">
          <div className="heatmap-weekdays">
            {WEEKDAYS.map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div className="heatmap-main">
            <div className="heatmap-months">
              {heatmap.columns.map((_, index) => (
                <span key={index}>{monthLabels.get(index) || ''}</span>
              ))}
            </div>
            <div className="heatmap-weeks">
              {heatmap.columns.map((column, weekIndex) => (
                <div className="heatmap-week" key={weekIndex}>
                  {column.map((cell) => (
                    <span
                      className={`heatmap-cell level-${levelFor(
                        cell.count,
                        heatmap.max,
                      )}${cell.future ? ' is-future' : ''}`}
                      key={cell.key}
                      title={
                        cell.future
                          ? ''
                          : `${dateLabel(cell.date)} · ${cell.count} 题`
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="heatmap-foot">
        <span className="heatmap-note">
          <Sparkles size={13} />
          洛谷未提供公开 AC 时间，热力图仅统计 CF / AtCoder
        </span>
        <div className="heatmap-legend">
          {streak > 0 ? (
            <span className="heatmap-streak">
              <Flame size={13} />
              连续 {streak} 天
            </span>
          ) : null}
          <span>少</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span className={`heatmap-cell level-${level}`} key={level} />
          ))}
          <span>多</span>
        </div>
      </div>
    </section>
  );
}
