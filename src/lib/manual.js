import { PLATFORM_ORDER } from './platforms.js';

export const MANUAL_STORAGE_KEY = 'algatlas.manual.v1';

export function emptyManual() {
  return {
    luogu: [],
    codeforces: [],
    atcoder: [],
  };
}

export function manualProblemKey(platform, problem) {
  if (!problem) return '';
  if (platform === 'codeforces') {
    return String(problem.problemId || problem.id || '');
  }
  if (platform === 'atcoder') {
    return String(problem.problemId || problem.id || '');
  }
  return String(problem.id || '');
}

function toSeconds(value) {
  if (Number.isFinite(value)) {
    return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  return Math.floor(Date.now() / 1000);
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeManualEntry(platform, raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || raw.problemId || '').trim();
  if (!id) return null;

  const title = String(raw.title || id).trim() || id;
  const difficulty = numberOrNull(raw.difficulty);
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(String).filter(Boolean)
    : [];
  const addedAt = toSeconds(raw.addedAt);
  const base = {
    id,
    problemId: id,
    title,
    difficulty,
    tags,
    manual: true,
    addedAt,
    solvedAt: null,
    attempts: null,
    accounts: [],
    accountSolvedAt: [],
  };

  if (platform === 'codeforces') {
    let contestId = raw.contestId ? String(raw.contestId) : '';
    let index = raw.index ? String(raw.index) : '';
    const match = !contestId && id.match(/^(\d+)([A-Za-z][0-9]?)$/);
    if (match) {
      contestId = match[1];
      index = match[2].toUpperCase();
    }

    const url =
      raw.url ||
      (contestId && index
        ? `https://codeforces.com/contest/${contestId}/problem/${index}`
        : 'https://codeforces.com/problemset');

    return {
      ...base,
      problemId: contestId && index ? `${contestId}-${index}` : id,
      contestId: contestId || null,
      index: index || '',
      url,
      contestName: raw.contestName || (contestId ? `Codeforces ${contestId}` : '手动补录'),
      contestUrl: contestId
        ? `https://codeforces.com/contest/${contestId}`
        : null,
      contestStart: numberOrNull(raw.contestStart),
      contestType: 'PROGRAMMING',
    };
  }

  if (platform === 'atcoder') {
    const contestId = raw.contestId || id.split('_')[0] || '';
    return {
      ...base,
      contestId: contestId || null,
      index: raw.index || '',
      url:
        raw.url ||
        (contestId
          ? `https://atcoder.jp/contests/${contestId}/tasks/${id}`
          : 'https://atcoder.jp/contests/'),
      contestName: raw.contestName || contestId || '手动补录',
      contestUrl: contestId
        ? `https://atcoder.jp/contests/${contestId}`
        : null,
      contestStart: numberOrNull(raw.contestStart),
    };
  }

  const type = raw.type || id.match(/^[A-Za-z]+/)?.[0] || 'P';
  return {
    ...base,
    type,
    url: raw.url || `https://www.luogu.com.cn/problem/${encodeURIComponent(id)}`,
    contestId: null,
    contestName: null,
    contestStart: null,
  };
}

export function normalizeManual(raw) {
  const result = emptyManual();
  if (!raw || typeof raw !== 'object') return result;

  for (const platform of PLATFORM_ORDER) {
    const seen = new Set();
    const list = Array.isArray(raw[platform]) ? raw[platform] : [];
    for (const item of list) {
      const entry = normalizeManualEntry(platform, item);
      if (!entry) continue;
      const key = manualProblemKey(platform, entry);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result[platform].push(entry);
    }
  }

  return result;
}

export function addManualEntry(list, platform, entry) {
  const normalized = normalizeManualEntry(platform, entry);
  if (!normalized) return list;
  const key = manualProblemKey(platform, normalized);
  if (list.some((item) => manualProblemKey(platform, item) === key)) {
    return list;
  }
  return [...list, normalized];
}

export function removeManualEntry(list, platform, problemKey) {
  return list.filter((item) => manualProblemKey(platform, item) !== problemKey);
}

/**
 * Adds locally recorded problems to a platform snapshot. Synced problems win;
 * manual duplicates are ignored.
 */
export function applyManualProblems(platform, data, manualList = []) {
  if (!manualList.length) return data;

  const base = data || {
    platform,
    handle: '',
    handles: [],
    profile: {
      handle: '',
      displayName: '手动补题',
      avatar: null,
    },
    profiles: [],
    solved: [],
    attempted: [],
    stats: {
      solvedCount: 0,
      attemptedCount: 0,
      accountCount: 0,
      contestCount: 0,
      submissionCount: 0,
    },
    fetchedAt: new Date().toISOString(),
    source: '手动补题记录',
    manualOnly: true,
  };

  const existingKeys = new Set(
    (base.solved || []).map((problem) => manualProblemKey(platform, problem)),
  );
  const manualSolved = [];

  for (const item of manualList) {
    const key = manualProblemKey(platform, item);
    if (!key || existingKeys.has(key)) continue;
    existingKeys.add(key);
    manualSolved.push(item);
  }

  if (!manualSolved.length) return base;

  const solved = [...(base.solved || []), ...manualSolved];
  const contestCount = new Set(
    solved.map((problem) => problem.contestId).filter(Boolean),
  ).size;

  return {
    ...base,
    solved,
    stats: {
      ...(base.stats || {}),
      solvedCount: solved.length,
      contestCount,
      manualCount: manualSolved.length,
    },
    source: base.source || '手动补题记录',
  };
}

export function manualFromExplorerProblem(platform, problem) {
  return normalizeManualEntry(platform, {
    ...problem,
    difficulty: problem.rating ?? problem.difficulty,
    addedAt: Date.now() / 1000,
  });
}
