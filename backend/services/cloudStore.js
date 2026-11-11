const fs = require('fs');
const path = require('path');
const {
  IS_VERCEL,
  LOCAL_DB_PATH,
  getStorageEnv,
  detectStorageDriver,
} = require('../config/env');
const { hashPassword } = require('../middleware/auth');
const {
  createEmptyWorkspace,
  normalizeWorkspace,
} = require('./workspaceService');

const OM_PAL_ID = 'user_om_pal';
const OM_PAL_EMAIL = 'demo@jeemain.ai';
const OM_PAL_NAME = 'Om Pal';
const OM_PAL_DEFAULT_PASSWORD = 'password123';

function getCloudStatus() {
  const driver = detectStorageDriver();
  const cloudSyncReady = driver !== 'unconfigured';
  return {
    storage_driver: driver,
    cloud_sync_ready: cloudSyncReady,
    requires_cloud_config: !cloudSyncReady,
    cross_device_sync:
      driver === 'local-file' ? 'local-network' : cloudSyncReady ? 'cloud' : 'unconfigured',
  };
}

function assertCloudConfigured() {
  const driver = detectStorageDriver();
  if (driver === 'unconfigured') {
    const err = new Error(
      'Cloud sync database is not configured on Vercel yet. Connect Neon Postgres, Upstash Redis, or Vercel Blob in Vercel Dashboard -> Storage (or add MONGODB_URI in Settings -> Environment Variables) and Redeploy so Om Pal and Parents see the exact same live dashboard on every phone.'
    );
    err.status = 503;
    err.setup_required = true;
    throw err;
  }
  return driver;
}

// ===========================================================================
// Driver 1: MongoDB Atlas / MongoDB Native Driver
// ===========================================================================
let mongoClientPromise = null;
let mongoLastUri = null;
let mongoIndexesReady = false;

function decodeURIComponentSafe(val) {
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

function normalizeMongoConnection(rawUri) {
  const trimmed = String(rawUri || '').trim();
  const schemeMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/);
  if (!schemeMatch) {
    return { uri: trimmed, dbName: 'jee_analyzer' };
  }

  const scheme = schemeMatch[1];
  const rest = schemeMatch[2];
  const authMatch = rest.match(
    /^([^:]+):(.+)@([a-zA-Z0-9.-]+(?::\d+)?(?:,[a-zA-Z0-9.-]+(?::\d+)?)*)(\/.*|\?.*)?$/
  );

  let uri = trimmed;
  let tail = '';
  if (authMatch) {
    const user = authMatch[1];
    const pass = decodeURIComponentSafe(authMatch[2]);
    const host = authMatch[3];
    tail = authMatch[4] || '';
    uri = `${scheme}${encodeURIComponent(decodeURIComponentSafe(user))}:${encodeURIComponent(pass)}@${host}${tail}`;
  } else {
    const slashIdx = rest.indexOf('/');
    tail = slashIdx !== -1 ? rest.slice(slashIdx) : '';
  }

  const pathOnly = tail.split('?')[0].replace(/^\/+/, '');
  return {
    uri,
    dbName: pathOnly || 'jee_analyzer',
  };
}

async function getMongoDb() {
  const { mongodbUri } = getStorageEnv();
  if (!mongodbUri) {
    throw new Error('MONGODB_URI is not set');
  }
  const { uri, dbName } = normalizeMongoConnection(mongodbUri);

  if (!mongoClientPromise || mongoLastUri !== uri) {
    mongoLastUri = uri;
    mongoIndexesReady = false;
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: IS_VERCEL ? 7500 : 4000,
    });
    mongoClientPromise = client.connect().catch((err) => {
      mongoClientPromise = null;
      const msg = String(err.message || '');
      if (msg.includes('Authentication failed') || msg.includes('bad auth')) {
        throw new Error(
          'MongoDB authentication failed. Verify username/password in MONGODB_URI (remove any "<" or ">" template brackets if copied from Atlas).'
        );
      }
      if (IS_VERCEL && (msg.includes('Server selection') || msg.includes('ECONNREFUSED') || msg.includes('whitelist'))) {
        throw new Error(
          'Could not reach MongoDB Atlas from Vercel. In MongoDB Atlas -> Network Access, add IP 0.0.0.0/0 (Allow Access from Anywhere).'
        );
      }
      throw err;
    });
  }

  const client = await mongoClientPromise;
  const db = client.db(dbName);

  if (!mongoIndexesReady) {
    mongoIndexesReady = true;
    await db
      .collection('accounts')
      .createIndex({ email: 1 }, { unique: true })
      .catch(() => {});
  }

  return db;
}

