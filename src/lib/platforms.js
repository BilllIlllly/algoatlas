export const PLATFORMS = {
  luogu: {
    key: 'luogu',
    name: '洛谷',
    english: 'Luogu',
    mark: '洛',
    handleLabel: '洛谷用户名 / UID',
    placeholder: '例如 kkksc03 或 1',
    href: (profile) =>
      profile?.uid
        ? `https://www.luogu.com.cn/user/${profile.uid}`
        : 'https://www.luogu.com.cn/',
    description: '按题目难度归档',
    accent: '#0e9f9a',
    accentSoft: '#e9fbf8',
    accentStrong: '#087f7a',
    note: '读取洛谷公开练习数据',
  },
  codeforces: {
    key: 'codeforces',
    name: 'Codeforces',
    shortName: 'CF',
    english: 'Codeforces',
    mark: 'CF',
    handleLabel: 'Codeforces Handle',
    placeholder: '例如 tourist',
    href: (profile) =>
      `https://codeforces.com/profile/${encodeURIComponent(profile?.handle || '')}`,
    description: '按比赛归档',
    accent: '#3b6fe0',
    accentSoft: '#edf3ff',
    accentStrong: '#2655c9',
    note: '读取 Codeforces 官方 API',
  },
  atcoder: {
    key: 'atcoder',
    name: 'AtCoder',
    english: 'AtCoder',
    mark: 'AT',
    handleLabel: 'AtCoder 用户名',
    placeholder: '例如 chokudai',
    href: (profile) =>
      `https://atcoder.jp/users/${encodeURIComponent(profile?.handle || '')}`,
    description: '按比赛归档',
    accent: '#475569',
    accentSoft: '#f1f5f9',
    accentStrong: '#334155',
    note: '读取 AtCoder Problems 数据',
  },
};

export const PLATFORM_ORDER = ['luogu', 'codeforces', 'atcoder'];

const UNKNOWN_COLOR = '#94a3b8';
const UNKNOWN_SOFT = '#f1f5f9';

export const LUOGU_TIERS = [
  {
    key: 'luogu-0',
    value: 0,
    min: 0,
    max: 0,
    label: '暂无评定',
    short: '暂无',
    chart: '暂无',
    color: '#7c869a',
    soft: '#f2f4f8',
  },
  {
    key: 'luogu-1',
    value: 1,
    min: 1,
    max: 1,
    label: '入门',
    short: '入门',
    chart: '入门',
    color: '#fe4c61',
    soft: '#fff0f2',
  },
  {
    key: 'luogu-2',
    value: 2,
    min: 2,
    max: 2,
    label: '普及−',
    short: '普及−',
    chart: '普及−',
    color: '#f39c11',
    soft: '#fff7e8',
  },
  {
    key: 'luogu-3',
    value: 3,
    min: 3,
    max: 3,
    label: '普及',
    short: '普及',
    chart: '黄题',
    color: '#e4a900',
    soft: '#fffaeb',
  },
  {
    key: 'luogu-4',
    value: 4,
    min: 4,
    max: 4,
    label: '普及+/提高−',
    short: '普及+/提高−',
    chart: '绿题',
    color: '#52c41a',
    soft: '#f0fbe9',
  },
  {
    key: 'luogu-5',
    value: 5,
    min: 5,
    max: 5,
    label: '提高',
    short: '提高',
    chart: '青题',
    color: '#0eaaa9',
    soft: '#e9fbfa',
  },
  {
    key: 'luogu-6',
    value: 6,
    min: 6,
    max: 6,
    label: '提高+/省选−',
    short: '提高+/省选−',
    chart: '蓝题',
    color: '#3498db',
    soft: '#eef7fe',
  },
  {
    key: 'luogu-7',
    value: 7,
    min: 7,
    max: 7,
    label: '省选/NOI−',
    short: '省选/NOI−',
    chart: '紫题',
    color: '#9d3dcf',
    soft: '#faf0ff',
  },
  {
    key: 'luogu-8',
    value: 8,
    min: 8,
    max: 8,
    label: 'NOI/NOI+/CTS',
    short: 'NOI/NOI+',
    chart: '黑题',
    color: '#26324b',
    soft: '#eef1f6',
  },
];

