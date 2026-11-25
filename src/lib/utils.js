import { PLATFORM_ORDER, tierFor, tierListFor } from './platforms.js';

export function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export function pluralProblem(count) {
  return `${count} 题`;
}

export function buildDifficultyCounts(platform, solved = []) {
  const counts = new Map();
  for (const problem of solved) {
    const tier = tierFor(platform, problem.difficulty);
    counts.set(tier.key, (counts.get(tier.key) || 0) + 1);
  }
  return counts;
}

export function buildTierStats(platform, solved = []) {
  const counts = buildDifficultyCounts(platform, solved);
  const hasUnknown = (counts.get(`${platform}-unknown`) || 0) > 0;
  return tierListFor(platform, { includeUnknown: hasUnknown }).map((tier) => ({
    ...tier,
    count: counts.get(tier.key) || 0,
  }));
}

export function groupByContest(solved = []) {
  const groups = new Map();
  for (const problem of solved) {
    const id = problem.contestId || 'other';
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        name: problem.contestName || '其他题目',
        url: problem.contestUrl || null,
        start: problem.contestStart || 0,
        problems: [],
      });
    }
    groups.get(id).problems.push(problem);
  }

  for (const group of groups.values()) {
    group.problems.sort((a, b) => {
      const indexA = Number(a.index?.replace(/\D/g, '')) || 0;
      const indexB = Number(b.index?.replace(/\D/g, '')) || 0;
      if (indexA !== indexB) return indexA - indexB;
      return String(a.index).localeCompare(String(b.index));
    });
  }

  return [...groups.values()];
}

export function sortContestGroups(groups, mode = 'recent') {
  const sorted = [...groups];
  if (mode === 'difficulty') {
    sorted.sort((a, b) => {
      const maxA = Math.max(...a.problems.map((problem) => problem.difficulty ?? -1));
      const maxB = Math.max(...b.problems.map((problem) => problem.difficulty ?? -1));
      if (maxB !== maxA) return maxB - maxA;
      return b.start - a.start;
    });
    return sorted;
  }

  sorted.sort((a, b) => {
    if (b.start !== a.start) return b.start - a.start;
    return String(b.id).localeCompare(String(a.id));
  });
  return sorted;
}

export function matchesQuery(problem, query) {
  if (!query) return true;
  const haystack = [
    problem.title,
    problem.id,
    problem.problemId,
    problem.index,
    problem.contestName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function getRecentSolved(dataByPlatform, limit = 6) {
  const items = [];
  for (const platform of PLATFORM_ORDER) {
    const data = dataByPlatform[platform];
    if (!data?.solved) continue;
    for (const problem of data.solved) {
      if (!problem.solvedAt) continue;
      items.push({ ...problem, platform });
    }
  }
  return items.sort((a, b) => b.solvedAt - a.solvedAt).slice(0, limit);
}

export function meanDifficulty(solved = []) {
  const values = solved
    .map((problem) => problem.difficulty)
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function highestDifficulty(platform, solved = []) {
  const values = solved
    .map((problem) => problem.difficulty)
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return tierFor(platform, Math.max(...values));
}

export function difficultyLevel(platform, solved = []) {
  const values = solved
    .map((problem) => problem.difficulty)
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Math.max(...values);
}

export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildActivityMap(dataByPlatform) {
  const map = new Map();
  for (const platform of PLATFORM_ORDER) {
    for (const problem of dataByPlatform[platform]?.solved || []) {
      if (!problem.solvedAt) continue;
      const date = new Date(problem.solvedAt * 1000);
      const key = localDateKey(date);
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return map;
}

export function buildHeatmap(activityMap, weeks = 53) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));

  // Align to Monday so each column is a full calendar week.
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);

  const columns = [];
  let cursor = new Date(start);
  let total = 0;
  let max = 0;
  let activeDays = 0;
  const cells = [];

  for (let week = 0; week < weeks; week += 1) {
    const column = [];
    for (let weekDay = 0; weekDay < 7; weekDay += 1) {
      const key = localDateKey(cursor);
      const count = activityMap.get(key) || 0;
      const future = cursor > end;
      column.push({ date: new Date(cursor), key, count, future });
      if (!future && count > 0) {
        total += count;
        activeDays += 1;
        if (count > max) max = count;
      }
      cells.push({ ...column[column.length - 1], week, weekDay });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(column);
  }

  const monthLabels = [];
  let lastMonth = -1;
  for (let week = 0; week < columns.length; week += 1) {
    const first = columns[week].find((cell) => !cell.future);
    if (!first) continue;
    const month = first.date.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        week,
        label: `${month + 1}月`,
      });
      lastMonth = month;
    }
  }

  return {
    columns,
    cells,
    monthLabels,
    total,
    max,
    activeDays,
    start,
    end,
  };
}

export function currentStreak(activityMap) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // A day without a submission yet should not immediately break yesterday's streak.
  if (!activityMap.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (activityMap.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function buildUrl(platform, handle) {
  return `/api/${platform}/${encodeURIComponent(handle)}`;
}

export function arrayFromSet(value) {
  return value instanceof Set ? [...value] : [];
}
