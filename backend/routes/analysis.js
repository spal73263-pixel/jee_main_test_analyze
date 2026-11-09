const express = require('express');
const mongoose = require('mongoose');
const {
  Test,
  SubjectResult,
  ChapterPerformance,
  WeakTopicReminder,
} = require('../models');
const { requireAuth } = require('../middleware/auth');
const { round1, round2 } = require('../services/marksCalculator');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const tests = await Test.find({ user_id: req.user._id }).sort({ test_date: 1, created_at: 1 });

    if (tests.length === 0) {
      return res.json({
        total_tests: 0,
        average_marks: 0.0,
        highest_marks: 0.0,
        lowest_marks: 0.0,
        average_accuracy: 0.0,
        latest_test_score: 0.0,
        latest_test_name: null,
        latest_test_date: null,
        overall_improvement: 0.0,
        average_percentile: null,
        marks_history: [],
        subject_comparison: [],
        accuracy_history: [],
        question_status_breakdown: { Correct: 0, Incorrect: 0, Unattempted: 0 },
        weak_topics_count: 0,
        strong_topics_count: 0,
      });
    }

    const totalTests = tests.length;
    const marksList = tests.map((t) => Number(t.marks_obtained || 0));
    const avgMarks = round1(marksList.reduce((a, b) => a + b, 0) / totalTests);
    const highestMarks = Math.max(...marksList);
    const lowestMarks = Math.min(...marksList);
    const avgAccuracy = round1(
      tests.reduce((acc, t) => acc + Number(t.overall_accuracy || 0), 0) / totalTests
    );

    const latestTest = tests[tests.length - 1];
    const firstTest = tests[0];
    const overallImprovement =
      totalTests > 1
        ? round1(Number(latestTest.marks_obtained || 0) - Number(firstTest.marks_obtained || 0))
        : 0.0;

    const percentiles = tests
      .filter((t) => t.official_percentile !== null && t.official_percentile !== undefined)
      .map((t) => Number(t.official_percentile));
    const avgPercentile =
      percentiles.length > 0
        ? round2(percentiles.reduce((a, b) => a + b, 0) / percentiles.length)
        : null;

    const [allSubjectResults, allChapters] = await Promise.all([
      SubjectResult.find({ test_id: { $in: tests.map((t) => t._id) } }),
      ChapterPerformance.find({ user_id: req.user._id }),
    ]);

    const subResultsByTest = new Map();
    for (const s of allSubjectResults) {
      const tid = String(s.test_id);
      if (!subResultsByTest.has(tid)) subResultsByTest.set(tid, []);
      subResultsByTest.get(tid).push(s);
    }

    const marksHistory = [];
    const accuracyHistory = [];

    const subjectTotals = {
      Physics: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
      Chemistry: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
      Mathematics: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
    };

    const statusBreakdown = { Correct: 0, Incorrect: 0, Unattempted: 0 };

    for (const t of tests) {
      const subs = subResultsByTest.get(String(t._id)) || [];
      const subMap = {};
      for (const s of subs) {
        subMap[s.subject] = Number(s.total_marks || 0);
        if (subjectTotals[s.subject]) {
          subjectTotals[s.subject].marks += Number(s.total_marks || 0);
          subjectTotals[s.subject].accuracy_sum += Number(s.accuracy || 0);
          subjectTotals[s.subject].neg_marks += Number(s.negative_marks || 0);
          subjectTotals[s.subject].count += 1;
        }
        statusBreakdown.Correct += Number(s.correct || 0);
        statusBreakdown.Incorrect += Number(s.incorrect || 0);
        statusBreakdown.Unattempted += Number(s.unattempted || 0);
      }

      marksHistory.push({
        test_id: String(t._id),
        test_name: t.test_name,
        date: t.test_date,
        total_marks: t.marks_obtained,
        physics: subMap.Physics || 0.0,
        chemistry: subMap.Chemistry || 0.0,
        mathematics: subMap.Mathematics || 0.0,
        percentile: t.official_percentile,
      });

      accuracyHistory.push({
        test_name: t.test_name,
        date: t.test_date,
        accuracy: t.overall_accuracy,
        attempt_rate: t.attempt_rate,
      });
    }

    const subjectComparison = Object.entries(subjectTotals).map(([sub, data]) => {
      const cnt = data.count || 1;
      return {
        subject: sub,
        average_marks: round1(data.marks / cnt),
        average_accuracy: round1(data.accuracy_sum / cnt),
        total_negative_marks: round1(data.neg_marks),
      };
    });

    const weakCount = allChapters.filter((c) => c.classification === 'Weak').length;
    const strongCount = allChapters.filter((c) => c.classification === 'Strong').length;

    return res.json({
      total_tests: totalTests,
      average_marks: avgMarks,
      highest_marks: highestMarks,
      lowest_marks: lowestMarks,
      average_accuracy: avgAccuracy,
      latest_test_score: latestTest.marks_obtained,
      latest_test_name: latestTest.test_name,
      latest_test_date: latestTest.test_date,
      overall_improvement: overallImprovement,
      average_percentile: avgPercentile,
      marks_history: marksHistory,
      subject_comparison: subjectComparison,
      accuracy_history: accuracyHistory,
      question_status_breakdown: statusBreakdown,
      weak_topics_count: weakCount,
      strong_topics_count: strongCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/weak-topics', requireAuth, async (req, res, next) => {
  try {
    const chapters = await ChapterPerformance.find({ user_id: req.user._id });
    if (chapters.length === 0) {
      return res.json({
        strong_topics: [],
        average_topics: [],
        weak_topics: [],
        repeated_mistakes: [],
        strongest_subject: 'N/A',
        weakest_subject: 'N/A',
        strongest_chapter: 'N/A',
        weakest_chapter: 'N/A',
        total_negative_marks: 0.0,
        total_weak_chapters: 0,
      });
    }

    const aggMap = new Map();
    for (const c of chapters) {
      const key = `${c.subject}::${c.chapter_name}`;
      if (!aggMap.has(key)) {
        aggMap.set(key, {
          subject: c.subject,
          chapter_name: c.chapter_name,
          unit_category: c.unit_category,
          total_questions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          marks: 0.0,
        });
      }
      const item = aggMap.get(key);
      item.total_questions += Number(c.total_questions || 0);
      item.attempted += Number(c.attempted || 0);
      item.correct += Number(c.correct || 0);
      item.incorrect += Number(c.incorrect || 0);
      item.marks += Number(c.marks || 0);
    }

    const strong = [];
    const average = [];
    const weak = [];

    for (const item of aggMap.values()) {
      const acc = item.attempted > 0 ? round1((item.correct / item.attempted) * 100) : 0.0;
      item.accuracy = acc;
      if (acc >= 80.0 && item.attempted >= 2) {
        strong.push(item);
      } else if (acc >= 50.0) {
        average.push(item);
      } else {
        weak.push(item);
      }
    }

    strong.sort((a, b) => b.accuracy - a.accuracy);
    weak.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.incorrect - a.incorrect;
    });

    const subPerf = {};
    for (const item of aggMap.values()) {
      if (!subPerf[item.subject]) {
        subPerf[item.subject] = { attempted: 0, correct: 0 };
      }
      subPerf[item.subject].attempted += item.attempted;
      subPerf[item.subject].correct += item.correct;
    }

    let strongestSub = 'N/A';
    let weakestSub = 'N/A';
    let bestSubAcc = -1;
    let worstSubAcc = Infinity;

    for (const [sub, d] of Object.entries(subPerf)) {
      const acc = d.attempted > 0 ? (d.correct / d.attempted) * 100 : 0;
      if (acc > bestSubAcc) {
        bestSubAcc = acc;
        strongestSub = sub;
      }
      if (acc < worstSubAcc) {
        worstSubAcc = acc;
        weakestSub = sub;
      }
    }

    const strongestChap = strong.length > 0 ? strong[0].chapter_name : 'N/A';
    const weakestChap = weak.length > 0 ? weak[0].chapter_name : 'N/A';

    const repeatedMistakes = weak
      .filter((w) => w.incorrect >= 2)
      .map((w) => ({
        chapter: w.chapter_name,
        subject: w.subject,
        incorrect_count: w.incorrect,
        accuracy: w.accuracy,
        recommendation: `Revise fundamental concepts in ${w.chapter_name} and practice 20 standard formula application problems before attempting next mock.`,
      }));

    return res.json({
      strong_topics: strong,
      average_topics: average,
      weak_topics: weak,
      repeated_mistakes: repeatedMistakes,
      strongest_subject: strongestSub,
      weakest_subject: weakestSub,
      strongest_chapter: strongestChap,
      weakest_chapter: weakestChap,
      total_weak_chapters: weak.length,
    });
  } catch (err) {
    next(err);
  }
});

