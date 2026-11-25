const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A deliberately small cookie jar. Luogu hands out a short-lived cookie through
 * a same-URL redirect before serving its public JSON endpoints; Node's fetch
 * does not keep cookies between redirects, so we follow redirects ourselves.
 */
export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(url, setCookies = []) {
    const hostname = new URL(url).hostname.toLowerCase();

    for (const raw of setCookies) {
      const pieces = String(raw).split(';');
      const pair = pieces.shift()?.trim();
      if (!pair || !pair.includes('=')) continue;

      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!name) continue;

      let domain = hostname;
      let path = '/';
      for (const piece of pieces) {
        const [key, ...rest] = piece.trim().split('=');
        const lower = key.toLowerCase();
        if (lower === 'domain' && rest.length) {
          domain = rest.join('=').replace(/^\./, '').toLowerCase();
        } else if (lower === 'path' && rest.length) {
          path = rest.join('=');
        }
      }

      this.cookies.set(`${domain}|${path}|${name}`, { name, value, domain, path });
    }
  }

  headerFor(url) {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname || '/';
    const matches = [];

    for (const cookie of this.cookies.values()) {
      const domainMatches =
        hostname === cookie.domain || hostname.endsWith(`.${cookie.domain}`);
      if (domainMatches && path.startsWith(cookie.path)) matches.push(cookie);
    }

    matches.sort((a, b) => b.path.length - a.path.length);
    return matches.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }
}

function errorFromFetch(error) {
  if (error?.name === 'TimeoutError') {
    return new AppError(504, 'UPSTREAM_TIMEOUT', '上游站点响应超时，请稍后重试。');
  }
  return new AppError(502, 'UPSTREAM_UNREACHABLE', '无法连接上游站点，请检查网络后重试。');
}

async function fetchWithCookies(url, init, cookieJar, signal) {
  let currentUrl = url;
  let method = init.method || 'GET';
  let body = init.body;
  const suppliedCookie = new Headers(init.headers).get('Cookie') || '';

  for (let hop = 0; hop < 10; hop += 1) {
    const headers = new Headers(init.headers);
    const cookie = [cookieJar.headerFor(currentUrl), suppliedCookie]
      .filter(Boolean)
      .join('; ');
    if (cookie) headers.set('Cookie', cookie);

    const response = await fetch(currentUrl, {
      ...init,
      method,
      body,
      headers,
      signal,
      redirect: 'manual',
    });

    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [];
    if (setCookies.length) cookieJar.store(currentUrl, setCookies);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;

      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) && method === 'POST')
      ) {
        method = 'GET';
        body = undefined;
      }

      currentUrl = new URL(location, currentUrl).toString();
      try {
        await response.body?.cancel();
      } catch {
        // The redirect body is irrelevant.
      }
      continue;
    }

    return response;
  }

  throw new AppError(502, 'UPSTREAM_REDIRECT_LOOP', '上游站点重定向次数过多。');
}

export async function request(url, options = {}) {
  const {
    timeout = 35_000,
    headers = {},
    accept = 'application/json, text/plain, */*',
    cookieJar = null,
    allowHttpError = false,
  } = options;

  let response;
  const signal = AbortSignal.timeout(timeout);
  const init = {
    headers: { ...DEFAULT_HEADERS, Accept: accept, ...headers },
    signal,
  };

  try {
    response = cookieJar
      ? await fetchWithCookies(url, init, cookieJar, signal)
      : await fetch(url, { ...init, redirect: 'follow' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw errorFromFetch(error);
  }

  if (!response.ok && !allowHttpError) {
    throw new AppError(
      502,
      'UPSTREAM_HTTP_ERROR',
      `上游站点返回 HTTP ${response.status}，请稍后重试。`,
      { status: response.status, url },
    );
  }

  return response;
}

export async function requestJson(url, options = {}) {
  const response = await request(url, options);
  try {
    return await response.json();
  } catch {
    throw new AppError(502, 'UPSTREAM_BAD_JSON', '上游站点返回了无法解析的数据。');
  }
}

export async function requestText(url, options = {}) {
  const response = await request(url, {
    ...options,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });
  return response.text();
}

const cache = new Map();
const inflight = new Map();

/**
 * Tiny in-process TTL cache with in-flight request deduplication.
 * The dashboard only runs locally, so this is enough for the first version.
 */
export async function cached(key, ttlMs, loader, { force = false } = {}) {
  const now = Date.now();
  const entry = cache.get(key);

  if (!force && entry && entry.expiresAt > now) {
    return entry.value;
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    try {
      const value = await loader();
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function clearCache(prefix = '') {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
