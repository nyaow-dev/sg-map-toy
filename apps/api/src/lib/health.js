/**
 * health.js
 * Infrastructure availability checks.
 * Used by routes to gracefully degrade when services are unreachable.
 */

let esAvailableCache = { value: false, checkedAt: 0 };

export async function isEsAvailable() {
  if (!process.env.ES_URL) return false;

  const now = Date.now();
  if (now - esAvailableCache.checkedAt < 30000) {
    return esAvailableCache.value;
  }

  try {
    const response = await fetch(`${process.env.ES_URL}/_cluster/health`, {
      signal: AbortSignal.timeout(2000),
    });
    esAvailableCache = { value: response.ok, checkedAt: now };
    return response.ok;
  } catch {
    esAvailableCache = { value: false, checkedAt: now };
    return false;
  }
}