export const CF_TIERS = [
  {
    key: 'cf-low',
    min: 0,
    max: 1199,
    label: '800–1199',
    short: '≤1199',
    chart: '≤1199',
    color: '#8b95a7',
    soft: '#f1f4f8',
  },
  {
    key: 'cf-green',
    min: 1200,
    max: 1399,
    label: '1200–1399',
    short: '1200–1399',
    chart: '1200s',
    color: '#1f9d55',
    soft: '#edfaf3',
  },
  {
    key: 'cf-cyan',
    min: 1400,
    max: 1599,
    label: '1400–1599',
    short: '1400–1599',
    chart: '1400s',
    color: '#0e9f9a',
    soft: '#eafaf8',
  },
  {
    key: 'cf-blue',
    min: 1600,
    max: 1899,
    label: '1600–1899',
    short: '1600–1899',
    chart: '1600s',
    color: '#3b6fe0',
    soft: '#edf3ff',
  },
  {
    key: 'cf-violet',
    min: 1900,
    max: 2099,
    label: '1900–2099',
    short: '1900–2099',
    chart: '1900s',
    color: '#8b5cf6',
    soft: '#f5f1ff',
  },
  {
    key: 'cf-orange',
    min: 2100,
    max: 2399,
    label: '2100–2399',
    short: '2100–2399',
    chart: '2100s',
    color: '#e8930c',
    soft: '#fff7e7',
  },
  {
    key: 'cf-red',
    min: 2400,
    max: 9999,
    label: '2400+',
    short: '2400+',
    chart: '2400+',
    color: '#e5484d',
    soft: '#fff0f1',
  },
];

const CF_RANK_RANGES = [
  [800, 1199, 'Newbie'],
  [1200, 1399, 'Pupil'],
  [1400, 1599, 'Specialist'],
  [1600, 1899, 'Expert'],
  [1900, 2099, 'Candidate Master'],
  [2100, 2399, 'Master'],
  [2400, 2599, 'International Master'],
  [2600, 2999, 'International Grandmaster'],
  [3000, 9999, 'Legendary Grandmaster'],
];

function cfBandStyle(min) {
  if (min < 1200) return { color: '#8b95a7', soft: '#f1f4f8' };
  if (min < 1400) return { color: '#1f9d55', soft: '#edfaf3' };
  if (min < 1600) return { color: '#0e9f9a', soft: '#eafaf8' };
  if (min < 1900) return { color: '#3b6fe0', soft: '#edf3ff' };
  if (min < 2100) return { color: '#8b5cf6', soft: '#f5f1ff' };
  if (min < 2400) return { color: '#e8930c', soft: '#fff7e7' };
  return { color: '#e5484d', soft: '#fff0f1' };
}

function cfRankLabel(min) {
  return (
    CF_RANK_RANGES.find(([low, high]) => min >= low && min <= high)?.[2] ||
    'Legendary Grandmaster'
  );
}

/**
 * Codeforces problem ratings use 100-point steps. The high range is split
 * explicitly instead of collapsing everything above 2400 into one bucket:
 * 2400-2499 ... 3300-3399 and 3400+, 11 bands in total.
 */
export const CF_RATING_BANDS = (() => {
  const bands = [];

  for (let min = 800; min <= 3300; min += 100) {
    const style = cfBandStyle(min);
    bands.push({
      key: `cf-band-${min}`,
      min,
      max: min + 99,
      label: `${min}–${min + 99}`,
      rank: cfRankLabel(min),
      color: style.color,
      soft: style.soft,
    });
  }

  const style = cfBandStyle(3400);
  bands.push({
    key: 'cf-band-3400',
    min: 3400,
    max: 9999,
    label: '3400+',
    rank: cfRankLabel(3400),
    color: style.color,
    soft: style.soft,
  });

  return bands;
})();