const mongoDriver = {
  async getAccountByEmail(email) {
    const db = await getMongoDb();
    const doc = await db.collection('accounts').findOne({ email });
    return doc ? sanitizeMongoAccount(doc) : null;
  },

  async getAccountById(id) {
    const db = await getMongoDb();
    const doc = await db.collection('accounts').findOne({ id });
    return doc ? sanitizeMongoAccount(doc) : null;
  },

  async createAccountAndWorkspace(account, workspace) {
    const db = await getMongoDb();
    try {
      await db.collection('accounts').insertOne({ _id: account.id, ...account });
    } catch (err) {
      if (err && err.code === 11000) {
        const dup = new Error('An account with this email already exists.');
        dup.status = 400;
        throw dup;
      }
      throw err;
    }
    await db.collection('workspaces').updateOne(
      { _id: account.id },
      {
        $setOnInsert: {
          _id: account.id,
          user_id: account.id,
          data: workspace,
          updated_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  },

  async saveAccount(account) {
    const db = await getMongoDb();
    await db.collection('accounts').updateOne(
      { _id: account.id },
      { $set: { ...account } },
      { upsert: true }
    );
  },

  async getWorkspace(userId) {
    const db = await getMongoDb();
    const doc = await db.collection('workspaces').findOne({ _id: userId });
    return normalizeWorkspace(userId, doc ? doc.data : null);
  },

  async saveWorkspace(userId, workspace) {
    const db = await getMongoDb();
    const normalized = normalizeWorkspace(userId, workspace);
    await db.collection('workspaces').updateOne(
      { _id: userId },
      {
        $set: {
          user_id: userId,
          data: normalized,
          updated_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return normalized;
  },

  async close() {
    if (mongoClientPromise) {
      const c = await mongoClientPromise.catch(() => null);
      if (c) await c.close().catch(() => {});
    }
    mongoClientPromise = null;
    mongoLastUri = null;
    mongoIndexesReady = false;
  },
};

function sanitizeMongoAccount(doc) {
  const { _id, ...rest } = doc;
  return rest;
}

// ===========================================================================
// Driver 2: PostgreSQL (Neon Lakebase Postgres / Vercel Fluid Compute / pg)
// ===========================================================================
let pgPool = null;
let pgLastUrl = null;
let pgSchemaPromise = null;

function normalizePgConnectionString(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  const isLocalPg = /127\.0\.0\.1|localhost/.test(trimmed);
  if (isLocalPg) {
    return { connectionString: trimmed, useRelaxedSsl: false };
  }

  let connectionString = trimmed;
  if (
    /[?&]sslmode=require(?=&|$)/i.test(connectionString) &&
    !/uselibpqcompat=/i.test(connectionString)
  ) {
    connectionString = connectionString.replace(
      /([?&])sslmode=require(?=&|$)/i,
      '$1sslmode=verify-full'
    );
  }

  const hasSslMode = /sslmode=/i.test(connectionString);
  return { connectionString, useRelaxedSsl: !hasSslMode };
}

async function ensurePgSchema(runtimePool, rawDirectUrl, rawPooledUrl) {
  const useSeparateDirectPool = rawDirectUrl && rawDirectUrl !== rawPooledUrl;
  let schemaPool = runtimePool;
  let createdTempPool = false;

  if (useSeparateDirectPool) {
    const { Pool } = require('pg');
    const norm = normalizePgConnectionString(rawDirectUrl);
    schemaPool = new Pool({
      connectionString: norm.connectionString,
      max: 1,
      connectionTimeoutMillis: 8000,
      ...(norm.useRelaxedSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    createdTempPool = true;
  }

  try {
    await schemaPool.query(`
      CREATE TABLE IF NOT EXISTS jee_accounts (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await schemaPool.query(`
      CREATE TABLE IF NOT EXISTS jee_workspaces (
        user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  } finally {
    if (createdTempPool) {
      await schemaPool.end().catch(() => {});
    }
  }
}

async function getPgPool() {
  const { postgresUrl, postgresDirectUrl } = getStorageEnv();
  if (!postgresUrl) {
    throw new Error('Postgres URL is not set');
  }

  const norm = normalizePgConnectionString(postgresUrl);

  if (!pgPool || pgLastUrl !== norm.connectionString) {
    pgLastUrl = norm.connectionString;
    pgSchemaPromise = null;
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: norm.connectionString,
      max: IS_VERCEL ? 5 : 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
      ...(norm.useRelaxedSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    pgPool.on('error', (err) => {
      console.error('Postgres idle pool notice:', err?.message || err);
    });

    if (IS_VERCEL) {
      try {
        const { attachDatabasePool } = require('@vercel/functions');
        if (typeof attachDatabasePool === 'function') {
          attachDatabasePool(pgPool);
        }
      } catch {
        // Optional outside Vercel Fluid compute
      }
    }
  }

  if (!pgSchemaPromise) {
    pgSchemaPromise = ensurePgSchema(pgPool, postgresDirectUrl, postgresUrl).catch((err) => {
      pgSchemaPromise = null;
      throw err;
    });
  }

  await pgSchemaPromise;
  return pgPool;
}

const postgresDriver = {
  async getAccountByEmail(email) {
    const pool = await getPgPool();
    const { rows } = await pool.query(
      'SELECT id, email, full_name, password_hash, created_at, updated_at FROM jee_accounts WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async getAccountById(id) {
    const pool = await getPgPool();
    const { rows } = await pool.query(
      'SELECT id, email, full_name, password_hash, created_at, updated_at FROM jee_accounts WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async createAccountAndWorkspace(account, workspace) {
    const pool = await getPgPool();
    const normalized = normalizeWorkspace(account.id, workspace);
    try {
      await pool.query(
        `INSERT INTO jee_accounts (id, email, full_name, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          account.id,
          account.email,
          account.full_name,
          account.password_hash,
          account.created_at,
          account.updated_at || account.created_at,
        ]
      );
    } catch (err) {
      if (err && err.code === '23505') {
        const dup = new Error('An account with this email already exists.');
        dup.status = 400;
        throw dup;
      }
      throw err;
    }

    await pool.query(
      `INSERT INTO jee_workspaces (user_id, data, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [account.id, JSON.stringify(normalized), new Date().toISOString()]
    );
  },

  async saveAccount(account) {
    const pool = await getPgPool();
    await pool.query(
      `INSERT INTO jee_accounts (id, email, full_name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         updated_at = EXCLUDED.updated_at`,
      [
        account.id,
        account.email,
        account.full_name,
        account.password_hash,
        account.created_at,
        account.updated_at || new Date().toISOString(),
      ]
    );
  },

  async getWorkspace(userId) {
    const pool = await getPgPool();
    const { rows } = await pool.query(
      'SELECT data FROM jee_workspaces WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (!rows[0]) {
      return normalizeWorkspace(userId, null);
    }
    const raw = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    return normalizeWorkspace(userId, raw);
  },

  async saveWorkspace(userId, workspace) {
    const pool = await getPgPool();
    const normalized = normalizeWorkspace(userId, workspace);
    await pool.query(
      `INSERT INTO jee_workspaces (user_id, data, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at`,
      [userId, JSON.stringify(normalized), new Date().toISOString()]
    );
    return normalized;
  },

  async close() {
    if (pgPool) {
      await pgPool.end().catch(() => {});
    }
    pgPool = null;
    pgLastUrl = null;
    pgSchemaPromise = null;
  },
};

// ===========================================================================
// Driver 3: Upstash Redis / Vercel KV REST API (Zero Extra Packages)
// ===========================================================================
async function redisExec(commandArgs) {
  const { redisRestUrl, redisRestToken } = getStorageEnv();
  if (!redisRestUrl || !redisRestToken) {
    throw new Error('Redis REST credentials are not set');
  }
  const res = await fetch(redisRestUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisRestToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandArgs),
  });
  const payload = await res.json();
  if (!res.ok || payload.error) {
    throw new Error(payload.error || `Redis REST request failed (${res.status})`);
  }
  return payload.result;
}

const redisKeys = {
  accountById: (id) => `jee:v2:account:id:${id}`,
  emailToId: (email) => `jee:v2:account:email:${email}`,
  workspace: (userId) => `jee:v2:workspace:${userId}`,
};

const redisDriver = {
  async getAccountByEmail(email) {
    const id = await redisExec(['GET', redisKeys.emailToId(email)]);
    if (!id) return null;
    return this.getAccountById(String(id));
  },

  async getAccountById(id) {
    const raw = await redisExec(['GET', redisKeys.accountById(id)]);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  },

  async createAccountAndWorkspace(account, workspace) {
    const claim = await redisExec(['SETNX', redisKeys.emailToId(account.email), account.id]);
    if (claim === 0) {
      const dup = new Error('An account with this email already exists.');
      dup.status = 400;
      throw dup;
    }
    await redisExec(['SET', redisKeys.accountById(account.id), JSON.stringify(account)]);
    const existingWs = await redisExec(['GET', redisKeys.workspace(account.id)]);
    if (!existingWs) {
      await this.saveWorkspace(account.id, workspace);
    }
  },

  async saveAccount(account) {
    await redisExec(['SET', redisKeys.emailToId(account.email), account.id]);
    await redisExec(['SET', redisKeys.accountById(account.id), JSON.stringify(account)]);
  },

  async getWorkspace(userId) {
    const raw = await redisExec(['GET', redisKeys.workspace(userId)]);
    if (!raw) return normalizeWorkspace(userId, null);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return normalizeWorkspace(userId, parsed);
  },

  async saveWorkspace(userId, workspace) {
    const normalized = normalizeWorkspace(userId, workspace);
    await redisExec(['SET', redisKeys.workspace(userId), JSON.stringify(normalized)]);
    return normalized;
  },

  async close() {},
};

// ===========================================================================
// Driver 4: Vercel Blob (@vercel/blob with auto public/private store match)
// ===========================================================================
let cachedBlobAccess = null;

function blobPaths() {
  return {
    accountById: (id) => `jee-analyzer/v2/accounts/by-id/${id}.json`,
    accountByEmail: (email) =>
      `jee-analyzer/v2/accounts/by-email/${Buffer.from(String(email)).toString('base64url')}.json`,
    workspace: (userId) => `jee-analyzer/v2/workspaces/${userId}.json`,
  };
}

function flipAccess(access) {
  return access === 'private' ? 'public' : 'private';
}

function isBlobAccessMismatchError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('public') && msg.includes('private');
}

function isBlobNotFoundError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    err?.name === 'BlobNotFoundError' ||
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    err?.status === 404
  );
}

async function blobPutJson(pathname, data) {
  const { put } = require('@vercel/blob');
  const accessOrder = cachedBlobAccess
    ? [cachedBlobAccess, flipAccess(cachedBlobAccess)]
    : ['private', 'public'];

  const body = JSON.stringify(data);
  let lastErr = null;
  for (const access of accessOrder) {
    try {
      await put(pathname, body, {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60,
      });
      cachedBlobAccess = access;
      return;
    } catch (err) {
      lastErr = err;
      if (!isBlobAccessMismatchError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function blobGetJson(pathname) {
  const { get } = require('@vercel/blob');
  const accessOrder = cachedBlobAccess
    ? [cachedBlobAccess, flipAccess(cachedBlobAccess)]
    : ['private', 'public'];

  let lastErr = null;
  for (const access of accessOrder) {
    try {
      const result = await get(pathname, { access, useCache: false });
      cachedBlobAccess = access;
      if (!result || result.statusCode !== 200 || !result.stream) {
        return null;
      }
      return await new Response(result.stream).json();
    } catch (err) {
      if (isBlobNotFoundError(err)) {
        cachedBlobAccess = access;
        return null;
      }
      lastErr = err;
      if (!isBlobAccessMismatchError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

const blobPathsMap = blobPaths();

const blobDriver = {
  async getAccountByEmail(email) {
    const ptr = await blobGetJson(blobPathsMap.accountByEmail(email));
    if (!ptr || !ptr.id) return null;
    return this.getAccountById(ptr.id);
  },

  async getAccountById(id) {
    return blobGetJson(blobPathsMap.accountById(id));
  },

  async createAccountAndWorkspace(account, workspace) {
    const existing = await blobGetJson(blobPathsMap.accountByEmail(account.email));
    if (existing) {
      const dup = new Error('An account with this email already exists.');
      dup.status = 400;
      throw dup;
    }
    await blobPutJson(blobPathsMap.accountById(account.id), account);
    await blobPutJson(blobPathsMap.accountByEmail(account.email), { id: account.id });
    const existingWs = await blobGetJson(blobPathsMap.workspace(account.id));
    if (!existingWs) {
      await this.saveWorkspace(account.id, workspace);
    }
  },

  async saveAccount(account) {
    await blobPutJson(blobPathsMap.accountById(account.id), account);
    await blobPutJson(blobPathsMap.accountByEmail(account.email), { id: account.id });
  },

  async getWorkspace(userId) {
    const raw = await blobGetJson(blobPathsMap.workspace(userId));
    return normalizeWorkspace(userId, raw);
  },

  async saveWorkspace(userId, workspace) {
    const normalized = normalizeWorkspace(userId, workspace);
    await blobPutJson(blobPathsMap.workspace(userId), normalized);
    return normalized;
  },

  async close() {
    cachedBlobAccess = null;
  },
};

// ===========================================================================
// Driver 5: Local Disk JSON File (Default Local / Docker / LAN Multi-Phone)
// ===========================================================================
let localQueue = Promise.resolve();

function getLocalDbFilePath() {
  return process.env.LOCAL_DB_PATH || LOCAL_DB_PATH;
}

function readLocalFileDb() {
  const filePath = getLocalDbFilePath();
  if (!fs.existsSync(filePath)) {
    return { accounts: {}, emailIndex: {}, workspaces: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
      emailIndex: parsed.emailIndex && typeof parsed.emailIndex === 'object' ? parsed.emailIndex : {},
      workspaces: parsed.workspaces && typeof parsed.workspaces === 'object' ? parsed.workspaces : {},
    };
  } catch {
    return { accounts: {}, emailIndex: {}, workspaces: {} };
  }
}

function writeLocalFileDb(db) {
  const filePath = getLocalDbFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function withLocalLock(fn) {
  const next = localQueue.then(fn, fn);
  localQueue = next.catch(() => {});
  return next;
}

const localFileDriver = {
  async getAccountByEmail(email) {
    return withLocalLock(() => {
      const db = readLocalFileDb();
      const id = db.emailIndex[email];
      if (!id) return null;
      return db.accounts[id] ? { ...db.accounts[id] } : null;
    });
  },

  async getAccountById(id) {
    return withLocalLock(() => {
      const db = readLocalFileDb();
      return db.accounts[id] ? { ...db.accounts[id] } : null;
    });
  },

  async createAccountAndWorkspace(account, workspace) {
    return withLocalLock(() => {
      const db = readLocalFileDb();
      if (db.emailIndex[account.email]) {
        const dup = new Error('An account with this email already exists.');
        dup.status = 400;
        throw dup;
      }
      db.accounts[account.id] = { ...account };
      db.emailIndex[account.email] = account.id;
      if (!db.workspaces[account.id]) {
        db.workspaces[account.id] = normalizeWorkspace(account.id, workspace);
      }
      writeLocalFileDb(db);
    });
  },

  async saveAccount(account) {
    return withLocalLock(() => {
      const db = readLocalFileDb();
      db.accounts[account.id] = { ...account };
      db.emailIndex[account.email] = account.id;
      writeLocalFileDb(db);
    });
  },

  async getWorkspace(userId) {
    return withLocalLock(() => {
      const db = readLocalFileDb();
      return normalizeWorkspace(userId, db.workspaces[userId] || null);
    });
  },

  async saveWorkspace(userId, workspace) {
    return withLocalLock(() => {
      const db = readLocalFileDb();
      const normalized = normalizeWorkspace(userId, workspace);
      db.workspaces[userId] = normalized;
      writeLocalFileDb(db);
      return normalized;
    });
  },

  async close() {},
};

// ===========================================================================
// Unified Cloud Store API & Default Clean Om Pal Bootstrap
// ===========================================================================
const DRIVERS = {
  mongodb: mongoDriver,
  postgres: postgresDriver,
  redis: redisDriver,
  blob: blobDriver,
  'local-file': localFileDriver,
};

function getActiveDriver() {
  const driverName = assertCloudConfigured();
  return DRIVERS[driverName];
}

let omPalBootstrapPromise = null;

async function ensureOmPalBootstrapped(driver) {
  const existing = await driver.getAccountById(OM_PAL_ID);
  if (existing) {
    return existing;
  }

  if (!omPalBootstrapPromise) {
    omPalBootstrapPromise = (async () => {
      try {
        const existingEmail = await driver.getAccountByEmail(OM_PAL_EMAIL);
        if (existingEmail) {
          return existingEmail;
        }
        const now = new Date().toISOString();
        const omAccount = {
          id: OM_PAL_ID,
          email: OM_PAL_EMAIL,
          full_name: OM_PAL_NAME,
          password_hash: hashPassword(OM_PAL_DEFAULT_PASSWORD),
          created_at: now,
          updated_at: now,
        };
        const emptyWs = createEmptyWorkspace(OM_PAL_ID);
        await driver.createAccountAndWorkspace(omAccount, emptyWs);
        return omAccount;
      } catch (err) {
        // Handle concurrent first-request race gracefully
        const fallback =
          (await driver.getAccountById(OM_PAL_ID).catch(() => null)) ||
          (await driver.getAccountByEmail(OM_PAL_EMAIL).catch(() => null));
        if (fallback) {
          return fallback;
        }
        throw err;
      } finally {
        omPalBootstrapPromise = null;
      }
    })();
  }

  return omPalBootstrapPromise;
}

// Per-process mutex keyed by userId to avoid local concurrent lost updates
const userMutationTail = new Map();

function runSerializedForUser(userId, fn) {
  const prev = userMutationTail.get(userId) || Promise.resolve();
  const next = prev.then(fn, fn);
  userMutationTail.set(userId, next.catch(() => {}));
  return next;
}

async function getAccountByEmail(email) {
  const driver = getActiveDriver();
  const normEmail = String(email || '').toLowerCase().trim();
  if (normEmail === OM_PAL_EMAIL) {
    await ensureOmPalBootstrapped(driver);
  }
  return driver.getAccountByEmail(normEmail);
}

async function getAccountById(userId) {
  const driver = getActiveDriver();
  if (userId === OM_PAL_ID) {
    await ensureOmPalBootstrapped(driver);
  }
  return driver.getAccountById(userId);
}

async function createAccountAndWorkspace(account, workspace) {
  const driver = getActiveDriver();
  if (account.email === OM_PAL_EMAIL) {
    await ensureOmPalBootstrapped(driver);
  }
  return driver.createAccountAndWorkspace(account, workspace);
}

async function saveAccount(account) {
  const driver = getActiveDriver();
  return driver.saveAccount(account);
}

async function getWorkspace(userId) {
  const driver = getActiveDriver();
  return driver.getWorkspace(userId);
}

async function saveWorkspace(userId, workspace) {
  const driver = getActiveDriver();
  return driver.saveWorkspace(userId, workspace);
}

async function mutateWorkspace(userId, mutatorFn) {
  const driver = getActiveDriver();
  return runSerializedForUser(userId, async () => {
    const currentWs = await driver.getWorkspace(userId);
    const outcome = await mutatorFn(currentWs);
    await driver.saveWorkspace(userId, outcome.workspace);
    return outcome.result;
  });
}

async function closeCloudStore() {
  omPalBootstrapPromise = null;
  await Promise.allSettled([
    mongoDriver.close(),
    postgresDriver.close(),
    redisDriver.close(),
    blobDriver.close(),
    localFileDriver.close(),
  ]);
}

module.exports = {
  OM_PAL_ID,
  OM_PAL_EMAIL,
  getCloudStatus,
  assertCloudConfigured,
  getAccountByEmail,
  getAccountById,
  createAccountAndWorkspace,
  saveAccount,
  getWorkspace,
  saveWorkspace,
  mutateWorkspace,
  closeCloudStore,
};
