const counters = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(identifier: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / (windowSeconds * 1000))}`;

  const current = counters.get(key);
  if (!current || current.expiresAt < now) {
    counters.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  current.count += 1;
  counters.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count) };
}
