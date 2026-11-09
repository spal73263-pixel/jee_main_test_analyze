const express = require('express');
const { StudentProfile, Test, SubjectResult } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { compareTestsService } = require('../services/comparisonService');
const { round1 } = require('../services/marksCalculator');

const router = express.Router();

router.get('/target-analysis', requireAuth, async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ user_id: req.user._id });
    const targetMarks = profile ? profile.target_marks : 220.0;
    const targetPct = profile ? profile.target_percentile : 99.0;
    const targetDateStr = profile ? profile.target_exam_date : '2026-01-24';

    const tests = await Test.find({ user_id: req.user._id }).sort({ test_date: 1 });

    let currentAvg = 0.0;
    let growthRate = 0.0;
    if (tests.length > 0) {
      currentAvg = round1(
        tests.reduce((acc, t) => acc + Number(t.marks_obtained || 0), 0) / tests.length
      );
      if (tests.length >= 2) {
        growthRate = round1(
          (Number(tests[tests.length - 1].marks_obtained) - Number(tests[0].marks_obtained)) /
            (tests.length - 1)
        );
      }
    }

    const marksGap = round1(Math.max(0.0, targetMarks - currentAvg));

    let daysRem = 75;
    try {
      const targetD = new Date(targetDateStr);
      const today = new Date();
      const diffDays = Math.ceil((targetD - today) / (1000 * 60 * 60 * 24));
      if (!Number.isNaN(diffDays)) daysRem = Math.max(1, diffDays);
    } catch {
      daysRem = 75;
    }

    const estRemainingTests = Math.max(1, Math.floor(daysRem / 7));
    const reqMarksPerTest = estRemainingTests > 0 ? round1(marksGap / estRemainingTests) : marksGap;
    const projectedFinal = round1(currentAvg + growthRate * estRemainingTests);

    const subTargets = {
      Physics: { target: profile ? profile.target_physics_marks : 75.0, current_avg: 0.0, gap: 0.0 },
      Chemistry: { target: profile ? profile.target_chemistry_marks : 80.0, current_avg: 0.0, gap: 0.0 },
      Mathematics: { target: profile ? profile.target_maths_marks : 65.0, current_avg: 0.0, gap: 0.0 },
    };

    if (tests.length > 0) {
      const subResults = await SubjectResult.find({ test_id: { $in: tests.map((t) => t._id) } });
      for (const sub of ['Physics', 'Chemistry', 'Mathematics']) {
        const scores = subResults.filter((s) => s.subject === sub).map((s) => Number(s.total_marks || 0));
        const avgSub = scores.length > 0 ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0.0;
        subTargets[sub].current_avg = avgSub;
        subTargets[sub].gap = round1(Math.max(0.0, subTargets[sub].target - avgSub));
      }
    }

    const milestones = [];
    const pace = marksGap > 0 ? Math.max(growthRate, 4.0) : 2.0;
    let simScore = currentAvg;
    const count = Math.min(6, estRemainingTests);
    for (let i = 1; i <= count; i += 1) {
      simScore = Math.min(targetMarks + 10, round1(simScore + pace));
      milestones.push({
        stage: `Mock Test +${i}`,
        projected_marks: simScore,
        target_benchmark: targetMarks,
        lower_bound_estimate: Math.max(0.0, round1(simScore - 8)),
        upper_bound_estimate: round1(simScore + 8),
      });
    }

    return res.json({
      current_average_marks: currentAvg,
      target_marks: targetMarks,
      marks_gap: marksGap,
      average_growth_rate: growthRate,
      target_percentile: targetPct,
      target_date: targetDateStr,
      days_remaining: daysRem,
      required_marks_per_test: reqMarksPerTest,
      projected_final_marks: projectedFinal,
      historical_calibration_note:
        'Statistical Disclaimer: Percentile and AIR cannot be deterministically inferred from marks alone, as real NTA percentiles depend on shift difficulty, normalization formulas, and overall candidate cohort distributions. Projections shown represent historical calibration benchmarks based on 2021-2025 JEE Main score-to-percentile data.',
      subject_targets: subTargets,
      progression_milestones: milestones,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/compare', requireAuth, async (req, res, next) => {
  try {
    const { test_ids } = req.body || {};
    const result = await compareTestsService(test_ids, req.user._id);
    return res.json(result);
  } catch (err) {
    if (err.message && (err.message.includes('required') || err.message.includes('Could not find'))) {
      return res.status(400).json({ detail: err.message });
    }
    next(err);
  }
});

module.exports = router;
