import { AppError, cached, request, requestJson } from '../lib/http.js';

const RESOURCES = 'https://kenkoooo.com/atcoder/resources';
const API = 'https://kenkoooo.com/atcoder/atcoder-api/v3';
const USER_TTL = 10 * 60 * 1000;
const STATIC_TTL = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 500;

function validateHandle(raw) {
  const handle = String(raw ?? '').trim();
  if (!handle) {
    throw new AppError(400, 'INVALID_HANDLE', '请输入 AtCoder 用户名。');
  }
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(handle)) {
    throw new AppError(400, 'INVALID_HANDLE', 'AtCoder 用户名格式不正确。');
  }
  return handle;
}

function loadProblems() {
  return cached('atcoder:problems', STATIC_TTL, () =>
    requestJson(`${RESOURCES}/problems.json`),
  );
}

function loadModels() {
  return cached('atcoder:models', STATIC_TTL, () =>
    requestJson(`${RESOURCES}/problem-models.json`),
  );
}

function loadContests() {
  return cached('atcoder:contests', STATIC_TTL, () =>
    requestJson(`${RESOURCES}/contests.json`),
  );
}

function ensureUserExists(handle, force) {
  return cached(
    `atcoder:exists:${handle.toLowerCase()}`,
    STATIC_TTL,
    async () => {
      try {
        await request(`https://atcoder.jp/users/${encodeURIComponent(handle)}`, {
          timeout: 25_000,
          accept: 'text/html,application/xhtml+xml',
        });
        return true;
      } catch (error) {
        if (error?.details?.status === 404) return false;
        throw error;
      }
    },
    { force },
  );
}

function loadHistory(handle, force) {
  return cached(
    `atcoder:history:${handle.toLowerCase()}`,
    USER_TTL,
    async () => {
      try {
        const data = await requestJson(
          `https://atcoder.jp/users/${encodeURIComponent(handle)}/history/json`,
          { timeout: 25_000 },
        );
        return Array.isArray(data) ? data : [];
      } catch {
        // Rating history is a nice-to-have. Never fail the whole sync for it.
        return [];
      }
    },
    { force },
  );
}

function loadSubmissions(handle, force) {
  return cached(
    `atcoder:submissions:${handle.toLowerCase()}`,
    USER_TTL,
    async () => {
      const all = [];
      let from = 0;
      let previousFrom = -1;

      for (let page = 0; page < 40; page += 1) {
        const chunk = await requestJson(
          `${API}/user/submissions?user=${encodeURIComponent(handle)}&from_second=${from}`,
          { timeout: 50_000 },
        );

        if (!Array.isArray(chunk) || chunk.length === 0) break;
        all.push(...chunk);

        if (chunk.length < PAGE_SIZE) break;

        const lastSecond = chunk[chunk.length - 1]?.epoch_second;
        if (!Number.isFinite(lastSecond)) break;
        from = lastSecond + 1;
        if (from === previousFrom) break;
        previousFrom = from;
      }

      return all;
    },
    { force },
  );
}

function classifyContest(contestId = '') {
  const id = contestId.toLowerCase();
  if (id.startsWith('abc')) return ['abc'];
  if (id.startsWith('arc')) return ['arc'];
  if (id.startsWith('agc')) return ['agc'];
  if (id.startsWith('ahc')) return ['ahc'];
  if (id.startsWith('joi')) return ['joi'];
  if (id.startsWith('jag')) return ['jag'];
  if (id.startsWith('past')) return ['past'];
  if (id.startsWith('adt') || id.startsWith('awc')) return ['other'];
  return ['other'];
}

/**
 * Contest archive based on AtCoder Problems resources.
 */
