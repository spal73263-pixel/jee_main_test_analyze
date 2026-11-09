const express = require('express');
const mongoose = require('mongoose');
const {
  Test,
  SubjectResult,
  QuestionResult,
  ChapterPerformance,
  AIRecommendation,
} = require('../models');
const { requireAuth } = require('../middleware/auth');
const { buildTestDetail, getTimeManagementStats } = require('../services/performanceAnalyzer');

const router = express.Router();

router.get('', requireAuth, async (req, res, next) => {
  try {
    const { search, test_type } = req.query;
    const query = { user_id: req.user._id };

    if (search && String(search).trim() !== '') {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.test_name = { $regex: escaped, $options: 'i' };
    }
    if (test_type && test_type !== 'All') {
      query.test_type = String(test_type);
    }

    const tests = await Test.find(query).sort({ test_date: -1, created_at: -1 });
    if (tests.length === 0) {
      return res.json([]);
    }

    const subResults = await SubjectResult.find({
      test_id: { $in: tests.map((t) => t._id) },
    });

    const subByTestId = new Map();
    for (const s of subResults) {
      const key = String(s.test_id);
      if (!subByTestId.has(key)) subByTestId.set(key, {});
      subByTestId.get(key)[s.subject] = s.total_marks;
    }

    const results = tests.map((t) => {
      const obj = t.toObject();
      obj.subject_marks = subByTestId.get(obj.id) || {};
      return obj;
    });

    return res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get('/:testId', requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(404).json({ detail: 'Test not found.' });
    }

    const test = await Test.findOne({ _id: testId, user_id: req.user._id });
    if (!test) {
      return res.status(404).json({ detail: 'Test not found.' });
    }

    const detail = await buildTestDetail(test);
    return res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.delete('/:testId', requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(404).json({ detail: 'Test not found.' });
    }

    const test = await Test.findOne({ _id: testId, user_id: req.user._id });
    if (!test) {
      return res.status(404).json({ detail: 'Test not found.' });
    }

    await Promise.all([
      SubjectResult.deleteMany({ test_id: test._id }),
      QuestionResult.deleteMany({ test_id: test._id }),
      ChapterPerformance.deleteMany({ test_id: test._id }),
      AIRecommendation.deleteMany({ test_id: test._id }),
      Test.deleteOne({ _id: test._id }),
    ]);

    return res.json({ message: 'Test successfully deleted.' });
  } catch (err) {
    next(err);
  }
});

router.get('/:testId/time', requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(404).json({ detail: 'Test not found.' });
    }

    const test = await Test.findOne({ _id: testId, user_id: req.user._id });
    if (!test) {
      return res.status(404).json({ detail: 'Test not found.' });
    }

    const stats = await getTimeManagementStats(test);
    return res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
