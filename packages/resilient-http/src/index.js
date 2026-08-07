const CircuitBreaker = require('opossum');

const DEFAULT_BREAKER = {
  timeout: 4000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  volumeThreshold: 5,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff for transient failures.
 */
async function withRetry(fn, {
  retries = 2,
  baseDelayMs = 100,
  shouldRetry = (err) => true,
} = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err)) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Resilient fetch: timeout → retry → circuit breaker → fallback.
 *
 * @param {object} options
 * @param {string} options.name - breaker name (e.g. catalogue-service)
 * @param {number} [options.timeoutMs=3000]
 * @param {number} [options.retries=2]
 * @param {function} [options.fallback] - called when breaker opens / fails
 * @param {function} [options.fetchImpl=fetch]
 */
function createResilientClient(options = {}) {
  const {
    name = 'upstream',
    timeoutMs = 3000,
    retries = 2,
    baseDelayMs = 100,
    fallback,
    fetchImpl = fetch,
    breakerOptions = {},
  } = options;

  async function execute(url, init = {}) {
    return withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchImpl(url, {
            ...init,
            signal: init.signal || controller.signal,
          });
          if (isRetryableStatus(response.status)) {
            const err = new Error(`${name} returned ${response.status}`);
            err.status = response.status;
            err.response = response;
            throw err;
          }
          return response;
        } catch (err) {
          if (err.name === 'AbortError') {
            const timeoutErr = new Error(`${name} request timed out after ${timeoutMs}ms`);
            timeoutErr.code = 'ETIMEDOUT';
            throw timeoutErr;
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      },
      {
        retries,
        baseDelayMs,
        shouldRetry: (err) =>
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET' ||
          err.code === 'ECONNREFUSED' ||
          (err.status && isRetryableStatus(err.status)),
      }
    );
  }

  const breaker = new CircuitBreaker(execute, {
    ...DEFAULT_BREAKER,
    timeout: timeoutMs + 1500,
    name,
    ...breakerOptions,
  });

  if (typeof fallback === 'function') {
    breaker.fallback(async (...args) => fallback(...args));
  } else {
    breaker.fallback(async () => {
      const err = new Error(`${name} unavailable (circuit open or exhausted retries)`);
      err.code = 'CIRCUIT_OPEN';
      err.fallback = true;
      throw err;
    });
  }

  breaker.on('open', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[resilient-http] circuit OPEN for ${name}`);
    }
  });
  breaker.on('halfOpen', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[resilient-http] circuit half-open for ${name}`);
    }
  });
  breaker.on('close', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[resilient-http] circuit CLOSED for ${name}`);
    }
  });

  return {
    name,
    breaker,
    fetch: (url, init) => breaker.fire(url, init),
    stats: () => breaker.stats,
    status: () => ({
      name,
      opened: breaker.opened,
      halfOpen: breaker.halfOpen,
      closed: breaker.closed,
      stats: breaker.stats,
    }),
  };
}

/**
 * Express middleware factory: short-circuit when the named breaker is open.
 * Used by the gateway before proxying.
 */
function createCircuitGuard(breaker, {
  serviceName = 'upstream',
  fallbackBody,
} = {}) {
  return (req, res, next) => {
    if (breaker.opened) {
      const body = fallbackBody || {
        error: {
          message: `${serviceName} temporarily unavailable`,
          code: 'CIRCUIT_OPEN',
          fallback: true,
        },
      };
      return res.status(503).json(body);
    }
    return next();
  };
}

/**
 * Breaker driven by gateway proxy callbacks (success/failure of upstream hop).
 * Uses opossum via fire(true|false) so thresholds stay consistent with clients.
 */
function createProxyBreaker(name, breakerOptions = {}) {
  const action = async (ok) => {
    if (!ok) throw new Error(`${name} proxy failure`);
    return true;
  };
  const breaker = new CircuitBreaker(action, {
    ...DEFAULT_BREAKER,
    name,
    ...breakerOptions,
  });
  breaker.fallback(() => false);

  return {
    breaker,
    guard: createCircuitGuard(breaker, { serviceName: name }),
    recordSuccess() {
      return breaker.fire(true).catch(() => false);
    },
    recordFailure() {
      return breaker.fire(false).catch(() => false);
    },
    status: () => ({
      name,
      opened: breaker.opened,
      stats: breaker.stats,
    }),
  };
}

module.exports = {
  withRetry,
  createResilientClient,
  createCircuitGuard,
  createProxyBreaker,
  DEFAULT_BREAKER,
};
