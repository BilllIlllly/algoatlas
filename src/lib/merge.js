function problemKey(platform, problem) {
  if (platform === 'codeforces') {
    return problem.problemId || `${problem.contestId}-${problem.index}`;
  }
  if (platform === 'atcoder') {
    return problem.problemId || problem.id;
  }
  return problem.id;
}

/**
 * Combines the sync results of several handles on the same OJ. Solved problems
 * are de-duplicated; each problem remembers which accounts solved it.
 */
export function mergeAccountResults(platform, entries = []) {
  const successful = entries.filter((entry) => entry?.data);
  if (successful.length === 0) return null;

  const byProblem = new Map();

  for (const entry of successful) {
    const handle = entry.data.handle || entry.handle;
    for (const problem of entry.data.solved || []) {
      const key = problemKey(platform, problem);
      if (!key) continue;

      const existing = byProblem.get(key);
      if (!existing) {
        byProblem.set(key, {
          ...problem,
          accounts: [handle],
          accountSolvedAt: problem.solvedAt
            ? [{ handle, solvedAt: problem.solvedAt }]
            : [],
        });
        continue;
      }

      if (!existing.accounts.includes(handle)) existing.accounts.push(handle);

      if (problem.solvedAt != null) {
        existing.accountSolvedAt.push({ handle, solvedAt: problem.solvedAt });
        if (existing.solvedAt == null || problem.solvedAt < existing.solvedAt) {
          existing.solvedAt = problem.solvedAt;
        }
      }

      if (existing.difficulty == null && problem.difficulty != null) {
        existing.difficulty = problem.difficulty;
      }

      if (problem.attempts) {
        existing.attempts = Math.max(
          existing.attempts || 0,
          problem.attempts,
        );
      }
    }
  }

  const solved = [...byProblem.values()];

  const attemptedMap = new Map();
  for (const entry of successful) {
    const handle = entry.data.handle || entry.handle;
    for (const problem of entry.data.attempted || []) {
      const key = problemKey(platform, problem);
      if (!key || byProblem.has(key)) continue;

      const existing = attemptedMap.get(key);
      if (!existing) {
        attemptedMap.set(key, { ...problem, accounts: [handle] });
      } else if (!existing.accounts.includes(handle)) {
        existing.accounts.push(handle);
      }
    }
  }
  const attempted = [...attemptedMap.values()];

  const profiles = successful.map((entry) => ({
    handle: entry.data.handle || entry.handle,
    profile: entry.data.profile,
    stats: entry.data.stats,
    fetchedAt: entry.data.fetchedAt,
  }));

  const contestIds = new Set(
    solved.map((problem) => problem.contestId).filter(Boolean),
  );
  const latestFetch = successful
    .map((entry) => entry.data.fetchedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    platform,
    handle: profiles.map((item) => item.handle).join(', '),
    handles: profiles.map((item) => item.handle),
    profile: profiles[0]?.profile || {},
    profiles,
    solved,
    attempted,
    stats: {
      solvedCount: solved.length,
      attemptedCount: attempted.length,
      accountCount: successful.length,
      accountSolvedTotal: successful.reduce(
        (total, entry) => total + (entry.data.stats?.solvedCount || 0),
        0,
      ),
      contestCount: contestIds.size,
      submissionCount: successful.reduce(
        (total, entry) => total + (entry.data.stats?.submissionCount || 0),
        0,
      ),
    },
    fetchedAt: latestFetch || new Date().toISOString(),
    source: successful[0]?.data.source,
  };
}

export function buildAccountResults(handles, settledResults) {
  return handles.map((handle, index) => {
    const result = settledResults[index];
    if (result?.status === 'fulfilled') {
      return { handle, data: result.value, error: null };
    }
    return {
      handle,
      data: null,
      error: result?.reason || new Error('同步失败'),
    };
  });
}
