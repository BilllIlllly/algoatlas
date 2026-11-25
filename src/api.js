const PROXY_PATH = '/api/proxy';

function apiUrl(path, query = {}) {
  const params = new URLSearchParams({ path });
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return `${PROXY_PATH}?${params.toString()}`;
}

async function fetchJson(path, fallbackMessage, { signal, query } = {}) {
  const response = await fetch(apiUrl(path, query), {
    signal,
    headers: { Accept: 'application/json' },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Handled below with a friendlier message.
  }

  if (!response.ok) {
    const message =
      payload?.error?.message || `${fallbackMessage}（HTTP ${response.status}）`;
    const error = new Error(message);
    error.code = payload?.error?.code || 'UNKNOWN';
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function fetchLuoguProblems({
  page = 1,
  keyword = '',
  difficulty = '',
  type = '',
  signal,
} = {}) {
  return fetchJson('/api/luogu/problems', '洛谷主题库加载失败', {
    signal,
    query: {
      page,
      keyword,
      difficulty,
      type,
    },
  });
}

export function getLuoguCookieStatus({ signal } = {}) {
  return fetchJson('/api/luogu/cookie', 'Cookie 状态读取失败', { signal });
}

export async function saveLuoguCookie(cookie, { signal } = {}) {
  const response = await fetch(apiUrl('/api/luogu/cookie'), {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cookie }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Handled below.
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || `Cookie 保存失败（HTTP ${response.status}）。`,
    );
    error.code = payload?.error?.code || 'UNKNOWN';
    throw error;
  }

  return payload;
}

export function fetchContestArchive(platform, { page = 1, signal } = {}) {
  if (platform === 'luogu') {
    return fetchJson('/api/luogu/contests', '洛谷比赛列表加载失败', {
      signal,
      query: { page },
    });
  }
  return fetchJson(`/api/${platform}/contests`, '比赛列表加载失败', { signal });
}

export async function fetchCodeforcesProblems({ signal } = {}) {
  return fetchJson('/api/codeforces/problems', '题库加载失败', { signal });
}

export async function fetchPlatform(
  platform,
  handle,
  { force = false, signal } = {},
) {
  return fetchJson(
    `/api/${platform}/${encodeURIComponent(handle)}`,
    '同步失败',
    {
      signal,
      query: force ? { refresh: '1' } : undefined,
    },
  );
}
