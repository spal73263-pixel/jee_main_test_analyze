const express = require('express');
const cloudStore = require('../services/cloudStore');
const { requireAuth } = require('../middleware/auth');
const workspaceService = require('../services/workspaceService');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getHscChapters(req.userId, ws, req.query || {}));
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const created = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.addHscChapter(req.userId, ws, req.body || {})
    );
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/increment', async (req, res, next) => {
  try {
    const updated = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.incrementHscRevision(req.userId, ws, req.params.id)
    );
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.deleteHscChapter(req.userId, ws, req.params.id)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