export const CF_BAND_GROUPS = [
  {
    key: 'foundation',
    title: '800–1599',
    subtitle: '基础与进阶',
    bands: CF_RATING_BANDS.filter((band) => band.min >= 800 && band.min < 1600),
  },
  {
    key: 'advanced',
    title: '1600–2399',
    subtitle: 'Expert → Master',
    bands: CF_RATING_BANDS.filter((band) => band.min >= 1600 && band.min < 2400),
  },
  {
    key: 'elite',
    title: '2400+',
    subtitle: '11 个细分档',
    bands: CF_RATING_BANDS.filter((band) => band.min >= 2400),
  },
];

export function cfRatingBand(difficulty) {
  if (difficulty == null || Number.isNaN(Number(difficulty))) return null;
  const rating = Number(difficulty);
  return (
    CF_RATING_BANDS.find(
      (band) => rating >= band.min && rating <= band.max,
    ) || null
  );
}

export const ATCODER_TIERS = [
  {
    key: 'at-gray',
    min: 0,
    max: 399,
    label: '0–399',
    short: '灰',
    chart: '<400',
    color: '#8492a6',
    soft: '#f1f4f8',
  },
  {
    key: 'at-brown',
    min: 400,
    max: 799,
    label: '400–799',
    short: '棕',
    chart: '400s',
    color: '#9a6638',
    soft: '#faf4ed',
  },
  {
    key: 'at-green',
    min: 800,
    max: 1199,
    label: '800–1199',
    short: '绿',
    chart: '800s',
    color: '#1f9d55',
    soft: '#edfaf3',
  },
  {
    key: 'at-cyan',
    min: 1200,
    max: 1599,
    label: '1200–1599',
    short: '青',
    chart: '1200s',
    color: '#0e9f9a',
    soft: '#eafaf8',
  },
  {
    key: 'at-blue',
    min: 1600,
    max: 1999,
    label: '1600–1999',
    short: '蓝',
    chart: '1600s',
    color: '#3b6fe0',
    soft: '#edf3ff',
  },
  {
    key: 'at-yellow',
    min: 2000,
    max: 2399,
    label: '2000–2399',
    short: '黄',
    chart: '2000s',
    color: '#c59b00',
    soft: '#fffaeb',
  },
  {
    key: 'at-orange',
    min: 2400,
    max: 2799,
    label: '2400–2799',
    short: '橙',
    chart: '2400s',
    color: '#e8930c',
    soft: '#fff7e7',
  },
  {
    key: 'at-red',
    min: 2800,
    max: 99999,
    label: '2800+',
    short: '红',
    chart: '2800+',
    color: '#e5484d',
    soft: '#fff0f1',
  },
];

export const TIERS = {
  luogu: LUOGU_TIERS,
  codeforces: CF_TIERS,
  atcoder: ATCODER_TIERS,
};

export function unknownTier(platform) {
  return {
    key: `${platform}-unknown`,
    min: null,
    max: null,
    label: '未定级',
    short: '未定级',
    chart: '未定级',
    color: UNKNOWN_COLOR,
    soft: UNKNOWN_SOFT,
    unknown: true,
  };
}

export function tierFor(platform, difficulty) {
  if (difficulty == null || Number.isNaN(Number(difficulty))) {
    return unknownTier(platform);
  }

  const tiers = TIERS[platform] || [];
  const rating = Number(difficulty);
  return (
    tiers.find((tier) => rating >= tier.min && rating <= tier.max) ||
    unknownTier(platform)
  );
}

export function tierListFor(platform, { includeUnknown = false } = {}) {
  return includeUnknown
    ? [...(TIERS[platform] || []), unknownTier(platform)]
    : TIERS[platform] || [];
}

export function ratingColor(platform, rating) {
  if (rating == null) return UNKNOWN_COLOR;
  return tierFor(platform, rating).color;
}

export function platformName(platform) {
  return PLATFORMS[platform]?.name || platform;
}

export function formatDifficulty(platform, difficulty) {
  if (difficulty == null) return '—';
  if (platform === 'luogu') return tierFor(platform, difficulty).short;
  return String(difficulty);
}

export function formatContestDate(value) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(value) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace('/', '.');
}

export function formatFullTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatNumber(value) {
  if (value == null || value === '') return '—';
  return new Intl.NumberFormat('en-US').format(value);
}
