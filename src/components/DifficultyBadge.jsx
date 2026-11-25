import { tierFor } from '../lib/platforms.js';

export function DifficultyBadge({ platform, difficulty, className = '' }) {
  const tier = tierFor(platform, difficulty);

  if (platform === 'luogu') {
    return (
      <span
        className={`difficulty-chip difficulty-chip--luogu ${className}`}
        style={{
          '--tier-color': tier.color,
          '--tier-soft': tier.soft,
        }}
        title={`洛谷难度：${tier.label}`}
      >
        <span className="difficulty-chip__dot" />
        {tier.short}
      </span>
    );
  }

  return (
    <span
      className={`rating-badge rating-badge--${platform}${
        difficulty == null ? ' is-unrated' : ''
      } ${className}`}
      style={{
        '--tier-color': tier.color,
        '--tier-soft': tier.soft,
      }}
      title={difficulty == null ? '该题暂未评定难度' : `估算难度：${tier.label}`}
    >
      {difficulty == null ? '未定' : difficulty}
    </span>
  );
}
