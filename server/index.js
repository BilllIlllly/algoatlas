import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { app } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const PORT = Number(process.env.PORT) || 4318;
const HOST = process.env.HOST || '127.0.0.1';

if (fs.existsSync(dist)) {
  app.use(
    express.static(dist, {
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(503)
      .type('text/plain')
      .send('前端尚未构建。请先运行 npm run build，再启动服务。');
  });
}

app.listen(PORT, HOST, () => {
  console.log(`[algatlas] running at http://${HOST}:${PORT}`);
});
