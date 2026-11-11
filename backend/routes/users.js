const express = require('express');
const cloudStore = require('../services/cloudStore');
const { hashPassword, verifyPassword, signToken, verifyToken, requireAuth } = require('../middleware/auth');
const {
  createHttpError,
  genId,
  createEmptyWorkspace,
  formatUserOut,
  updateProfileFields,
} = require('../services/workspaceService');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw createHttpError(401, 'Incorrect email or password.');
    }

    const normEmail = String(email).toLowerCase().trim();
    const account = await cloudStore.getAccountByEmail(normEmail);
    if (!account || !verifyPassword(String(password), account.password_hash)) {
      throw createHttpError(401, 'Incorrect email or password.');
    }

    const workspace = await cloudStore.getWorkspace(account.id);
    const accessToken = signToken({ sub: account.id, email: account.email });

    return res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: formatUserOut(account, workspace),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, target_year, target_marks, target_percentile } = req.body || {};
    if (!email || !password || !full_name) {
      throw createHttpError(400, 'Email, password, and full_name are required.');
    }
    if (String(password).length < 6) {
      throw createHttpError(400, 'Password must be at least 6 characters.');
    }

    const normEmail = String(email).toLowerCase().trim();
    const existing = await cloudStore.getAccountByEmail(normEmail);
    if (existing) {
      throw createHttpError(400, 'An account with this email already exists.');
    }

    const now = new Date().toISOString();
    const userId = genId('usr');
    const account = {
      id: userId,
      email: normEmail,
      full_name: String(full_name).trim(),
      password_hash: hashPassword(String(password)),
      created_at: now,
      updated_at: now,
    };

    const workspace = createEmptyWorkspace(userId, {
      target_year: Number(target_year || 2026),
      target_marks: Number(target_marks || 220.0),
      target_percentile: Number(target_percentile || 99.0),
    });

    await cloudStore.createAccountAndWorkspace(account, workspace);
    const accessToken = signToken({ sub: account.id, email: account.email });

    return res.status(201).json({
      access_token: accessToken,
      token_type: 'bearer',
      user: formatUserOut(account, workspace),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const account = await cloudStore.getAccountById(req.userId);
    if (!account) {
      throw createHttpError(401, 'Could not validate credentials');
    }
    const workspace = await cloudStore.getWorkspace(account.id);
    return res.json(formatUserOut(account, workspace));
  } catch (err) {
    return next(err);
  }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const account = await cloudStore.getAccountById(req.userId);
    if (!account) {
      throw createHttpError(401, 'Could not validate credentials');
    }
    const workspace = await cloudStore.getWorkspace(account.id);
    const updated = updateProfileFields(account.id, workspace, account, req.body || {});

    if (updated.account.full_name !== account.full_name) {
      await cloudStore.saveAccount(updated.account);
    }
    await cloudStore.saveWorkspace(account.id, updated.workspace);

    return res.json(updated.result);
  } catch (err) {
    return next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      throw createHttpError(400, 'Email address is required.');
    }
    const normEmail = String(email).toLowerCase().trim();
    const account = await cloudStore.getAccountByEmail(normEmail);
    if (!account) {
      return res.json({
        message: 'If this email is registered, password reset instructions have been sent.',
      });
    }
    const resetToken = signToken({ sub: account.id, purpose: 'reset' }, 900);
    return res.json({
      message: 'Password reset token generated successfully.',
      reset_token: resetToken,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, new_password } = req.body || {};
    if (!token || !new_password || String(new_password).length < 6) {
      throw createHttpError(400, 'Valid token and password (min 6 characters) are required.');
    }
    const payload = verifyToken(String(token));
    if (!payload || payload.purpose !== 'reset' || !payload.sub) {
      throw createHttpError(400, 'Invalid or expired reset token.');
    }
    const account = await cloudStore.getAccountById(String(payload.sub));
    if (!account) {
      throw createHttpError(404, 'User not found.');
    }
    account.password_hash = hashPassword(String(new_password));
    account.updated_at = new Date().toISOString();
    await cloudStore.saveAccount(account);

    return res.json({ message: 'Password successfully updated.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
