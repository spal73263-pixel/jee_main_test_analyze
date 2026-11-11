const express = require('express');
const cloudStore = require('../services/cloudStore');
const { requireAuth } = require('../middleware/auth');
const workspaceService = require('../services/workspaceService');

const router = express.Router();

router.use(requireAuth);

router.get('/plan', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    const out = workspaceService.getStudyPlan(req.userId, ws);
    if (out.mutated) {
      await cloudStore.saveWorkspace(req.userId, out.workspace);
    }
    return res.json(out.result);
  } catch (err) {
    return next(err);
  }
});

router.post('/regenerate', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.regenerateStudyPlan(req.userId, ws)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const task = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.addStudyTask(req.userId, ws, req.body || {})
    );
    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
});

router.patch('/tasks/:taskId/toggle', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.toggleStudyTask(req.userId, ws, req.params.taskId)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.delete('/tasks/:taskId', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.deleteStudyTask(req.userId, ws, req.params.taskId)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/scheduled-tests', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getScheduledTests(req.userId, ws));
  } catch (err) {
    return next(err);
  }
});

router.post('/scheduled-tests', async (req, res, next) => {
  try {
    const created = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.scheduleTest(req.userId, ws, req.body || {})
    );
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

router.patch('/scheduled-tests/:testId/toggle', async (req, res, next) => {
  try {
    const updated = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.toggleScheduledTest(req.userId, ws, req.params.testId)
    );
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

router.delete('/scheduled-tests/:testId', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.deleteScheduledTest(req.userId, ws, req.params.testId)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
