import { PLATFORM_ORDER } from './platforms.js';

export function emptyAccounts() {
  return {
    luogu: [],
    codeforces: [],
    atcoder: [],
  };
}

function handleKey(platform, handle) {
  const value = String(handle ?? '').trim();
  if (platform === 'luogu' && /^\d+$/.test(value)) return value;
  return value.toLowerCase();
}

export function normalizeHandleList(platform, values) {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  const seen = new Set();
  const result = [];

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const handle = raw.trim();
    if (!handle) continue;

    const key = handleKey(platform, handle);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(handle);
  }

  return result;
}

/**
 * Accepts both the v0.1 string schema and the new array schema, so existing
 * local storage keeps working after the multi-account upgrade.
 */
export function normalizeAccounts(raw) {
  const result = emptyAccounts();
  if (!raw || typeof raw !== 'object') return result;

  for (const platform of PLATFORM_ORDER) {
    result[platform] = normalizeHandleList(platform, raw[platform]);
  }

  return result;
}

export function accountsEqual(platform, left, right) {
  const a = normalizeHandleList(platform, left);
  const b = normalizeHandleList(platform, right);
  if (a.length !== b.length) return false;
  return a.every(
    (handle, index) => handleKey(platform, handle) === handleKey(platform, b[index]),
  );
}

export function areAccountsEqual(left, right) {
  return PLATFORM_ORDER.every((platform) =>
    accountsEqual(platform, left?.[platform], right?.[platform]),
  );
}

export function hasAnyAccount(accounts) {
  return PLATFORM_ORDER.some((platform) =>
    (accounts?.[platform] || []).some(
      (handle) => typeof handle === 'string' && handle.trim().length > 0,
    ),
  );
}

export function platformAccountCount(accounts, platform) {
  return accounts?.[platform]?.length || 0;
}

export function totalAccountCount(accounts) {
  return PLATFORM_ORDER.reduce(
    (total, platform) => total + platformAccountCount(accounts, platform),
    0,
  );
}
