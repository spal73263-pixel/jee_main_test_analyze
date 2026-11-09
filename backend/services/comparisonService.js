const mongoose = require('mongoose');
const { Test, SubjectResult } = require('../models');
const { buildTestDetail } = require('./performanceAnalyzer');
const { round2 } = require('./marksCalculator');

async function compareTestsService(testIds, userId) {
  if (!Array.isArray(testIds) || testIds.length < 2) {
    throw new Error('At least two test IDs are required for comparison.');
  }

  const validIds = testIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length < 2) {
    throw new Error('Could not find the specified tests in database.');
  }

  const query = { _id: { $in: validIds } };
  if (userId) query.user_id = userId;

  const tests = await Test.find(query).sort({ test_date: 1, created_at: 1 });
  if (tests.length < 2) {
    throw new Error('Could not find the specified tests in database.');
  }

  const subResultsList = await SubjectResult.find({
    test_id: { $in: tests.map((t) => t._id) },
  });

  const subByTest = new Map();
  for (const sr of subResultsList) {
    const tid = String(sr.test_id);
    if (!subByTest.has(tid)) {
      subByTest.set(tid, { Physics: 0.0, Chemistry: 0.0, Mathematics: 0.0 });
    }
    subByTest.get(tid)[sr.subject] = Number(sr.total_marks || 0);
  }

  const getSubjectMarks = (t) =>
    subByTest.get(String(t._id)) || { Physics: 0.0, Chemistry: 0.0, Mathematics: 0.0 };

  const firstTest = tests[0];
  const lastTest = tests[tests.length - 1];

  const firstSub = getSubjectMarks(firstTest);
  const lastSub = getSubjectMarks(lastTest);

  const subDeltas = {};
  for (const sub of ['Physics', 'Chemistry', 'Mathematics']) {
    subDeltas[sub] = round2((lastSub[sub] || 0.0) - (firstSub[sub] || 0.0));
  }

  let primaryContributor = 'Physics';
  let maxDelta = -Infinity;
  for (const [sub, dVal] of Object.entries(subDeltas)) {
    if (dVal > maxDelta) {
      maxDelta = dVal;
      primaryContributor = sub;
    }
  }

  const deltas = {
    total_marks: round2(Number(lastTest.marks_obtained || 0) - Number(firstTest.marks_obtained || 0)),
    overall_accuracy: round2(Number(lastTest.overall_accuracy || 0) - Number(firstTest.overall_accuracy || 0)),
    attempt_rate: round2(Number(lastTest.attempt_rate || 0) - Number(firstTest.attempt_rate || 0)),
    subject_deltas: subDeltas,
    first_test_name: firstTest.test_name,
    last_test_name: lastTest.test_name,
  };

  const metricsComparison = tests.map((t) => {
    const subDict = getSubjectMarks(t);
    return {
      test_id: String(t._id),
      test_name: t.test_name,
      test_date: t.test_date,
      total_marks: t.marks_obtained,
      accuracy: t.overall_accuracy,
      attempt_rate: t.attempt_rate,
      physics_marks: subDict.Physics || 0.0,
      chemistry_marks: subDict.Chemistry || 0.0,
      maths_marks: subDict.Mathematics || 0.0,
      percentile: t.official_percentile,
    };
  });

  const testDetails = await Promise.all(tests.map((t) => buildTestDetail(t)));

  return {
    tests: testDetails,
    deltas,
    primary_contributor: primaryContributor,
    metrics_comparison: metricsComparison,
  };
}

module.exports = { compareTestsService };
