import { AppError, cached, requestJson, sleep } from '../lib/http.js';

const API = 'https://codeforces.com/api';
const USER_TTL = 10 * 60 * 1000;
const STATIC_TTL = 6 * 60 * 60 * 1000;
const REQUEST_GAP = 420;
const PAGE_SIZE = 10_000;

function validateHandle(raw) {
  const handle = String(raw ?? '').trim();
  if (!handle) {
    throw new AppError(400, 'INVALID_HANDLE', '请输入 Codeforces 用户名。');
  }
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(handle)) {
    throw new AppError(400, 'INVALID_HANDLE', 'Codeforces 用户名格式不正确。');
  }
  return handle;
}

async function cf(method, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API}/${method}${query ? `?${query}` : ''}`;
  const payload = await requestJson(url, { allowHttpError: true });

  if (payload?.status !== 'OK') {
    const comment = payload?.comment || '未知错误';
    const notFound =
      /not found|no such/i.test(comment) ||
      /handle/i.test(comment) && /found/i.test(comment);
    const attemptedHandle = params.handles || params.handle || '';
    throw new AppError(
      notFound ? 404 : 502,
      notFound ? 'CF_USER_NOT_FOUND' : 'CF_API_ERROR',
      notFound
        ? `找不到 Codeforces 用户 @${attemptedHandle}。`
        : `Codeforces API：${comment}`,
    );
  }

  return payload.result;
}

function loadProblemset() {
  return cached('cf:problemset', STATIC_TTL, async () => {
    const result = await cf('problemset.problems');
    return {
      problems: Array.isArray(result.problems) ? result.problems : [],
      statistics: Array.isArray(result.problemStatistics)
        ? result.problemStatistics
        : [],
    };
  });
}

function loadContests() {
  return cached('cf:contests', STATIC_TTL, async () => {
    const result = await cf('contest.list', { gym: 'false' });
    return result || [];
  });
}

async function loadUserInfo(handle, force) {
  return cached(
    `cf:info:${handle.toLowerCase()}`,
    USER_TTL,
    async () => {
      const result = await cf('user.info', { handles: handle });
      const user = result?.[0];
      if (!user) {
        throw new AppError(404, 'CF_USER_NOT_FOUND', `找不到 Codeforces 用户 @${handle}。`);
      }
      return user;
    },
    { force },
  );
}

async function loadUserSubmissions(handle, force) {
  return cached(
    `cf:status:${handle.toLowerCase()}`,
    USER_TTL,
    async () => {
      const all = [];
      let from = 1;

      for (let page = 0; page < 4; page += 1) {
        const chunk = await cf('user.status', {
          handle,
          from: String(from),
          count: String(PAGE_SIZE),
        });

        if (!Array.isArray(chunk)) break;
        all.push(...chunk);

        if (chunk.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
        await sleep(REQUEST_GAP);
      }

      return all;
    },
    { force },
  );
}

export async function getCodeforces(rawHandle, { force = false } = {}) {
  const handle = validateHandle(rawHandle);

  const user = await loadUserInfo(handle, force);
  await sleep(REQUEST_GAP);

  const submissionsPromise = loadUserSubmissions(handle, force);
  const infoPromise = Promise.all([loadProblemset(), loadContests()]).then(
    ([problemset, contests]) => ({ problemset, contests }),
  );

  const [submissions, staticData] = await Promise.all([
    submissionsPromise,
    infoPromise,
  ]);

  const { problemset, contests } = staticData;
  const { problems } = problemset;
  const contestById = new Map(contests.map((contest) => [contest.id, contest]));
  const problemById = new Map(
    problems.map((problem) => [`${problem.contestId}-${problem.index}`, problem]),
  );

  const records = new Map();
  for (const submission of submissions) {
    const problem = submission?.problem;
    if (!problem || problem.contestId == null || !problem.index) continue;

    const key = `${problem.contestId}-${problem.index}`;
    let record = records.get(key);
    if (!record) {
      record = {
        key,
        attempts: 0,
        solvedAt: null,
        lastAttemptAt: null,
      };
      records.set(key, record);
    }

    record.attempts += 1;
    if (
      record.lastAttemptAt == null ||
      submission.creationTimeSeconds > record.lastAttemptAt
    ) {
      record.lastAttemptAt = submission.creationTimeSeconds;
    }
    if (submission.verdict === 'OK') {
      if (record.solvedAt == null || submission.creationTimeSeconds < record.solvedAt) {
        record.solvedAt = submission.creationTimeSeconds;
      }
    }
  }

  const solvedProblems = [];
  const attemptedProblems = [];

  for (const [key, record] of records) {
    const meta = problemById.get(key);
    if (!meta) continue;

    const contest = contestById.get(meta.contestId);
    const contestName = contest?.name || `Codeforces ${meta.contestId}`;
    const baseProblem = {
      id: `${meta.contestId}${meta.index}`,
      problemId: `${meta.contestId}-${meta.index}`,
      index: meta.index,
      title: meta.name,
      url: `https://codeforces.com/contest/${meta.contestId}/problem/${meta.index}`,
      contestId: String(meta.contestId),
      contestName,
      contestUrl: `https://codeforces.com/contest/${meta.contestId}`,
      contestStart: contest?.startTimeSeconds || null,
      contestType: meta.type || 'PROGRAMMING',
      difficulty: Number.isFinite(meta.rating) ? meta.rating : null,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      attempts: record.attempts,
    };

    if (record.solvedAt == null) {
      attemptedProblems.push({
        ...baseProblem,
        lastAttemptAt: record.lastAttemptAt,
      });
    } else {
      solvedProblems.push({
        ...baseProblem,
        solvedAt: record.solvedAt,
      });
    }
  }

  solvedProblems.sort((a, b) => b.solvedAt - a.solvedAt);
  attemptedProblems.sort((a, b) => b.lastAttemptAt - a.lastAttemptAt);

  const contestCount = new Set(solvedProblems.map((problem) => problem.contestId)).size;
  const profile = {
    handle: user.handle,
    displayName: user.handle,
    avatar: user.avatar || user.titlePhoto || null,
    rating: Number.isFinite(user.rating) ? user.rating : null,
    maxRating: Number.isFinite(user.maxRating) ? user.maxRating : null,
    rank: user.rank || null,
    maxRank: user.maxRank || null,
    country: user.country || null,
    organization: user.organization || null,
    friends: user.friendOfCount ?? null,
    registeredAt: user.registrationTimeSeconds || null,
  };

  return {
    platform: 'codeforces',
    handle: user.handle,
    profile,
    solved: solvedProblems,
    attempted: attemptedProblems,
    stats: {
      solvedCount: solvedProblems.length,
      attemptedCount: attemptedProblems.length,
      contestCount,
      submissionCount: submissions.length,
      truncated: submissions.length >= PAGE_SIZE * 4,
    },
    fetchedAt: new Date().toISOString(),
    source: 'Codeforces 官方 API',
  };
}

