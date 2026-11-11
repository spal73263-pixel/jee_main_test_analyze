const express = require('express');
const cloudStore = require('../services/cloudStore');
const { requireAuth } = require('../middleware/auth');
const workspaceService = require('../services/workspaceService');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getDashboardOverview(req.userId, ws));
  } catch (err) {
    return next(err);
  }
});

router.get('/weak-topics', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getWeakTopics(req.userId, ws));
  } catch (err) {
    return next(err);
  }
});

router.get('/reminders', async (req, res, next) => {
  try {
    const ws = await cloudStore.getWorkspace(req.userId);
    return res.json(workspaceService.getReminders(req.userId, ws));
  } catch (err) {
    return next(err);
  }
});

router.post('/reminders', async (req, res, next) => {
  try {
    const created = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.addReminder(req.userId, ws, req.body || {})
    );
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

router.delete('/reminders/:id', async (req, res, next) => {
  try {
    const result = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.deleteReminder(req.userId, ws, req.params.id)
    );
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.patch('/reminders/:id/toggle', async (req, res, next) => {
  try {
    const updated = await cloudStore.mutateWorkspace(req.userId, (ws) =>
      workspaceService.toggleReminder(req.userId, ws, req.params.id)
    );
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
