const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { BASE_DIR, IS_VERCEL, MONGODB_URI } = require('./env');

let connectionPromise = null;
let memoryServerInstance = null;
let seedPromise = null;

async function startLocalMemoryMongo() {
  let MongoMemoryServer;
  try {
    const pkgName = 'mongodb-memory-server';
    ({ MongoMemoryServer } = require(pkgName));
  } catch (err) {
    throw new Error(
      'No local MongoDB service detected on mongodb://127.0.0.1:27017 and mongodb-memory-server is not installed. Set MONGODB_URI in backend/.env or install MongoDB.'
    );
  }

  const dbPath = path.join(BASE_DIR, '.mongodb-data');
  try {
    fs.mkdirSync(dbPath, { recursive: true });
    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });
  } catch (err) {
    console.warn('Persistent local MongoDB data fallback failed, starting ephemeral local instance:', err.message);
    memoryServerInstance = await MongoMemoryServer.create();
  }

  const uri = memoryServerInstance.getUri('jee_analyzer');
  console.log(`Started embedded local MongoDB at ${uri}`);
  return uri;
}

function normalizeMongoConnection(rawUri) {
  const trimmed = String(rawUri || '').trim();
  const schemeMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/);
  if (!schemeMatch) {
    return { uri: trimmed, dbName: undefined };
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
    let pass = authMatch[2];
    const host = authMatch[3];
    tail = authMatch[4] || '';

    try {
      pass = decodeURIComponent(pass);
    } catch {
      // Raw unencoded characters such as % in password
    }
    uri = `${scheme}${encodeURIComponent(decodeURIComponentSafe(user))}:${encodeURIComponent(pass)}@${host}${tail}`;
  } else {
    const slashIdx = rest.indexOf('/');
    tail = slashIdx !== -1 ? rest.slice(slashIdx) : '';
  }

  const pathOnly = tail.split('?')[0].replace(/^\/+/, '');
  return {
    uri,
    dbName: pathOnly ? undefined : 'jee_analyzer',
  };
}

function decodeURIComponentSafe(val) {
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

async function connectWithRetry(rawUri, maxAttempts = 5, delayMs = 2000) {
  const { uri, dbName } = normalizeMongoConnection(rawUri);
  const attempts = IS_VERCEL ? Math.min(maxAttempts, 2) : maxAttempts;
  const retryDelay = IS_VERCEL ? 1000 : delayMs;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: uri.includes('127.0.0.1') ? 2500 : 7500,
        ...(dbName ? { dbName } : {}),
      });
      return mongoose.connection;
    } catch (err) {
      console.error(`MongoDB connect attempt ${attempt}/${attempts} failed:`, err.message);
      if (attempt === attempts) {
        const errMsg = String(err.message || '');
        if (IS_VERCEL && (errMsg.includes('whitelist') || errMsg.includes('Server selection') || errMsg.includes('ECONNREFUSED'))) {
          throw new Error(
            `Could not connect to MongoDB Atlas (${errMsg}). In MongoDB Atlas -> Network Access, add IP 0.0.0.0/0 (Allow Access from Anywhere) and verify MONGODB_URI.`
          );
        }
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      if (MONGODB_URI) {
        await connectWithRetry(MONGODB_URI, 5, 2000);
        return mongoose.connection;
      }

      if (IS_VERCEL) {
        throw new Error(
          'MONGODB_URI environment variable is not configured. Please add a MongoDB Atlas connection string as MONGODB_URI in Vercel Project Environment Variables.'
        );
      }

      // Local environment without explicit MONGODB_URI: try local mongod first, then embedded fallback
      const localUri = 'mongodb://127.0.0.1:27017/jee_analyzer';
      try {
        await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
        console.log(`Connected to local MongoDB: ${localUri}`);
        return mongoose.connection;
      } catch (localErr) {
        console.log('Local MongoDB not listening on 127.0.0.1:27017, launching zero-config embedded MongoDB...');
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect().catch(() => {});
        }
        const memUri = await startLocalMemoryMongo();
        await mongoose.connect(memUri, { serverSelectionTimeoutMS: 4000 });
        return mongoose.connection;
      }
    } catch (err) {
      connectionPromise = null;
      throw err;
    }
  })();

  return connectionPromise;
}

async function ensureDatabaseReady() {
  await connectDB();
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const { seed } = require('../seedData');
        await seed(false);
      } catch (err) {
        seedPromise = null;
        console.error('Database auto-seed warning:', err.message);
      }
    })();
  }
  await seedPromise;
}

async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
  connectionPromise = null;
  seedPromise = null;
}

module.exports = {
  connectDB,
  ensureDatabaseReady,
  closeDB,
};
