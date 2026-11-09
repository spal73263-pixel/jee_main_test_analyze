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

async function createEmptyPlan(user) {
  const todayStr = new Date().toISOString().split('T')[0];
  const plan = await StudyPlan.create({
    user_id: user._id,
    title: `Weekly Study Plan (Week of ${todayStr})`,
    week_start_date: todayStr,
    is_active: true,
    summary: 'Add your own subjects, chapters, and target study hours for each day of the week.',
  });
  return formatStudyPlan(plan);
}

async function generateDynamicPlanFromTests(user) {
  const chapters = await ChapterPerformance.find({ user_id: user._id });

  if (chapters.length === 0) {
    const err = new Error('Please enter or upload at least one test first so weak chapters can be identified, or add study sessions manually.');
    err.statusCode = 400;
    throw err;
  }

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
    if (acc < 75) {
      weakList.push({ subject: d.subject, chapter: d.chapter, acc });
    }
  }
  weakList.sort((a, b) => a.acc - b.acc);

  if (weakList.length === 0) {
    const err = new Error('All logged chapters currently have >= 75% accuracy. Add custom study sessions manually for targeted practice.');
    err.statusCode = 400;
    throw err;
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayStr = new Date().toISOString().split('T')[0];

  await StudyPlan.updateMany({ user_id: user._id }, { $set: { is_active: false } });

  const plan = await StudyPlan.create({
    user_id: user._id,
    title: `7-Day Targeted Recovery Plan (Week of ${todayStr})`,
    week_start_date: todayStr,
    is_active: true,
    summary: 'Targeted revision schedule generated strictly from your logged test chapter accuracy.',
  });

  const tasksData = weakList.slice(0, 7).map((item, i) => ({
    plan_id: plan._id,
    user_id: user._id,
    day_of_week: days[i % days.length],
    subject: item.subject,
    chapter: item.chapter,
    task_description: `Concept revision (${Math.round(item.acc)}% accuracy in your logged tests) + timed practice problems.`,
    duration_minutes: 90,
    practice_questions: 25,
    revision_topics: `Core formulas and error review for ${item.chapter}.`,
    is_completed: false,
  }));

  await StudyTask.insertMany(tasksData);
  return formatStudyPlan(plan);
}

router.get('', requireAuth, async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user_id: req.user._id, is_active: true }).sort({
      generated_date: -1,
    });

    if (!plan) {
      const empty = await createEmptyPlan(req.user);
      return res.json(empty);
    }

    const formatted = await formatStudyPlan(plan);
    return res.json(formatted);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const generated = await generateDynamicPlanFromTests(req.user);
    return res.json(generated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ detail: err.message });
    }
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
      const created = await createEmptyPlan(req.user);
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
