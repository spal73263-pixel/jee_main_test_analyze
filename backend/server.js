const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { BASE_DIR, PORT, UPLOAD_DIR } = require('./config/env');
const cloudStore = require('./services/cloudStore');

const usersRouter = require('./routes/users');
const uploadsRouter = require('./routes/uploads');
const testsRouter = require('./routes/tests');
const dashboardRouter = require('./routes/dashboard');
const subjectsRouter = require('./routes/subjects');
const predictionsRouter = require('./routes/predictions');
const plannerRouter = require('./routes/planner');
const hscRevisionRouter = require('./routes/hscRevision');

const app = express();

// CORS & body parsers
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Prevent mobile/proxy caching on API responses so multi-phone sync is always fresh
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Health check & cloud sync status
app.get('/api/health', (req, res) => {
  const cloud = cloudStore.getCloudStatus();
  res.json({
    status: 'healthy',
    app: 'JEE Main Performance Analyzer',
    version: '2.0.0',
    storage: cloud.storage_driver,
    storage_driver: cloud.storage_driver,
    cloud_sync_ready: cloud.cloud_sync_ready,
    requires_cloud_config: cloud.requires_cloud_config,
    cross_device_sync: cloud.cross_device_sync,
  });
});

// Temporary uploads directory (for PDF / Excel / OCR parsing)
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Ignore on read-only paths
}

// Application REST API routes
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/hsc-revision', hscRevisionRouter);

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
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(INDEX_HTML);
  });
}

// Express global error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    detail: err.message || 'Internal server error.',
    ...(err.setup_required ? { setup_required: true } : {}),
  });
});

// Standalone local / Docker / Render execution
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const cloud = cloudStore.getCloudStatus();
    console.log(
      `Server listening on http://localhost:${PORT} (storage_driver=${cloud.storage_driver}, cloud_sync_ready=${cloud.cloud_sync_ready})`
    );
  });

  const shutdown = async () => {
    await cloudStore.closeCloudStore().catch(() => {});
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
