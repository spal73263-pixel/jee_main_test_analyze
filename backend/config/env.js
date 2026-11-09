const os = require('os');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_DIR = path.resolve(__dirname, '..');
const IS_VERCEL = Boolean(process.env.VERCEL);
const PORT = parseInt(process.env.PORT || '8000', 10);

const DEFAULT_UPLOAD_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(BASE_DIR, 'uploads');

const UPLOAD_DIR = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Ignore on read-only build steps
}

module.exports = {
  BASE_DIR,
  IS_VERCEL,
  PORT,
  UPLOAD_DIR,
};