export async function getAtCoderContests() {
  const [problems, models, contests] = await Promise.all([
    loadProblems(),
    loadModels(),
    loadContests(),
  ]);
  const contestById = new Map(contests.map((contest) => [contest.id, contest]));
  const grouped = new Map();

  for (const problem of problems) {
    if (!problem.contest_id) continue;
    const contestId = problem.contest_id;
    if (!grouped.has(contestId)) {
      const contest = contestById.get(contestId);
      grouped.set(contestId, {
        id: contestId,
        platform: 'atcoder',
        name: contest?.title || contestId,
        startTime: contest?.start_epoch_second || null,
        endTime: contest?.start_epoch_second
          ? contest.start_epoch_second + contest.duration_second
          : null,
        url: `https://atcoder.jp/contests/${contestId}`,
        categories: classifyContest(contestId),
        problems: [],
      });
    }

    const rawDifficulty = models?.[problem.id]?.difficulty;
    grouped.get(contestId).problems.push({
      id: problem.id,
      index: problem.problem_index || '',
      title: problem.name || problem.title || problem.id,
      difficulty: Number.isFinite(rawDifficulty)
        ? Math.max(0, Math.round(rawDifficulty))
        : null,
      url: `https://atcoder.jp/contests/${contestId}/tasks/${problem.id}`,
    });
  }

  const contestList = [...grouped.values()]
    .map((contest) => ({
      ...contest,
      problems: contest.problems.sort((a, b) =>
        String(a.index).localeCompare(String(b.index), 'en', { numeric: true }),
      ),
    }))
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

  return {
    platform: 'atcoder',
    contests: contestList,
    total: contestList.length,
    fetchedAt: new Date().toISOString(),
    source: 'AtCoder Problems / kenkoooo',
  };
}

export async function getAtCoder(rawHandle, { force = false } = {}) {
  const handle = validateHandle(rawHandle);

  const [exists, problems, models, contests, submissions, history] =
    await Promise.all([
      ensureUserExists(handle, force),
      loadProblems(),
      loadModels(),
      loadContests(),
      loadSubmissions(handle, force),
      loadHistory(handle, force),
    ]);

  if (!exists) {
    throw new AppError(404, 'ATCODER_USER_NOT_FOUND', `找不到 AtCoder 用户 @${handle}。`);
  }

  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const contestById = new Map(contests.map((contest) => [contest.id, contest]));
  const records = new Map();

  for (const submission of submissions) {
    const problem = problemById.get(submission.problem_id);
    if (!problem) continue;

    let record = records.get(submission.problem_id);
    if (!record) {
      record = {
        attempts: 0,
        solvedAt: null,
        contestId: submission.contest_id || problem.contest_id,
      };
      records.set(submission.problem_id, record);
    }

    record.attempts += 1;
    if (submission.result === 'AC') {
      if (record.solvedAt == null || submission.epoch_second < record.solvedAt) {
        record.solvedAt = submission.epoch_second;
      }
    }
  }

  const solvedProblems = [];
  for (const [problemId, record] of records) {
    if (record.solvedAt == null) continue;

    const meta = problemById.get(problemId);
    if (!meta) continue;

    const contestId = record.contestId || meta.contest_id;
    const contest = contestById.get(contestId);
    const rawDifficulty = models?.[problemId]?.difficulty;
    const difficulty = Number.isFinite(rawDifficulty)
      ? Math.max(0, Math.round(rawDifficulty))
      : null;

    solvedProblems.push({
      id: problemId,
      problemId,
      index: meta.problem_index || '',
      title: meta.name || meta.title || problemId,
      titleWithIndex: meta.title || meta.name || problemId,
      url: `https://atcoder.jp/contests/${contestId}/tasks/${problemId}`,
      contestId,
      contestName: contest?.title || contestId,
      contestUrl: `https://atcoder.jp/contests/${contestId}`,
      contestStart: contest?.start_epoch_second || null,
      difficulty,
      experimental: Boolean(models?.[problemId]?.is_experimental),
      tags: [],
      solvedAt: record.solvedAt,
      attempts: record.attempts,
    });
  }

  solvedProblems.sort((a, b) => b.solvedAt - a.solvedAt);

  const latestHistory = history.length
    ? history.reduce((latest, item) => {
        if (!latest) return item;
        return new Date(item.EndTime || 0) > new Date(latest.EndTime || 0)
          ? item
          : latest;
      }, null)
    : null;
  const maxRating = history.reduce((max, item) => {
    const rating = Number(item.NewRating);
    return Number.isFinite(rating) ? Math.max(max, rating) : max;
  }, 0);

  const profile = {
    handle,
    displayName: handle,
    avatar: null,
    rating: latestHistory ? Number(latestHistory.NewRating) || 0 : null,
    maxRating: history.length ? maxRating : null,
    ratedMatches: history.length,
    rank: null,
  };

  return {
    platform: 'atcoder',
    handle,
    profile,
    solved: solvedProblems,
    stats: {
      solvedCount: solvedProblems.length,
      contestCount: new Set(solvedProblems.map((problem) => problem.contestId)).size,
      submissionCount: submissions.length,
      ratedMatches: history.length,
      truncated: submissions.length >= PAGE_SIZE * 40,
    },
    fetchedAt: new Date().toISOString(),
    source: 'AtCoder Problems / kenkoooo',
  };
}
