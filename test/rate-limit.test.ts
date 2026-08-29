import { checkRateLimit, getRateLimitInfo } from '../src/middleware/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    jest.clearAllMocks();
  });

  test('should allow requests under limit', () => {
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit('test-ip', 60, 30);
      expect(result).toBe(true);
    }
  });

  test('should block requests over limit', () => {
    for (let i = 0; i < 30; i++) {
      checkRateLimit('test-ip-2', 60, 30);
    }
    const result = checkRateLimit('test-ip-2', 60, 30);
    expect(result).toBe(false);
  });

  test('should return rate limit info', () => {
    checkRateLimit('test-ip-3', 60, 30);
    const info = getRateLimitInfo('test-ip-3');
    expect(info.remaining).toBeLessThan(30);
    expect(info.resetAt).toBeGreaterThan(Date.now());
  });
});