const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  withRetry,
  createResilientClient,
} = require('../src/index');

describe('withRetry', () => {
  it('succeeds after transient failures', async () => {
    let n = 0;
    const result = await withRetry(
      async () => {
        n += 1;
        if (n < 3) throw new Error('flaky');
        return 'ok';
      },
      { retries: 3, baseDelayMs: 1 }
    );
    assert.equal(result, 'ok');
    assert.equal(n, 3);
  });
});

describe('createResilientClient', () => {
  it('returns fallback when upstream always fails', async () => {
    const client = createResilientClient({
      name: 'test-upstream',
      retries: 0,
      timeoutMs: 200,
      breakerOptions: { volumeThreshold: 1, errorThresholdPercentage: 1, resetTimeout: 50 },
      fetchImpl: async () => {
        throw new Error('down');
      },
      fallback: async () => ({
        ok: false,
        status: 503,
        json: async () => ({ fallback: true }),
      }),
    });

    // Trip the breaker
    for (let i = 0; i < 3; i += 1) {
      const res = await client.fetch('http://example.invalid');
      assert.equal(res.status, 503);
    }
  });
});
