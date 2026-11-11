const crypto = require('crypto');
const { getTokenSecretKey } = require('../config/env');

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plainPassword), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(plainPassword, storedHash) {
  const raw = String(storedHash || '');
  if (raw.startsWith('scrypt:')) {
    const parts = raw.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hexHash] = parts;
    const derived = crypto.scryptSync(String(plainPassword), salt, 64);
    const expected = Buffer.from(hexHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }
  return false;
}

function signToken(payload, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const body = toBase64Url(
    JSON.stringify({
      ...payload,
      iat: nowSec,
      exp: nowSec + expiresInSeconds,
    })
  );
  const signingInput = `${header}.${body}`;
  const sig = crypto
    .createHmac('sha256', getTokenSecretKey())
    .update(signingInput)
    .digest();
  return `${signingInput}.${toBase64Url(sig)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, bodyB64, sigB64] = parts;
  const signingInput = `${headerB64}.${bodyB64}`;
  const expectedSig = toBase64Url(
    crypto.createHmac('sha256', getTokenSecretKey()).update(signingInput).digest()
  );

  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(bodyB64));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSec > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload || !payload.sub || payload.purpose === 'reset') {
    return res.status(401).json({ detail: 'Session expired or invalid. Please sign in again.' });
  }
  req.userId = String(payload.sub);
  return next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
};
