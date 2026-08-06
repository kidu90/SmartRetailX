const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

/**
 * Fetch and parse a Secrets Manager secret.
 *
 * IRSA must grant secretsmanager:GetSecretValue on the secret ARN.
 * In local/dev (USE_SECRETS_MANAGER=false), returns process.env fallbacks.
 *
 * @param {object} options
 * @param {string} [options.secretId] - Secret name or ARN
 * @param {string} [options.region]
 * @param {object} [options.fallback] - Used when Secrets Manager is disabled
 * @returns {Promise<object>}
 */
async function getJsonSecret({ secretId, region, fallback = {} } = {}) {
  const useSm =
    process.env.USE_SECRETS_MANAGER === 'true' ||
    process.env.USE_SECRETS_MANAGER === '1';

  if (!useSm) {
    return { ...fallback };
  }

  if (!secretId) {
    throw new Error('secretId is required when USE_SECRETS_MANAGER=true');
  }

  const client = new SecretsManagerClient({
    region: region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
  });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  const raw = response.SecretString
    ? response.SecretString
    : Buffer.from(response.SecretBinary, 'base64').toString('utf8');

  return JSON.parse(raw);
}

/**
 * Load platform secrets used by SmartRetailX services.
 *
 * Expects:
 * - JWT secret JSON: { "JWT_SECRET": "...", "JWT_EXPIRES_IN": "15m" }
 * - DB secret JSON:  { "username", "password", "host", "port", "dbname" }
 */
async function loadServiceSecrets({
  jwtSecretId = process.env.JWT_SECRET_ARN || process.env.JWT_SECRET_NAME,
  dbSecretId = process.env.DB_SECRET_ARN || process.env.DB_SECRET_NAME,
  region = process.env.AWS_REGION,
} = {}) {
  const jwt = await getJsonSecret({
    secretId: jwtSecretId,
    region,
    fallback: {
      JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  });

  const db = await getJsonSecret({
    secretId: dbSecretId,
    region,
    fallback: {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || '5432',
      dbname: process.env.DB_NAME,
    },
  });

  return {
    jwtSecret: jwt.JWT_SECRET,
    jwtExpiresIn: jwt.JWT_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: jwt.JWT_REFRESH_EXPIRES_IN || '7d',
    database: {
      user: db.username,
      password: db.password,
      host: db.host,
      port: parseInt(db.port || '5432', 10),
      database: db.dbname,
    },
  };
}

module.exports = {
  getJsonSecret,
  loadServiceSecrets,
};
