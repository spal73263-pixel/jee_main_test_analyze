const express = require('express');
const mongoose = require('mongoose');
const {
  StudyPlan,
  StudyTask,
  ChapterPerformance,
  ScheduledTestReminder,
} = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function formatStudyPlan(planDoc) {
  const tasks = await StudyTask.find({ plan_id: planDoc._id }).sort({ _id: 1 });
  const planObj = planDoc.toObject();
  planObj.tasks = tasks.map((t) => t.toObject());
  return planObj;
}

async function generateDynamicPlan(user) {
  const chapters = await ChapterPerformance.find({ user_id: user._id });

  const chapAcc = new Map();
  for (const c of chapters) {
    if (c.attempted > 0) {
      const key = `${c.subject}::${c.chapter_name}`;
      if (!chapAcc.has(key)) {
        chapAcc.set(key, { subject: c.subject, chapter: c.chapter_name, correct: 0, attempted: 0 });
      }
      const entry = chapAcc.get(key);
      entry.correct += Number(c.correct || 0);
      entry.attempted += Number(c.attempted || 0);
    }
  }

  const weakList = [];
  for (const d of chapAcc.values()) {
    const acc = (d.correct / d.attempted) * 100;
    if (acc < 65) {
      weakList.push({ subject: d.subject, chapter: d.chapter, acc });
    }
  }
  weakList.sort((a, b) => a.acc - b.acc);

  const defaultRotation = [
    ['Physics', 'Rotational Motion', 'Moment of inertia theorems and rolling dynamics with PYQs'],
    ['Chemistry', 'Chemical Bonding and Molecular Structure', 'Hybridization, molecular orbital theory, and dipole moments'],
    ['Mathematics', 'Integral Calculus', 'Definite integration properties and reduction formulas'],
    ['Physics', 'Current Electricity', "Kirchhoff's loop rules, potentiometer, and RC circuit transients"],
    ['Chemistry', 'General Organic Chemistry', 'Resonance structures, hyperconjugation, and acidity orders'],
    ['Mathematics', 'Matrices and Determinants', "Cramer's rule, inverse properties, and system of equations"],
    ['All Subjects', 'Full Mock Test', 'Timed 3-hour examination under strict exam conditions'],
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayStr = new Date().toISOString().split('T')[0];

  const plan = await StudyPlan.create({
    user_id: user._id,
    title: `7-Day Targeted Recovery Plan (Week of ${todayStr})`,
    week_start_date: todayStr,
    is_active: true,
    summary: 'Focused high-yield revision schedule addressing topics with high negative marking and low accuracy.',
  });

  const tasksData = days.map((day, i) => {
    let sub;
    let chap;
    let desc;
    if (i < weakList.length) {
      sub = weakList[i].subject;
      chap = weakList[i].chapter;
      desc = `Concept revision (${Math.round(weakList[i].acc)}% accuracy in recent tests) + 25 timed practice problems.`;
    } else {
      [sub, chap, desc] = defaultRotation[i % defaultRotation.length];
    }

    return {
      plan_id: plan._id,
      user_id: user._id,
      day_of_week: day,
      subject: sub,
      chapter: chap,
      task_description: desc,
      duration_minutes: day !== 'Saturday' ? 90 : 180,
      practice_questions: day !== 'Saturday' ? 25 : 75,
      revision_topics: 'Formulas, short-notes, and 2021-2025 PYQ error questions.',
      is_completed: false,
    };
  });

  await StudyTask.insertMany(tasksData);
  return formatStudyPlan(plan);
}

router.get('', requireAuth, async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user_id: req.user._id, is_active: true }).sort({
      generated_date: -1,
    });

    if (!plan) {
      const generated = await generateDynamicPlan(req.user);
      return res.json(generated);
    }

    const formatted = await formatStudyPlan(plan);
    return res.json(formatted);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    await StudyPlan.updateMany({ user_id: req.user._id }, { $set: { is_active: false } });
    const generated = await generateDynamicPlan(req.user);
    return res.json(generated);
  } catch (err) {
    next(err);
  }
});

