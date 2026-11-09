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

async function connectWithRetry(uri, maxAttempts = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: uri.includes('127.0.0.1') ? 2500 : 10000,
      });
      return mongoose.connection;
    } catch (err) {
      console.error(`MongoDB connect attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
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
