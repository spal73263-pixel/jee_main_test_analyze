const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const BASE_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(BASE_DIR, '..');

// Load environment variables from backend/.env, root .env, or root .env.local if present
const dotenv = require('dotenv');
for (const envFile of [
  path.join(BASE_DIR, '.env'),
  path.join(BASE_DIR, '.env.local'),
  path.join(ROOT_DIR, '.env'),
  path.join(ROOT_DIR, '.env.local'),
]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

function isVercelEnv() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

const IS_VERCEL = isVercelEnv();
const PORT = parseInt(process.env.PORT || '8000', 10);

const DEFAULT_UPLOAD_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(BASE_DIR, 'uploads');

const UPLOAD_DIR = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || path.join(BASE_DIR, '.cloud-db.json');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Ignore on read-only build steps
}

function stripOuterQuotes(val) {
  const s = String(val || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function isPostgresConnectionString(val) {
  return /^postgres(?:ql)?:\/\//i.test(stripOuterQuotes(val));
}

function findPostgresUrl() {
  const preferredKeys = [
    'DATABASE_URL_POOLED',
    'DATABASE_URL',
    'NEON_DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
  ];
  for (const key of preferredKeys) {
    const cleaned = stripOuterQuotes(process.env[key]);
    if (cleaned && isPostgresConnectionString(cleaned)) {
      return cleaned;
    }
  }

  // Fallback: detect Vercel Storage custom prefixes (e.g., STORAGE_DATABASE_URL, JEE_POSTGRES_URL)
  const extraMatches = Object.entries(process.env)
    .filter(([key, val]) => {
      if (!key || /UNPOOLED|NON_POOLING|NO_SSL/i.test(key)) return false;
      if (!/(?:DATABASE|POSTGRES|NEON|PG).*_URL$/i.test(key)) return false;
      return isPostgresConnectionString(val);
    })
    .map(([, val]) => stripOuterQuotes(val));

  if (extraMatches.length > 0) {
    const pooled = extraMatches.find((u) => /-pooler\./i.test(u));
    return pooled || extraMatches[0];
  }

  // Fallback: individual PG* variables injected by some Vercel Postgres presets
  const pgHost = stripOuterQuotes(process.env.PGHOST);
  const pgUser = stripOuterQuotes(process.env.PGUSER);
  const pgPassword = stripOuterQuotes(process.env.PGPASSWORD);
  const pgDatabase = stripOuterQuotes(process.env.PGDATABASE);
  if (pgHost && pgUser && pgPassword && pgDatabase) {
    return `postgresql://${encodeURIComponent(pgUser)}:${encodeURIComponent(pgPassword)}@${pgHost}/${pgDatabase}?sslmode=require`;
  }

  return '';
}

function findPostgresDirectUrl(fallbackUrl) {
  const directKeys = ['DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'];
  for (const key of directKeys) {
    const cleaned = stripOuterQuotes(process.env[key]);
    if (cleaned && isPostgresConnectionString(cleaned)) {
      return cleaned;
    }
  }
  const extraDirect = Object.entries(process.env)
    .filter(([key, val]) => {
      if (!key || !/(?:UNPOOLED|NON_POOLING)$/i.test(key)) return false;
      return isPostgresConnectionString(val);
    })
    .map(([, val]) => stripOuterQuotes(val));

  if (extraDirect.length > 0) {
    return extraDirect[0];
  }

  return fallbackUrl || '';
}

function getStorageEnv() {
  const mongodbUri = stripOuterQuotes(process.env.MONGODB_URI || process.env.MONGO_URL);
  const postgresUrl = findPostgresUrl();
  const postgresDirectUrl = findPostgresDirectUrl(postgresUrl);
  const redisRestUrl = stripOuterQuotes(
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  );
  const redisRestToken = stripOuterQuotes(
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  );
  const blobToken = stripOuterQuotes(process.env.BLOB_READ_WRITE_TOKEN);
  const blobStoreId = stripOuterQuotes(process.env.BLOB_STORE_ID);

  return {
    mongodbUri,
    postgresUrl,
    postgresDirectUrl,
    redisRestUrl,
    redisRestToken,
    blobToken,
    blobStoreId,
  };
}

function detectStorageDriver() {
  const env = getStorageEnv();
  if (env.mongodbUri) return 'mongodb';
  if (env.postgresUrl) return 'postgres';
  if (env.redisRestUrl && env.redisRestToken) return 'redis';
  if (env.blobToken) return 'blob';
  if (!isVercelEnv()) return 'local-file';
  return 'unconfigured';
}

function getTokenSecretKey() {
  const env = getStorageEnv();
  const explicit = String(process.env.JWT_SECRET || '').trim();
  const seed =
    explicit ||
    env.mongodbUri ||
    env.postgresUrl ||
    env.redisRestToken ||
    env.blobToken ||
    env.blobStoreId ||
    String(process.env.VERCEL_PROJECT_ID || '').trim() ||
    BASE_DIR;

  return crypto.createHash('sha256').update(`jee-analyzer-token-v2:${seed}`).digest();
}

module.exports = {
  BASE_DIR,
  ROOT_DIR,
  IS_VERCEL,
  isVercelEnv,
  PORT,
  UPLOAD_DIR,
  LOCAL_DB_PATH,
  getStorageEnv,
  detectStorageDriver,
  getTokenSecretKey,
};