router.put('/tasks/:taskId/toggle', requireAuth, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(404).json({ detail: 'Task not found.' });
    }

    const task = await StudyTask.findOne({ _id: taskId, user_id: req.user._id });
    if (!task) {
      return res.status(404).json({ detail: 'Task not found.' });
    }

    task.is_completed = !task.is_completed;
    await task.save();
    return res.json({ id: String(task._id), is_completed: task.is_completed });
  } catch (err) {
    next(err);
  }
});

router.post('/tasks', requireAuth, async (req, res, next) => {
  try {
    const {
      day_of_week,
      subject,
      chapter,
      duration_hours,
      practice_questions,
      revision_topics,
      task_description,
    } = req.body || {};

    if (!subject || !chapter) {
      return res.status(400).json({ detail: 'subject and chapter are required.' });
    }

    let plan = await StudyPlan.findOne({ user_id: req.user._id, is_active: true }).sort({
      generated_date: -1,
    });
    if (!plan) {
      const created = await generateDynamicPlan(req.user);
      plan = await StudyPlan.findById(created.id);
    }

    const hrs = Number(duration_hours || 2.0);
    const pq = Number(practice_questions ?? 20);
    const durationMins = Math.round(hrs * 60);
    const desc =
      task_description || `Study ${chapter} (${hrs} hrs) + ${pq} practice questions.`;

    const task = await StudyTask.create({
      plan_id: plan._id,
      user_id: req.user._id,
      day_of_week: day_of_week || 'Monday',
      subject,
      chapter,
      task_description: desc,
      duration_minutes: durationMins,
      practice_questions: pq,
      revision_topics: revision_topics || `Focus on ${chapter} core problems.`,
      is_completed: false,
    });

    return res.json(task.toObject());
  } catch (err) {
    next(err);
  }
});

router.delete('/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(404).json({ detail: 'Task not found.' });
    }

    const deleted = await StudyTask.findOneAndDelete({ _id: taskId, user_id: req.user._id });
    if (!deleted) {
      return res.status(404).json({ detail: 'Task not found.' });
    }
    return res.json({ message: 'Study task deleted.' });
  } catch (err) {
    next(err);
  }
});

// Scheduled Mock Test Reminders Endpoints
router.get('/tests', requireAuth, async (req, res, next) => {
  try {
    const tests = await ScheduledTestReminder.find({ user_id: req.user._id }).sort({
      scheduled_date: 1,
    });
    return res.json(tests.map((t) => t.toObject()));
  } catch (err) {
    next(err);
  }
});

router.post('/tests', requireAuth, async (req, res, next) => {
  try {
    const {
      test_title,
      exam_type,
      scheduled_date,
      scheduled_time,
      duration_minutes,
      syllabus_chapters,
    } = req.body || {};

    if (!test_title || !scheduled_date) {
      return res.status(400).json({ detail: 'test_title and scheduled_date are required.' });
    }

    const rem = await ScheduledTestReminder.create({
      user_id: req.user._id,
      test_title,
      exam_type: exam_type || 'JEE Main',
      scheduled_date,
      scheduled_time: scheduled_time || '09:00 AM',
      duration_minutes: Number(duration_minutes || 180),
      syllabus_chapters: syllabus_chapters || 'Full Syllabus',
      is_completed: false,
    });

    return res.json(rem.toObject());
  } catch (err) {
    next(err);
  }
});

router.delete('/tests/:testId', requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(404).json({ detail: 'Scheduled test not found.' });
    }

    const deleted = await ScheduledTestReminder.findOneAndDelete({
      _id: testId,
      user_id: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ detail: 'Scheduled test not found.' });
    }
    return res.json({ message: 'Scheduled test deleted.' });
  } catch (err) {
    next(err);
  }
});

router.put('/tests/:testId/toggle', requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(404).json({ detail: 'Scheduled test not found.' });
    }

    const rem = await ScheduledTestReminder.findOne({ _id: testId, user_id: req.user._id });
    if (!rem) {
      return res.status(404).json({ detail: 'Scheduled test not found.' });
    }

    rem.is_completed = !rem.is_completed;
    await rem.save();
    return res.json(rem.toObject());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
