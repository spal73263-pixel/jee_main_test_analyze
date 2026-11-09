const {
  Test,
  SubjectResult,
  ChapterPerformance,
  AIRecommendation,
} = require('../models');

async function generateAIRecommendationReport(testId) {
  const test = await Test.findById(testId);
  if (!test) throw new Error('Test not found');

  const [subjects, chapters, prevTests] = await Promise.all([
    SubjectResult.find({ test_id: test._id }),
    ChapterPerformance.find({ test_id: test._id }),
    Test.find({
      user_id: test.user_id,
      _id: { $ne: test._id },
      created_at: { $lt: test.created_at },
    }).sort({ created_at: -1 }),
  ]);

  const weakChapters = chapters.filter((c) => c.classification === 'Weak').map((c) => c.chapter_name);
  const strongChapters = chapters.filter((c) => c.classification === 'Strong').map((c) => c.chapter_name);

  const subMetrics = {};
  for (const s of subjects) {
    subMetrics[s.subject] = {
      marks: Number(s.total_marks || 0),
      accuracy: Number(s.accuracy || 0),
      neg_marks: Number(s.negative_marks || 0),
    };
  }

  const totalNegMarks = subjects.reduce((acc, s) => acc + Number(s.negative_marks || 0), 0);
  let worstNegSubject = 'None';
  let maxNeg = -1;
  for (const [subName, metrics] of Object.entries(subMetrics)) {
    if (metrics.neg_marks > maxNeg) {
      maxNeg = metrics.neg_marks;
      worstNegSubject = subName;
    }
  }

  let compText = 'This is your baseline diagnostic test. Future tests will track your trajectory.';
  if (prevTests.length > 0) {
    const lastTest = prevTests[0];
    const diffMarks = Number(test.marks_obtained || 0) - Number(lastTest.marks_obtained || 0);
    const diffAcc = Number(test.overall_accuracy || 0) - Number(lastTest.overall_accuracy || 0);
    const trend = diffMarks >= 0 ? 'improved' : 'declined';
    const signMarks = diffMarks >= 0 ? '+' : '-';
    const signAcc = diffAcc >= 0 ? '+' : '';
    compText =
      `Compared to '${lastTest.test_name}' (${Number(lastTest.marks_obtained).toFixed(1)} marks), your score has ${trend} ` +
      `by ${signMarks}${Math.abs(diffMarks).toFixed(1)} marks (Overall Accuracy: ${signAcc}${diffAcc.toFixed(1)}%). ` +
      `${diffMarks >= 0 ? 'Positive momentum observed.' : 'Consolidation required on fundamentals.'}`;
  }

  const summary =
    `You scored ${Number(test.marks_obtained).toFixed(1)} / ${Number(test.max_marks).toFixed(1)} marks with an overall accuracy of ${Number(test.overall_accuracy).toFixed(1)}% ` +
    `and an attempt rate of ${Number(test.attempt_rate).toFixed(1)}%. ` +
    `${test.overall_accuracy >= 75 ? 'Solid accuracy maintained with room to increase attempt rate.' : 'Accuracy needs strengthening through targeted revision to prevent negative marking penalties.'}`;

  const subjectAnalysis = subjects
    .map(
      (s) =>
        `- ${s.subject}: ${Number(s.total_marks).toFixed(1)} marks, ${Number(s.accuracy).toFixed(1)}% accuracy, ${s.correct} correct, ${s.incorrect} incorrect (-${Number(s.negative_marks).toFixed(1)} lost in penalty).`
    )
    .join('\n');

  const strongStr =
    strongChapters.length > 0
      ? strongChapters.slice(0, 5).join(', ')
      : 'Solid attempt consistency in core formula questions';

  const weakStr =
    weakChapters.length > 0
      ? weakChapters.slice(0, 5).join(', ')
      : 'No critically weak topics detected; maintain consistency';

  const repeated =
    `Concentrated errors occurred in ${weakChapters.length > 0 ? weakChapters.slice(0, 3).join(', ') : 'multi-step calculation questions'}. ` +
    `Verify algebraic signs and dimensional consistency before locking answers.`;

  const worstNegVal = subMetrics[worstNegSubject]?.neg_marks || 0;
  const negAnalysis =
    `You conceded -${totalNegMarks.toFixed(1)} marks from incorrect attempts. ` +
    `${worstNegSubject} contributed the highest penalty (-${worstNegVal.toFixed(1)} marks). ` +
    `Eliminating blind guesses in ${worstNegSubject} will immediately recover up to +${totalNegMarks.toFixed(1)} marks.`;

  const timeAnalysis =
    `Total duration logged was ${test.duration_minutes} minutes. ` +
    `Ensure no more than 2.0 to 2.5 minutes are spent per standard MCQ in Physics and Chemistry. ` +
    `Reserve 65-75 minutes exclusively for Mathematics multi-step problem solving.`;

  let topFocusSubject = 'General';
  let minAcc = Infinity;
  for (const [subName, metrics] of Object.entries(subMetrics)) {
    if (metrics.accuracy < minAcc) {
      minAcc = metrics.accuracy;
      topFocusSubject = subName;
    }
  }

  const subjectNames = subjects.map((s) => s.subject);
  const focusSubjectsLabel = subjectNames.length > 0 ? subjectNames.slice(0, 3).join(', ') : topFocusSubject;

  const improvementAreas =
    `1. Accuracy Lockdown in ${topFocusSubject}: Prioritize high-confidence attempts and eliminate avoidable errors.\n` +
    `2. Targeted Revision in: ${weakChapters.length > 0 ? weakChapters.slice(0, 2).join(', ') : `${topFocusSubject} core chapters`}.\n` +
    `3. Exam Temperament: Complete high-weightage straightforward questions first to build momentum.`;

  const revisionTopics =
    weakChapters.length > 0
      ? weakChapters.slice(0, 4).join(', ')
      : focusSubjectsLabel;

  const recQuestions =
    `Practice past paper questions in: ${weakChapters.length > 0 ? weakChapters.slice(0, 3).join(', ') : focusSubjectsLabel} ` +
    `with strict timed review.`;

  const sevenDayPlan =
    `Focus Day 1-2: Revise ${weakChapters[0] || topFocusSubject} concepts + timed problems\n` +
    `Focus Day 3-4: Error notebook analysis across ${subjectNames[1] || topFocusSubject}\n` +
    `Focus Day 5-6: Mixed chapter practice set under exam timer\n` +
    `Focus Day 7: Full review of mistakes and formula summary notes`;

  const updated = await AIRecommendation.findOneAndUpdate(
    { test_id: test._id },
    {
      test_id: test._id,
      user_id: test.user_id,
      overall_summary: summary,
      subject_wise_analysis: subjectAnalysis,
      strong_topics: strongStr,
      weak_topics: weakStr,
      repeated_mistakes: repeated,
      negative_marking_analysis: negAnalysis,
      time_management_analysis: timeAnalysis,
      comparison_with_previous: compText,
      improvement_areas: improvementAreas,
      revision_topics: revisionTopics,
      recommended_questions: recQuestions,
      seven_day_plan: sevenDayPlan,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return updated;
}

module.exports = { generateAIRecommendationReport };