function classifyContest(name = '') {
  const categories = [];
  if (/\bdiv\.?\s*1\b/i.test(name)) categories.push('div1');
  if (/\bdiv\.?\s*2\b/i.test(name)) categories.push('div2');
  if (/\bdiv\.?\s*3\b/i.test(name)) categories.push('div3');
  if (/\bdiv\.?\s*4\b/i.test(name)) categories.push('div4');
  if (/educational/i.test(name)) categories.push('educational');
  if (/global/i.test(name)) categories.push('global');
  if (/kotlin/i.test(name)) categories.push('kotlin');
  if (categories.length === 0) categories.push('other');
  return categories;
}

/**
 * Contest archive for the CFTracker-style table view.
 */
export async function getCodeforcesContests() {
  const [{ problems }, contests] = await Promise.all([
    loadProblemset(),
    loadContests(),
  ]);
  const contestById = new Map(contests.map((contest) => [contest.id, contest]));
  const grouped = new Map();

  for (const problem of problems) {
    if (problem.contestId == null || !problem.index) continue;
    const contestId = String(problem.contestId);
    if (!grouped.has(contestId)) {
      const contest = contestById.get(problem.contestId);
      grouped.set(contestId, {
        id: contestId,
        platform: 'codeforces',
        name: contest?.name || `Codeforces ${contestId}`,
        startTime: contest?.startTimeSeconds || null,
        endTime: contest ? contest.startTimeSeconds + contest.durationSeconds : null,
        url: `https://codeforces.com/contest/${contestId}`,
        categories: classifyContest(contest?.name || ''),
        problems: [],
      });
    }

    grouped.get(contestId).problems.push({
      id: String(problem.contestId) + problem.index,
      index: problem.index,
      title: problem.name,
      difficulty: Number.isFinite(problem.rating) ? problem.rating : null,
      url: `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`,
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
    platform: 'codeforces',
    contests: contestList,
    total: contestList.length,
    fetchedAt: new Date().toISOString(),
    source: 'Codeforces Problemset & Contest API',
  };
}

/**
 * Full Codeforces problemset for the problem-list view.
 */
export async function getCodeforcesProblems() {
  const [{ problems, statistics }, contests] = await Promise.all([
    loadProblemset(),
    loadContests(),
  ]);

  const contestById = new Map(contests.map((contest) => [contest.id, contest]));
  const solvedCountByKey = new Map(
    statistics.map((stat) => [
      `${stat.contestId}-${stat.index}`,
      stat.solvedCount,
    ]),
  );

  const list = problems
    .map((problem) => {
      const contest = contestById.get(problem.contestId);
      const key = `${problem.contestId}-${problem.index}`;
      return {
        id: `${problem.contestId}${problem.index}`,
        problemId: key,
        contestId: String(problem.contestId),
        index: problem.index,
        title: problem.name,
        url: `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`,
        contestName: contest?.name || `Codeforces ${problem.contestId}`,
        contestStart: contest?.startTimeSeconds || null,
        difficulty: Number.isFinite(problem.rating) ? problem.rating : null,
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        solvedCount: solvedCountByKey.get(key) || 0,
      };
    })
    .sort((a, b) => b.solvedCount - a.solvedCount);

  return {
    platform: 'codeforces',
    problems: list,
    total: list.length,
    fetchedAt: new Date().toISOString(),
    source: 'Codeforces Problemset API',
  };
}
