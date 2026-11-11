const express = require('express');
const cloudStore = require('../services/cloudStore');
const { requireAuth } = require('../middleware/auth');
const workspaceService = require('../services/workspaceService');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    const list = workspaceService.getTests(req.userId, ws, req.query || {});
    return res.json(list);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    const detail = workspaceService.getTestDetail(req.userId, ws, req.params.id);
    return res.json(detail);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.deleteTest(req.userId, ws, req.params.id)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id/time-analytics', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    const analytics = workspaceService.getTimeAnalytics(req.userId, ws, req.params.id);
    return res.json(analytics);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
