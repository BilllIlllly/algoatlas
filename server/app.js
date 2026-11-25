import express from 'express';
import { AppError } from './lib/http.js';
import { getAtCoder, getAtCoderContests } from './services/atcoder.js';
import {
  getCodeforces,
  getCodeforcesContests,
  getCodeforcesProblems,
} from './services/codeforces.js';
import {
  getLuogu,
  getLuoguContests,
  getLuoguCookieStatus,
  getLuoguProblems,
  setLuoguSessionCookie,
} from './services/luogu.js';

const services = {
  codeforces: getCodeforces,
  atcoder: getAtCoder,
  luogu: getLuogu,
};

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

/**
 * The frontend talks to one stable endpoint so the same build works locally
 * and on serverless platforms such as Vercel. The original API path is passed
 * in the `path` query parameter and rewritten back before routing.
 */
app.use((req, res, next) => {
  if (req.path !== '/api/proxy') return next();

  const target = String(req.query.path || '');
  if (!target.startsWith('/api/') || target.startsWith('/api/proxy')) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PROXY_PATH',
        message: '无效的 API 代理路径。',
      },
    });
  }

  const url = new URL(target, 'http://localhost');
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else if (value != null) {
      url.searchParams.append(key, String(value));
    }
  }

  req.url = `${url.pathname}${url.search}`;
  return next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'algatlas', now: new Date().toISOString() });
});

app.get('/api/luogu/problems', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(
      await getLuoguProblems({
        page: req.query.page,
        keyword: req.query.keyword,
        difficulty: req.query.difficulty,
        type: req.query.type,
      }),
    );
  } catch (error) {
    next(error);
  }
});

app.get('/api/luogu/cookie', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(getLuoguCookieStatus());
});

app.post('/api/luogu/cookie', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(setLuoguSessionCookie(req.body?.cookie));
  } catch (error) {
    res.status(error.status || 400).json({
      error: {
        code: error.code || 'INVALID_COOKIE',
        message: error.message || 'Cookie 无效。',
      },
    });
  }
});

app.get('/api/codeforces/contests', async (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await getCodeforcesContests());
  } catch (error) {
    next(error);
  }
});

app.get('/api/atcoder/contests', async (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await getAtCoderContests());
  } catch (error) {
    next(error);
  }
});

app.get('/api/luogu/contests', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await getLuoguContests(req.query.page));
  } catch (error) {
    next(error);
  }
});

app.get('/api/codeforces/problems', async (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await getCodeforcesProblems());
  } catch (error) {
    next(error);
  }
});

app.get('/api/:platform/:handle', async (req, res, next) => {
  const { platform, handle } = req.params;
  const service = services[platform];

  if (!service) {
    return res.status(404).json({
      error: { code: 'UNKNOWN_PLATFORM', message: '不支持的 OJ 平台。' },
    });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const force = req.query.refresh === '1' || req.query.refresh === 'true';
    const data = await service(handle, { force });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `API 路径 ${req.path} 不存在。` },
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  console.error('[algatlas] unexpected error:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务出现了意外错误，请稍后重试。',
    },
  });
});
