import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1120 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.addInitScript(() => {
  localStorage.setItem(
    'algatlas.accounts.v1',
    JSON.stringify({
      luogu: ['lzn', 'Eason_AC'],
      codeforces: ['tourist', 'Petr'],
      atcoder: ['chokudai', 'tatyam'],
    }),
  );
});

await page.goto('http://127.0.0.1:4318/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.main-nav button', { timeout: 30_000 });
await page.locator('.main-nav button', { hasText: '题库' }).click();
await page.waitForSelector('.contest-matrix tbody tr', { timeout: 120_000 });
await page.waitForTimeout(500);

console.log('active platform:', await page.locator('.library-tabs button.is-active strong').innerText());
console.log('cf rows:', await page.locator('.contest-matrix tbody tr').count());
console.log('cf columns:', await page.locator('.matrix-problem-head').allInnerTexts());
console.log(
  'cf links:',
  await page.locator('.matrix-contest-link').first().getAttribute('href'),
  await page.locator('.matrix-problem').first().getAttribute('href'),
);

await page.locator('.library-category-tabs button', { hasText: 'Div. 2' }).click();
await page.waitForTimeout(300);
console.log(
  'cf div2 first contest:',
  await page.locator('.matrix-contest-link').first().innerText(),
);

await page.locator('.library-tabs button', { hasText: 'AtCoder' }).click();
await page.waitForSelector('.contest-matrix tbody tr', { timeout: 120_000 });
await page.waitForTimeout(450);
console.log(
  'atcoder default category:',
  await page.locator('.library-category-tabs button.is-active').innerText(),
);
console.log(
  'atcoder first contest:',
  await page.locator('.matrix-contest-link').first().innerText(),
);

await page.locator('.library-tabs button', { hasText: '洛谷' }).click();
await page.waitForSelector('.luogu-topic-table tbody tr', { timeout: 120_000 });
await page.waitForTimeout(500);
console.log('luogu heading:', await page.locator('.library-heading h1').innerText());
console.log('luogu total:', await page.locator('.luogu-topic-count strong').innerText());
console.log('luogu rows:', await page.locator('.luogu-topic-table tbody tr').count());
console.log(
  'luogu problem link:',
  await page.locator('.luogu-col-id a').first().getAttribute('href'),
);
console.log(
  'solved rows:',
  await page.locator('.luogu-topic-table tbody tr.is-solved').count(),
);

await page.locator('.luogu-topic-search input').fill('NOIP');
await page.waitForResponse(
  (response) =>
    response.url().includes('/api/luogu/problems') &&
    response.url().includes('keyword=NOIP'),
  { timeout: 30_000 },
);
await page.waitForTimeout(250);
console.log('luogu search total:', await page.locator('.luogu-topic-count strong').innerText());

await page.screenshot({ path: 'artifacts/final-luogu-topic.png' });
await page.locator('.main-nav button', { hasText: '洛谷' }).click();
await page.waitForTimeout(600);
await page.locator('.platform-hero .soft-button', { hasText: 'Cookie' }).click();
await page.waitForSelector('.cookie-modal');
await page.waitForTimeout(300);
console.log('cookie modal visible:', await page.locator('.cookie-modal').isVisible());
await page.screenshot({ path: 'artifacts/final-luogu-cookie.png' });
await page.keyboard.press('Escape');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.addInitScript(() => {
  localStorage.setItem(
    'algatlas.accounts.v1',
    JSON.stringify({
      luogu: ['lzn'],
      codeforces: ['tourist'],
      atcoder: ['chokudai'],
    }),
  );
});
await mobile.goto('http://127.0.0.1:4318/', { waitUntil: 'domcontentloaded' });
await mobile.waitForSelector('.main-nav button', { timeout: 30_000 });
await mobile.locator('.main-nav button', { hasText: '题库' }).click();
await mobile.waitForSelector('.contest-matrix tbody tr', { timeout: 120_000 });
await mobile.waitForTimeout(400);
console.log(
  'mobile page overflow:',
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  ),
);
await mobile.screenshot({ path: 'artifacts/final-contest-mobile.png' });

console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
