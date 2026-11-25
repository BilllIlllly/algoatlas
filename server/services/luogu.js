import {
  AppError,
  CookieJar,
  cached,
  clearCache,
  requestJson,
  requestText,
} from '../lib/http.js';

const BASE = 'https://www.luogu.com.cn';
const USER_TTL = 10 * 60 * 1000;
const CONTEST_TTL = 6 * 60 * 60 * 1000;
const PROBLEM_TTL = 30 * 60 * 1000;
const cookieJar = new CookieJar();
let sessionCookie = '';
const LENTILLE_PATTERN =
  /<script id="lentille-context" type="application\/json">([\s\S]*?)<\/script>/i;

function luoguHeaders(referer) {
  const headers = {
    Referer: referer,
    'x-luogu-type': 'content-only',
  };
  if (sessionCookie) headers.Cookie = sessionCookie;
  return headers;
}

export function getLuoguCookieStatus() {
  return {
    configured: Boolean(sessionCookie),
    length: sessionCookie.length,
  };
}

export function setLuoguSessionCookie(rawCookie) {
  const value = String(rawCookie ?? '')
    .replace(/^\s*cookie\s*:\s*/i, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (value.length > 8192) {
    throw new AppError(400, 'INVALID_COOKIE', 'Cookie 过长。');
  }

  sessionCookie = value;
  clearCache('luogu:practice:');
  clearCache('luogu:contest:');
  clearCache('luogu:contest-list:');
  clearCache('luogu:problems:');

  return getLuoguCookieStatus();
}

function validateHandle(raw) {
  const handle = String(raw ?? '').trim();
  if (!handle) {
    throw new AppError(400, 'INVALID_HANDLE', '请输入洛谷用户名或 UID。');
  }
  if (handle.length > 64) {
    throw new AppError(400, 'INVALID_HANDLE', '洛谷用户名过长。');
  }
  return handle;
}

function parseLentille(html) {
  const match = html.match(LENTILLE_PATTERN);
  if (!match) {
    throw new AppError(
      502,
      'LUOGU_PARSE_ERROR',
      '洛谷返回了无法识别的页面，可能被风控拦截，请稍后重试。',
    );
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    throw new AppError(502, 'LUOGU_PARSE_ERROR', '洛谷页面数据解析失败，请稍后重试。');
  }
}

async function resolveUser(rawHandle) {
  if (/^\d+$/.test(rawHandle)) {
    return { uid: Number(rawHandle), name: null, matchedBy: 'uid' };
  }

  const payload = await requestJson(
    `${BASE}/api/user/search?keyword=${encodeURIComponent(rawHandle)}`,
    {
      cookieJar,
      headers: luoguHeaders(`${BASE}/`),
    },
  );

  const users = Array.isArray(payload?.users) ? payload.users : [];
  if (users.length === 0) {
    throw new AppError(404, 'LUOGU_USER_NOT_FOUND', `找不到洛谷用户「${rawHandle}」。`);
  }

  const exact = users.find(
    (user) => String(user.name).toLowerCase() === rawHandle.toLowerCase(),
  );
  const user = exact || users[0];

  return {
    uid: Number(user.uid),
    name: user.name,
    matchedBy: exact ? 'name' : 'search',
  };
}

async function loadPractice(uid, force) {
  return cached(
    `luogu:practice:${uid}`,
    USER_TTL,
    async () => {
      const html = await requestText(`${BASE}/user/${uid}/practice`, {
        cookieJar,
        headers: luoguHeaders(`${BASE}/user/${uid}`),
      });
      const payload = parseLentille(html);

      if (payload?.template && payload.template !== 'user.show') {
        throw new AppError(502, 'LUOGU_PARSE_ERROR', '洛谷返回了未知的页面结构。');
      }

      const data = payload?.data || {};
      if (!data.user) {
        throw new AppError(404, 'LUOGU_USER_NOT_FOUND', '找不到该洛谷用户。');
      }

      if (data.privacy === true && !Array.isArray(data.passed)) {
        throw new AppError(
          403,
          'LUOGU_PRIVATE',
          '该洛谷用户隐藏了练习情况，暂时无法读取通过题目。',
        );
      }

      return {
        user: data.user,
        passed: Array.isArray(data.passed) ? data.passed : [],
        submitted: Array.isArray(data.submitted) ? data.submitted : [],
        privacy: Boolean(data.privacy),
      };
    },
    { force },
  );
}

function loadContestListPage(page) {
  return cached(`luogu:contest-list:${page}`, CONTEST_TTL, async () => {
    const html = await requestText(`${BASE}/contest/list?page=${page}`, {
      cookieJar,
      headers: luoguHeaders(`${BASE}/contest/list`),
    });
    const payload = parseLentille(html);
    const contests = payload?.data?.contests;
    if (!contests) {
      throw new AppError(502, 'LUOGU_PARSE_ERROR', '洛谷比赛列表解析失败。');
    }
    return contests;
  });
}

function loadContestDetail(contestId) {
  return cached(`luogu:contest:${contestId}`, CONTEST_TTL, async () => {
    const html = await requestText(`${BASE}/contest/${contestId}`, {
      cookieJar,
      headers: luoguHeaders(`${BASE}/contest/${contestId}`),
    });
    return parseLentille(html)?.data || null;
  });
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

function contestCategory(hostName = '') {
  return hostName.includes('洛谷官方') ? ['official'] : ['community'];
}

/**
 * Luogu contest archive. The list API only exposes the basic contest data, so
 * detail pages are loaded for the visible page and cached per contest.
 */
export async function getLuoguContests(rawPage = 1) {
  const page = Math.min(
    10_000,
    Math.max(1, Number.parseInt(rawPage, 10) || 1),
  );
  const list = await loadContestListPage(page);
  const perPage = list.perPage || 20;
  const totalPages = Math.max(1, Math.ceil((list.count || 0) / perPage));
  const now = Date.now();
  const candidates = (list.result || []).filter(
    (contest) =>
      contest.problemCount > 0 &&
      contest.endTime &&
      contest.endTime * 1000 <= now,
  );

  const details = await mapWithLimit(candidates, 4, async (contest) => {
    try {
      const detail = await loadContestDetail(contest.id);
      const problems = (detail?.contestProblems || [])
        .map((item) => ({
          id: item.problem?.pid,
          index: item.no || '',
          title: item.problem?.name || item.problem?.pid || '',
          difficulty: Number.isFinite(item.problem?.difficulty)
            ? item.problem.difficulty
            : null,
          url: item.problem?.pid
            ? `${BASE}/problem/${encodeURIComponent(item.problem.pid)}`
            : null,
        }))
        .filter((problem) => problem.id && problem.url)
        .sort((a, b) =>
          String(a.index).localeCompare(String(b.index), 'en', {
            numeric: true,
          }),
        );

      if (!problems.length) return null;

      return {
        id: String(contest.id),
        platform: 'luogu',
        name: contest.name,
        startTime: contest.startTime || null,
        endTime: contest.endTime || null,
        url: `${BASE}/contest/${contest.id}`,
        categories: contestCategory(contest.host?.name || ''),
        host: contest.host?.name || null,
        participants: contest.totalParticipants ?? null,
        problems,
      };
    } catch {
      return null;
    }
  });

  const contests = details.filter(Boolean);
  return {
    platform: 'luogu',
    contests,
    page,
    perPage,
    totalPages,
    totalCount: list.count || 0,
    endedOnPage: candidates.length,
    fetchedAt: new Date().toISOString(),
    source: '洛谷公开比赛数据',
  };
}

const PROBLEM_TYPES = new Set(['P', 'B', 'CF', 'AT', 'SP', 'UVA', 'T']);

function cleanProblemQuery({ page, keyword, difficulty, type }) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedKeyword = String(keyword ?? '').trim().slice(0, 100);
  const normalizedType = String(type ?? '').trim().toUpperCase();
  const normalizedDifficulty = String(difficulty ?? '').trim();

  if (normalizedType && !PROBLEM_TYPES.has(normalizedType)) {
    throw new AppError(400, 'INVALID_TYPE', '不支持的洛谷题目类型。');
  }
  if (
    normalizedDifficulty &&
    (!/^[0-8]$/.test(normalizedDifficulty) ||
      Number.isNaN(Number(normalizedDifficulty)))
  ) {
    throw new AppError(400, 'INVALID_DIFFICULTY', '不支持的洛谷难度。');
  }

  return {
    page: pageNumber,
    keyword: normalizedKeyword,
    difficulty: normalizedDifficulty,
    type: normalizedType,
  };
}

function loadProblemListPage(query) {
  return cached(
    `luogu:problems:${query.page}:${query.keyword}:${query.difficulty}:${query.type}`,
    PROBLEM_TTL,
    async () => {
      const params = new URLSearchParams({ page: String(query.page) });
      if (query.keyword) params.set('keyword', query.keyword);
      if (query.difficulty !== '') params.set('difficulty', query.difficulty);
      if (query.type) params.set('type', query.type);

      const html = await requestText(
        `${BASE}/problem/list?${params.toString()}`,
        {
          cookieJar,
          headers: luoguHeaders(`${BASE}/problem/list`),
        },
      );
      const payload = parseLentille(html);
      const problems = payload?.data?.problems;
      if (!problems) {
        throw new AppError(502, 'LUOGU_PARSE_ERROR', '洛谷主题库解析失败。');
      }
      return problems;
    },
  );
}

/**
 * Luogu main problem archive ("主题库"). The public list endpoint supports
 * keyword/type/difficulty filters and 50 problems per page, so pagination is
 * handled server-side instead of pulling all 18k problems at once.
 */
export async function getLuoguProblems(input = {}) {
  const query = cleanProblemQuery(input);
  const data = await loadProblemListPage(query);
  const perPage = data.perPage || 50;
  const totalCount = data.count || 0;

  const problems = (data.result || []).map((problem) => {
    const pid = String(problem.pid || '');
    return {
      id: pid,
      problemId: pid,
      type: problem.type || pid.match(/^[A-Za-z]+/)?.[0] || '',
      title: problem.name || pid,
      difficulty: Number.isFinite(problem.difficulty)
        ? problem.difficulty
        : null,
      totalSubmit: problem.totalSubmit ?? null,
      totalAccepted: problem.totalAccepted ?? null,
      provider: problem.provider?.name || null,
      url: `${BASE}/problem/${encodeURIComponent(pid)}`,
    };
  });

  return {
    platform: 'luogu',
    problems,
    page: query.page,
    perPage,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    filters: {
      keyword: query.keyword,
      difficulty: query.difficulty,
      type: query.type,
    },
    cookieConfigured: Boolean(sessionCookie),
    fetchedAt: new Date().toISOString(),
    source: '洛谷主题库',
  };
}

export async function getLuogu(rawHandle, { force = false } = {}) {
  const handle = validateHandle(rawHandle);
  const resolved = await resolveUser(handle);
  const practice = await loadPractice(resolved.uid, force);

  if (practice.privacy && practice.passed.length === 0) {
    throw new AppError(
      403,
      'LUOGU_PRIVATE',
      '该洛谷用户隐藏了练习情况，暂时无法读取通过题目。',
    );
  }

  const unique = new Map();
  for (const problem of practice.passed) {
    if (!problem?.pid) continue;
    unique.set(problem.pid, problem);
  }

  const solved = [...unique.values()]
    .map((problem) => {
      const pid = String(problem.pid);
      const type = problem.type || pid.match(/^[A-Za-z]+/)?.[0] || 'P';
      return {
        id: pid,
        problemId: pid,
        index: pid,
        title: problem.name || pid,
        url: `${BASE}/problem/${encodeURIComponent(pid)}`,
        difficulty: Number.isFinite(problem.difficulty) ? problem.difficulty : 0,
        type,
        tags: [],
        contestId: null,
        contestName: null,
        contestStart: null,
        solvedAt: null,
        attempts: null,
      };
    })
    .sort((a, b) => {
      if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
      return a.id.localeCompare(b.id, 'en', { numeric: true });
    });

  const user = practice.user;
  const profile = {
    handle: user.name || String(resolved.uid),
    displayName: user.name || `UID ${resolved.uid}`,
    uid: user.uid,
    avatar: user.avatar || null,
    slogan: user.slogan || '',
    color: user.color || null,
    ranking: user.ranking || null,
    followerCount: user.followerCount ?? null,
    followingCount: user.followingCount ?? null,
    registeredAt: user.registerTime || null,
    passedProblemCount: user.passedProblemCount ?? null,
    submittedProblemCount: user.submittedProblemCount ?? null,
    privacy: practice.privacy,
  };

  return {
    platform: 'luogu',
    handle: profile.handle,
    profile,
    solved,
    stats: {
      solvedCount: solved.length,
      submittedCount: practice.submitted.length,
      difficultyCount: solved.reduce((acc, problem) => {
        acc[problem.difficulty] = (acc[problem.difficulty] || 0) + 1;
        return acc;
      }, {}),
    },
    fetchedAt: new Date().toISOString(),
    source: '洛谷公开练习数据',
  };
}
