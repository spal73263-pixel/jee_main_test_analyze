const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const { BASE_DIR, PORT, UPLOAD_DIR } = require('./config/env');
const { ensureDatabaseReady, closeDB } = require('./config/db');

const usersRouter = require('./routes/users');
const uploadsRouter = require('./routes/uploads');
const testsRouter = require('./routes/tests');
const analysisRouter = require('./routes/analysis');
const subjectsRouter = require('./routes/subjects');
const predictionsRouter = require('./routes/predictions');
const studyPlannerRouter = require('./routes/studyPlanner');

const app = express();

// CORS & body parsers
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'JEE Main Performance Analyzer',
    version: '1.0.0',
    stack: 'MERN (MongoDB + Express + React + Node.js)',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'initializing',
  });
});

// Ensure MongoDB connection + demo seed before API routes execute
app.use('/api', async (req, res, next) => {
  try {
    await ensureDatabaseReady();
    return next();
  } catch (err) {
    return res.status(503).json({ detail: err.message || 'Database service unavailable.' });
  }
});

// Static uploads
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Ignore on read-only paths
}
app.use('/static/uploads', express.static(UPLOAD_DIR));

// API routes
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/study-planner', studyPlannerRouter);

// API 404 fallback
app.use('/api', (req, res) => {
  res.status(404).json({ detail: 'API endpoint not found.' });
});

// Production SPA serving when built frontend/dist exists
const FRONTEND_DIST = path.resolve(BASE_DIR, '..', 'frontend', 'dist');
const INDEX_HTML = path.join(FRONTEND_DIST, 'index.html');

if (fs.existsSync(INDEX_HTML)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/static')) {
      return next();
    }
    return res.sendFile(INDEX_HTML);
  });
}

// Express global error handler (returns { detail } matching frontend error interceptors)
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    detail: err.message || 'Internal server error.',
  });
});

// Standalone local / Docker / Render execution
if (require.main === module) {
  let server = null;
  const shutdown = async () => {
    try {
      if (server) {
        server.close();
      }
      await closeDB();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  ensureDatabaseReady()
    .then(() => {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`MERN Server listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Fatal startup error:', err);
      process.exit(1);
    });
}

module.exports = app;