// Weak Topic Reminders CRUD
router.get('/reminders', requireAuth, async (req, res, next) => {
  try {
    const reminders = await WeakTopicReminder.find({ user_id: req.user._id }).sort({ created_at: -1 });
    return res.json(reminders.map((r) => r.toObject()));
  } catch (err) {
    next(err);
  }
});

router.post('/reminders', requireAuth, async (req, res, next) => {
  try {
    const { subject, chapter_name, marks_lost, notes, exam_type } = req.body || {};
    if (!subject || !chapter_name) {
      return res.status(400).json({ detail: 'subject and chapter_name are required.' });
    }

    const reminder = await WeakTopicReminder.create({
      user_id: req.user._id,
      subject,
      chapter_name,
      marks_lost: Number(marks_lost || 0),
      notes: notes || null,
      exam_type: exam_type || 'JEE Main',
    });

    return res.json(reminder.toObject());
  } catch (err) {
    next(err);
  }
});

router.delete('/reminders/:reminderId', requireAuth, async (req, res, next) => {
  try {
    const { reminderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reminderId)) {
      return res.status(404).json({ detail: 'Reminder not found.' });
    }

    const deleted = await WeakTopicReminder.findOneAndDelete({
      _id: reminderId,
      user_id: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ detail: 'Reminder not found.' });
    }
    return res.json({ message: 'Reminder deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

router.put('/reminders/:reminderId/toggle', requireAuth, async (req, res, next) => {
  try {
    const { reminderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reminderId)) {
      return res.status(404).json({ detail: 'Reminder not found.' });
    }

    const rem = await WeakTopicReminder.findOne({ _id: reminderId, user_id: req.user._id });
    if (!rem) {
      return res.status(404).json({ detail: 'Reminder not found.' });
    }

    rem.is_resolved = !rem.is_resolved;
    await rem.save();
    return res.json(rem.toObject());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
