const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, StudentProfile } = require('../models');
const { JWT_SECRET, ACCESS_TOKEN_EXPIRE_MINUTES } = require('../config/env');

async function verifyPassword(plainPassword, hashedPassword) {
  try {
    return await bcrypt.compare(String(plainPassword), String(hashedPassword));
  } catch {
    return false;
  }
}

async function getPasswordHash(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(String(password), salt);
}

function createAccessToken(payload, expiresInSeconds = null) {
  const expiresIn = expiresInSeconds || ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn,
  });
}

async function formatUserOut(userDoc) {
  const userObj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete userObj.hashed_password;
  const profile = await StudentProfile.findOne({ user_id: userDoc._id });
  userObj.profile = profile ? profile.toObject() : null;
  return userObj;
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const email = decoded?.sub;
    if (!email) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
}

module.exports = {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  formatUserOut,
  requireAuth,
};
