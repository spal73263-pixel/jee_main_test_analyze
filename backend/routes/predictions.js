const express = require('express');
const cloudStore = require('../services/cloudStore');
const { requireAuth } = require('../middleware/auth');
const workspaceService = require('../services/workspaceService');

const router = express.Router();

router.use(requireAuth);

router.get('/target-analysis', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getTargetAnalysis(req.userId, ws));
  } catch (err) {
    return next(err);
  }
});

router.post('/compare', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    const { test_ids } = req.body || {};
    return res.json(workspaceService.compareTests(req.userId, ws, test_ids));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
