import { PLATFORMS } from '../lib/platforms.js';

export function PlatformMark({ platform, size = 'md', className = '' }) {
  const meta = PLATFORMS[platform];
  if (!meta) return null;

  return (
    <span
      className={`platform-mark platform-mark--${platform} platform-mark--${size} ${className}`}
      aria-hidden="true"
    >
      <span>{meta.mark}</span>
    </span>
  );
}
