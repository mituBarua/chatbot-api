
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, windowSeconds: number = 60, maxRequests: number = 30): boolean {
  const now = Date.now();
  const key = identifier;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
    return true;
  }

  const data = rateLimitStore.get(key)!;

  if (now > data.resetTime) {
    // Window expired, reset
    rateLimitStore.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
    return true;
  }

  if (data.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  data.count++;
  return true;
}

export function getRateLimitInfo(identifier: string): { remaining: number; resetAt: number } {
  const data = rateLimitStore.get(identifier);
  if (!data) return { remaining: 30, resetAt: Date.now() + 60000 };

  const remaining = Math.max(0, 30 - data.count);
  return { remaining, resetAt: data.resetTime };
}