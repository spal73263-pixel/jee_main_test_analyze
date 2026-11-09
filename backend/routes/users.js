const express = require('express');
const jwt = require('jsonwebtoken');
const { User, StudentProfile } = require('../models');
const {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  formatUserOut,
  requireAuth,
} = require('../middleware/auth');
const { JWT_SECRET } = require('../config/env');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, target_year, target_marks, target_percentile } = req.body || {};

    if (!email || !password || !full_name) {
      return res.status(400).json({ detail: 'Email, password, and full_name are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ detail: 'An account with this email already exists.' });
    }

    const hashed_password = await getPasswordHash(password);
    const newUser = await User.create({
      email: normalizedEmail,
      hashed_password,
      full_name: String(full_name).trim(),
    });

    await StudentProfile.create({
      user_id: newUser._id,
      target_year: target_year || 2026,
      target_marks: target_marks || 220.0,
      target_percentile: target_percentile || 99.0,
    });

    const access_token = createAccessToken({ sub: newUser.email });
    const userOut = await formatUserOut(newUser);

    return res.json({
      access_token,
      token_type: 'bearer',
      user: userOut,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(401).json({ detail: 'Incorrect email or password.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await verifyPassword(password, user.hashed_password))) {
      return res.status(401).json({ detail: 'Incorrect email or password.' });
    }

    const access_token = createAccessToken({ sub: user.email });
    const userOut = await formatUserOut(user);

    return res.json({
      access_token,
      token_type: 'bearer',
      user: userOut,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userOut = await formatUserOut(req.user);
    return res.json(userOut);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const allowedFields = [
      'target_year',
      'target_attempt',
      'target_percentile',
      'target_marks',
      'target_physics_marks',
      'target_chemistry_marks',
      'target_maths_marks',
      'daily_study_hours',
      'target_exam_date',
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user_id: req.user._id },
      { $set: updates, $setOnInsert: { user_id: req.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json(profile.toObject());
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ detail: 'Email address is required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.json({
        message: 'If this email is registered, password reset instructions have been sent.',
      });
    }

    const reset_token = createAccessToken({ sub: user.email, type: 'reset' }, 3600);
    return res.json({
      message: 'Password reset token generated successfully.',
      reset_token,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, new_password } = req.body || {};
    if (!token || !new_password || String(new_password).length < 6) {
      return res.status(400).json({ detail: 'Valid token and password (min 6 characters) are required.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(400).json({ detail: 'Invalid or expired reset token.' });
    }

    if (!payload?.sub) {
      return res.status(400).json({ detail: 'Invalid token.' });
    }

    const user = await User.findOne({ email: String(payload.sub).toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ detail: 'User not found.' });
    }

    user.hashed_password = await getPasswordHash(new_password);
    await user.save();

    return res.json({ message: 'Password successfully updated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
