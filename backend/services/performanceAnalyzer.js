const {
  Test,
  SubjectResult,
  QuestionResult,
  ChapterPerformance,
  AIRecommendation,
} = require('../models');
const { JEE_CHAPTER_UNIT_MAP, classifyAccuracy, round1, round2 } = require('./marksCalculator');

async function computeAndSaveTestAnalysis(testDoc) {
  const testId = testDoc._id;
  const userId = testDoc.user_id;
  const totalQ = testDoc.total_questions || 75;

  const [subjectResults, questions] = await Promise.all([
    SubjectResult.find({ test_id: testId }),
    QuestionResult.find({ test_id: testId }).sort({ question_number: 1 }),
  ]);

  const totalAttempted = subjectResults.reduce((acc, s) => acc + Number(s.attempted || 0), 0);
  const totalCorrect = subjectResults.reduce((acc, s) => acc + Number(s.correct || 0), 0);
  const totalMarks = subjectResults.length > 0
    ? subjectResults.reduce((acc, s) => acc + Number(s.total_marks || 0), 0)
    : Number(testDoc.marks_obtained || 0);

  testDoc.marks_obtained = totalMarks;
  if (totalAttempted > 0) {
    testDoc.attempt_rate = totalQ > 0 ? round2((totalAttempted / totalQ) * 100) : 0.0;
    testDoc.overall_accuracy = round2((totalCorrect / totalAttempted) * 100);
  } else {
    testDoc.overall_accuracy = testDoc.max_marks > 0 ? round2((totalMarks / testDoc.max_marks) * 100) : 0.0;
    testDoc.attempt_rate = totalMarks > 0 ? 100.0 : 0.0;
  }
  await testDoc.save();

  await ChapterPerformance.deleteMany({ test_id: testId });

  const chaptersToInsert = [];
  if (questions.length > 0) {
    const chapterMap = new Map();
    for (const q of questions) {
      const chapName = q.chapter || 'General';
      const key = `${q.subject}::${chapName}`;
      if (!chapterMap.has(key)) {
        const unitInfo = JEE_CHAPTER_UNIT_MAP[chapName];
        chapterMap.set(key, {
          test_id: testId,
          user_id: userId,
          subject: q.subject,
          chapter_name: chapName,
          unit_category: unitInfo ? unitInfo[1] : 'Core Syllabus',
          total_questions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 0,
          marks: 0.0,
        });
      }
      const entry = chapterMap.get(key);
      entry.total_questions += 1;
      if (q.status === 'Correct') {
        entry.attempted += 1;
        entry.correct += 1;
        entry.marks += q.marks !== 0 ? q.marks : 4.0;
      } else if (q.status === 'Incorrect') {
        entry.attempted += 1;
        entry.incorrect += 1;
        entry.marks += q.marks !== 0 ? q.marks : -1.0;
      } else {
        entry.unattempted += 1;
      }
    }

    for (const data of chapterMap.values()) {
      const acc = data.attempted > 0 ? round2((data.correct / data.attempted) * 100) : 0.0;
      const classification = data.attempted > 0 ? classifyAccuracy(acc) : 'Unattempted';
      chaptersToInsert.push({ ...data, accuracy: acc, classification });
    }
  } else if (subjectResults.length > 0) {
    for (const s of subjectResults) {
      const acc = s.accuracy > 0
        ? s.accuracy
        : s.percentage > 0
        ? s.percentage
        : round2((Number(s.total_marks || 0) / 100.0) * 100);
      const totQ = s.total_questions || 25;
      chaptersToInsert.push({
        test_id: testId,
        user_id: userId,
        subject: s.subject,
        chapter_name: `${s.subject} Overall Syllabus`,
        unit_category: `${s.subject} Core`,
        total_questions: totQ,
        attempted: s.attempted || totQ,
        correct: s.correct || Math.floor((acc / 100.0) * totQ),
        incorrect: s.incorrect || 0,
        unattempted: s.unattempted || 0,
        marks: s.total_marks,
        accuracy: acc,
        classification: classifyAccuracy(acc),
      });
    }
  }

  if (chaptersToInsert.length > 0) {
    await ChapterPerformance.insertMany(chaptersToInsert);
  }

  return testDoc;
}

async function getTimeManagementStats(testDoc) {
  const testId = testDoc._id;
  const [questions, subjectResults] = await Promise.all([
    QuestionResult.find({ test_id: testId }).sort({ question_number: 1 }),
    SubjectResult.find({ test_id: testId }),
  ]);

  const subjectTimes = {};
  for (const s of subjectResults) {
    subjectTimes[s.subject] = s.time_spent_seconds || 0;
  }

  const hasQuestionTimes = questions.some((q) => (q.time_spent_seconds || 0) > 0);

  let timeCorrect = 0;
  let timeIncorrect = 0;
  let timeUnattempted = 0;
  const excessiveTimeQs = [];
  const attemptedQs = [];

  for (const q of questions) {
    const t = q.time_spent_seconds || 0;
    if (q.status === 'Correct') {
      timeCorrect += t;
      attemptedQs.push(q);
    } else if (q.status === 'Incorrect') {
      timeIncorrect += t;
      attemptedQs.push(q);
    } else {
      timeUnattempted += t;
    }

    if (t > 210) {
      excessiveTimeQs.push({
        question_number: q.question_number,
        subject: q.subject,
        chapter: q.chapter,
        status: q.status,
        time_spent: t,
        difficulty: q.difficulty,
      });
    }
  }

  const avgTimePerQ =
    attemptedQs.length > 0
      ? round1(attemptedQs.reduce((acc, q) => acc + (q.time_spent_seconds || 0), 0) / attemptedQs.length)
      : 0.0;

  return {
    test_name: testDoc.test_name,
    total_duration_minutes: testDoc.duration_minutes,
    subject_times: subjectTimes,
    has_question_level_timing: hasQuestionTimes,
    avg_time_per_attempted_seconds: avgTimePerQ,
    time_spent_correct_seconds: timeCorrect,
    time_spent_incorrect_seconds: timeIncorrect,
    time_spent_unattempted_seconds: timeUnattempted,
    excessive_time_questions_count: excessiveTimeQs.length,
    excessive_time_questions: excessiveTimeQs.slice(0, 10),
  };
}

async function buildTestDetail(testDoc) {
  const testId = testDoc._id;
  const [subjectResults, questionResults, chapterPerformances, aiRec] = await Promise.all([
    SubjectResult.find({ test_id: testId }),
    QuestionResult.find({ test_id: testId }).sort({ question_number: 1 }),
    ChapterPerformance.find({ test_id: testId }),
    AIRecommendation.findOne({ test_id: testId }),
  ]);

  const base = testDoc.toObject ? testDoc.toObject() : { ...testDoc };
  const subjectMarks = {};
  for (const s of subjectResults) {
    subjectMarks[s.subject] = s.total_marks;
  }

  return {
    ...base,
    subject_marks: subjectMarks,
    subject_results: subjectResults.map((s) => s.toObject()),
    question_results: questionResults.map((q) => q.toObject()),
    chapter_performances: chapterPerformances.map((c) => c.toObject()),
    ai_recommendation: aiRec ? aiRec.toObject() : null,
  };
}

module.exports = {
  computeAndSaveTestAnalysis,
  getTimeManagementStats,
  buildTestDetail,
};
