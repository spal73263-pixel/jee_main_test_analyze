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

function getStorageEnv() {
  const mongodbUri = String(process.env.MONGODB_URI || process.env.MONGO_URL || '').trim();
  const postgresUrl = String(
    process.env.DATABASE_URL_POOLED ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      ''
  ).trim();
  const redisRestUrl = String(
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ''
  ).trim();
  const redisRestToken = String(
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ''
  ).trim();
  const blobToken = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  const blobStoreId = String(process.env.BLOB_STORE_ID || '').trim();

  return {
    mongodbUri,
    postgresUrl,
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
