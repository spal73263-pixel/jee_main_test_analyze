const express = require('express');
const mongoose = require('mongoose');
const { ChapterPerformance } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { round1 } = require('../services/marksCalculator');

const router = express.Router();

router.get('/breakdown', requireAuth, async (req, res, next) => {
  try {
    const { subject, test_id } = req.query;
    const query = { user_id: req.user._id };

    if (test_id) {
      if (!mongoose.Types.ObjectId.isValid(String(test_id))) {
        return res.json({ chapters: [], units: [], subject: subject || null });
      }
      query.test_id = test_id;
    }
    if (subject) {
      query.subject = String(subject);
    }

    const records = await ChapterPerformance.find(query);
    const grouped = new Map();

    for (const r of records) {
      if (!grouped.has(r.chapter_name)) {
        grouped.set(r.chapter_name, {
          chapter_name: r.chapter_name,
          subject: r.subject,
          unit_category: r.unit_category || 'Core',
          total_questions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          marks: 0.0,
        });
      }
      const entry = grouped.get(r.chapter_name);
      entry.total_questions += Number(r.total_questions || 0);
      entry.attempted += Number(r.attempted || 0);
      entry.correct += Number(r.correct || 0);
      entry.incorrect += Number(r.incorrect || 0);
      entry.marks += Number(r.marks || 0);
    }

    const chapterList = [];
    for (const d of grouped.values()) {
      const acc = d.attempted > 0 ? round1((d.correct / d.attempted) * 100) : 0.0;
      d.accuracy = acc;
      d.classification = acc >= 80 ? 'Strong' : acc >= 50 ? 'Average' : 'Weak';
      chapterList.push(d);
    }

    const unitsMap = new Map();
    for (const item of chapterList) {
      const unit = item.unit_category;
      if (!unitsMap.has(unit)) {
        unitsMap.set(unit, {
          unit_name: unit,
          total_questions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          marks: 0.0,
        });
      }
      const u = unitsMap.get(unit);
      u.total_questions += item.total_questions;
      u.attempted += item.attempted;
      u.correct += item.correct;
      u.incorrect += item.incorrect;
      u.marks += item.marks;
    }

    const unitList = [];
    for (const ud of unitsMap.values()) {
      ud.accuracy = ud.attempted > 0 ? round1((ud.correct / ud.attempted) * 100) : 0.0;
      unitList.push(ud);
    }

    chapterList.sort((a, b) => a.accuracy - b.accuracy);
    unitList.sort((a, b) => a.accuracy - b.accuracy);

    return res.json({
      chapters: chapterList,
      units: unitList,
      subject: subject || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
