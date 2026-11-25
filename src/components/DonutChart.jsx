import { formatNumber } from '../lib/platforms.js';

const RADIUS = 41;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({
  segments = [],
  total = 0,
  size = 132,
  thickness = 12,
  centerLabel = '题',
  subLabel = '',
}) {
  const visible = segments.filter((segment) => segment.count > 0);
  const gap = visible.length > 1 ? 2.2 : 0;
  const usable = Math.max(0, CIRCUMFERENCE - gap * visible.length);
  let offset = 0;

  return (
    <div
      className="donut-chart"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerLabel}分布，共 ${total} 题`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle
          className="donut-chart__base"
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={thickness}
        />
        {visible.map((segment) => {
          const length = total > 0 ? (segment.count / total) * usable : 0;
          const dash = Math.max(0, length - gap * 0.18);
          const dashOffset = -offset;
          offset += length;

          if (dash <= 0.2) return null;

          return (
            <circle
              key={segment.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
            >
              <title>
                {segment.label} · {segment.count} 题
              </title>
            </circle>
          );
        })}
      </svg>
      <div className="donut-chart__center">
        <strong>{formatNumber(total)}</strong>
        <span>{subLabel || centerLabel}</span>
      </div>
    </div>
  );
}
