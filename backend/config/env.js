const os = require('os');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_DIR = path.resolve(__dirname, '..');
const IS_VERCEL = Boolean(process.env.VERCEL);

const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
const JWT_SECRET = process.env.JWT_SECRET || 'jee_main_secret_key_secure_and_random_token_12345';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '10080', 10);
const PORT = parseInt(process.env.PORT || '8000', 10);

const DEFAULT_UPLOAD_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(BASE_DIR, 'uploads');

const UPLOAD_DIR = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  // Ignore on read-only build steps
}

module.exports = {
  BASE_DIR,
  IS_VERCEL,
  MONGODB_URI,
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRE_MINUTES,
  PORT,
  UPLOAD_DIR,
  GEMINI_API_KEY,
};
