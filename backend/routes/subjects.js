const express = require('express');
const cloudStore = require('../services/cloudStore');
const { requireAuth } = require('../middleware/auth');
const workspaceService = require('../services/workspaceService');

const router = express.Router();

router.use(requireAuth);

router.get('/breakdown', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getSubjectBreakdown(req.userId, ws, req.query || {}));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
