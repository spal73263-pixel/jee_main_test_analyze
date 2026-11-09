const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { BASE_DIR, PORT, UPLOAD_DIR } = require('./config/env');
const uploadsRouter = require('./routes/uploads');

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'JEE Main Performance Analyzer',
    version: '1.0.0',
    storage: 'browser-localStorage',
    database: 'none',
  });
});

// Temporary uploads directory (for PDF / Excel / OCR parsing)
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Ignore on read-only paths
}

// Stateless file parsing routes
app.use('/api/uploads', uploadsRouter);

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
  });
});

// Standalone local / Docker / Render execution
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT} (browser localStorage mode, zero DB)`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
