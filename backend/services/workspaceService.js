const crypto = require('crypto');
const {
  JEE_CHAPTER_UNIT_MAP,
  round1,
  round2,
  classifyAccuracy,
} = require('./marksCalculator');

const HSC_SUBJECT_LIST = ['Physics', 'Maths', 'English', 'Chemistry', 'CS'];

function createHttpError(status, detail) {
  const err = new Error(detail);
  err.status = status;
  return err;
}

function genId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function createDefaultProfile(userId) {
  return {
    id: userId === 'user_om_pal' ? 'profile_om_pal' : genId('prof'),
    user_id: userId,
    target_year: 2026,
    target_attempt: 'January & April',
    target_percentile: 99.0,
    target_marks: 220.0,
    target_physics_marks: 75.0,
    target_chemistry_marks: 80.0,
    target_maths_marks: 65.0,
    daily_study_hours: 6.5,
    target_exam_date: '2026-01-24',
  };
}

function createEmptyWorkspace(userId, profileOverrides = {}) {
  return {
    profile: {
      ...createDefaultProfile(userId),
      ...profileOverrides,
      user_id: userId,
    },
    tests: [],
    subjectResults: [],
    questionResults: [],
    chapterPerformances: [],
    aiRecommendations: [],
    weakReminders: [],
    studyPlans: [],
    studyTasks: [],
    scheduledTests: [],
    hscRevisions: [],
  };
}

function normalizeWorkspace(userId, raw) {
  const base = createEmptyWorkspace(userId);
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  return {
    profile:
      raw.profile && typeof raw.profile === 'object'
        ? { ...base.profile, ...raw.profile, user_id: userId }
        : base.profile,
    tests: Array.isArray(raw.tests) ? raw.tests : [],
    subjectResults: Array.isArray(raw.subjectResults) ? raw.subjectResults : [],
    questionResults: Array.isArray(raw.questionResults) ? raw.questionResults : [],
    chapterPerformances: Array.isArray(raw.chapterPerformances) ? raw.chapterPerformances : [],
    aiRecommendations: Array.isArray(raw.aiRecommendations) ? raw.aiRecommendations : [],
    weakReminders: Array.isArray(raw.weakReminders) ? raw.weakReminders : [],
    studyPlans: Array.isArray(raw.studyPlans) ? raw.studyPlans : [],
    studyTasks: Array.isArray(raw.studyTasks) ? raw.studyTasks : [],
    scheduledTests: Array.isArray(raw.scheduledTests) ? raw.scheduledTests : [],
    hscRevisions: Array.isArray(raw.hscRevisions) ? raw.hscRevisions : [],
  };
}

function formatUserOut(account, workspace) {
  const ws = normalizeWorkspace(account.id, workspace);
  return {
    id: account.id,
    email: account.email,
    full_name: account.full_name,
    created_at: account.created_at,
    profile: { ...ws.profile },
  };
}

function buildTestDetail(ws, testObj) {
  const subjectResults = ws.subjectResults.filter((s) => s.test_id === testObj.id);
  const questionResults = ws.questionResults
    .filter((q) => q.test_id === testObj.id)
    .sort((a, b) => a.question_number - b.question_number);
  const chapterPerformances = ws.chapterPerformances.filter((c) => c.test_id === testObj.id);
  const aiRec = ws.aiRecommendations.find((a) => a.test_id === testObj.id) || null;

  const subjectMarks = {};
  for (const s of subjectResults) {
    subjectMarks[s.subject] = s.total_marks;
  }

  return {
    ...testObj,
    subject_marks: subjectMarks,
    subject_results: subjectResults,
    question_results: questionResults,
    chapter_performances: chapterPerformances,
    ai_recommendation: aiRec,
  };
}

function generateAIReport(ws, testObj, subjects, chapters) {
  const prevTests = ws.tests
    .filter((t) => t.id !== testObj.id && t.created_at < testObj.created_at)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

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
    const diffMarks = Number(testObj.marks_obtained || 0) - Number(lastTest.marks_obtained || 0);
    const diffAcc = Number(testObj.overall_accuracy || 0) - Number(lastTest.overall_accuracy || 0);
    const trend = diffMarks >= 0 ? 'improved' : 'declined';
    const signMarks = diffMarks >= 0 ? '+' : '-';
    const signAcc = diffAcc >= 0 ? '+' : '';
    compText =
      `Compared to '${lastTest.test_name}' (${Number(lastTest.marks_obtained).toFixed(1)} marks), your score has ${trend} ` +
      `by ${signMarks}${Math.abs(diffMarks).toFixed(1)} marks (Overall Accuracy: ${signAcc}${diffAcc.toFixed(1)}%). ` +
      `${diffMarks >= 0 ? 'Positive momentum observed.' : 'Consolidation required on fundamentals.'}`;
  }

  const summary =
    `You scored ${Number(testObj.marks_obtained).toFixed(1)} / ${Number(testObj.max_marks).toFixed(1)} marks with an overall accuracy of ${Number(testObj.overall_accuracy).toFixed(1)}% ` +
    `and an attempt rate of ${Number(testObj.attempt_rate).toFixed(1)}%. ` +
    `${testObj.overall_accuracy >= 75 ? 'Solid accuracy maintained with room to increase attempt rate.' : 'Accuracy needs strengthening through targeted revision to prevent negative marking penalties.'}`;

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
    `Total duration logged was ${testObj.duration_minutes} minutes. ` +
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

  const revisionTopics = weakChapters.length > 0 ? weakChapters.slice(0, 4).join(', ') : focusSubjectsLabel;

  const recQuestions =
    `Practice past paper questions in: ${weakChapters.length > 0 ? weakChapters.slice(0, 3).join(', ') : focusSubjectsLabel} ` +
    `with strict timed review.`;

  const sevenDayPlan =
    `Focus Day 1-2: Revise ${weakChapters[0] || topFocusSubject} concepts + timed problems\n` +
    `Focus Day 3-4: Error notebook analysis across ${subjectNames[1] || topFocusSubject}\n` +
    `Focus Day 5-6: Mixed chapter practice set under exam timer\n` +
    `Focus Day 7: Full review of mistakes and formula summary notes`;

  ws.aiRecommendations = ws.aiRecommendations.filter((r) => r.test_id !== testObj.id);
  const aiObj = {
    id: genId('ai'),
    test_id: testObj.id,
    user_id: testObj.user_id,
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
    generated_at: new Date().toISOString(),
  };
  ws.aiRecommendations.push(aiObj);
  return aiObj;
}

// ---------- Tests & Uploads ----------

function confirmTest(userId, rawWs, testIn = {}) {
  if (!testIn.test_name || !testIn.test_date) {
    throw createHttpError(400, 'test_name and test_date are required.');
  }

  const ws = normalizeWorkspace(userId, rawWs);
  const subjects = Array.isArray(testIn.subjects) ? testIn.subjects : [];
  const questions = Array.isArray(testIn.questions) ? testIn.questions : [];

  const totalQ =
    Number(testIn.total_questions) ||
    subjects.reduce((acc, s) => acc + Number(s.total_questions || 0), 0) ||
    75;
  const totalAtt = subjects.reduce((acc, s) => acc + Number(s.attempted || 0), 0);
  const totalCorr = subjects.reduce((acc, s) => acc + Number(s.correct || 0), 0);
  const totalMarks =
    subjects.length > 0
      ? subjects.reduce((acc, s) => acc + Number(s.total_marks || 0), 0)
      : Number(testIn.marks_obtained || 0);

  const maxMarks = Number(testIn.max_marks || 300.0);
  let overallAcc = 0.0;
  let attemptRate = 0.0;

  if (totalAtt > 0) {
    overallAcc = round2((totalCorr / totalAtt) * 100);
    attemptRate = totalQ > 0 ? round2((totalAtt / totalQ) * 100) : 0.0;
  } else {
    overallAcc = maxMarks > 0 ? round2((totalMarks / maxMarks) * 100) : 0.0;
    attemptRate = totalMarks > 0 ? 100.0 : 0.0;
  }

  const testObj = {
    id: genId('tst'),
    user_id: userId,
    test_name: testIn.test_name,
    test_id_code: testIn.test_id_code || null,
    test_date: testIn.test_date,
    test_type: testIn.test_type || 'Mock Test',
    shift: testIn.shift || 'Shift 1',
    duration_minutes: Number(testIn.duration_minutes || 180),
    total_questions: totalQ,
    max_marks: maxMarks,
    marks_obtained: totalMarks,
    official_percentile:
      testIn.official_percentile !== null &&
      testIn.official_percentile !== undefined &&
      testIn.official_percentile !== ''
        ? Number(testIn.official_percentile)
        : null,
    official_rank:
      testIn.official_rank !== null &&
      testIn.official_rank !== undefined &&
      testIn.official_rank !== ''
        ? Number(testIn.official_rank)
        : null,
    overall_accuracy: overallAcc,
    attempt_rate: attemptRate,
    notes: testIn.notes || null,
    created_at: new Date().toISOString(),
  };
  ws.tests.push(testObj);

  const savedSubjects = subjects.map((sub) => ({
    id: genId('sub'),
    test_id: testObj.id,
    user_id: userId,
    subject: sub.subject,
    total_questions: Number(sub.total_questions ?? 25),
    attempted: Number(sub.attempted ?? 0),
    correct: Number(sub.correct ?? 0),
    incorrect: Number(sub.incorrect ?? 0),
    unattempted: Number(sub.unattempted ?? 0),
    positive_marks: Number(sub.positive_marks ?? 0),
    negative_marks: Number(sub.negative_marks ?? 0),
    total_marks: Number(sub.total_marks ?? 0),
    accuracy: Number(sub.accuracy ?? 0),
    percentage: Number(sub.percentage ?? 0),
    time_spent_seconds: Number(sub.time_spent_seconds ?? 0),
  }));
  ws.subjectResults.push(...savedSubjects);

  const savedQuestions = questions.map((q, idx) => ({
    id: genId('q'),
    test_id: testObj.id,
    user_id: userId,
    question_number: Number(q.question_number ?? idx + 1),
    subject: q.subject,
    chapter: q.chapter || 'General',
    topic: q.topic || null,
    question_type: q.question_type || 'MCQ',
    difficulty: q.difficulty || 'Medium',
    selected_answer: q.selected_answer || null,
    correct_answer: q.correct_answer || null,
    status: q.status || 'Unattempted',
    marks: Number(q.marks ?? 0),
    time_spent_seconds: Number(q.time_spent_seconds ?? 0),
  }));
  ws.questionResults.push(...savedQuestions);

  const chaptersToInsert = [];
  if (savedQuestions.length > 0) {
    const chapterMap = new Map();
    for (const q of savedQuestions) {
      const chapName = q.chapter || 'General';
      const key = `${q.subject}::${chapName}`;
      if (!chapterMap.has(key)) {
        const unitInfo = JEE_CHAPTER_UNIT_MAP[chapName];
        chapterMap.set(key, {
          id: genId('chp'),
          test_id: testObj.id,
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
      const stLower = String(q.status || '').toLowerCase();
      if (stLower === 'correct') {
        entry.attempted += 1;
        entry.correct += 1;
        entry.marks += q.marks !== 0 ? q.marks : 4.0;
      } else if (stLower === 'incorrect') {
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
  } else if (savedSubjects.length > 0) {
    for (const s of savedSubjects) {
      const acc =
        s.accuracy > 0
          ? s.accuracy
          : s.percentage > 0
          ? s.percentage
          : round2((Number(s.total_marks || 0) / 100.0) * 100);
      const totQ = s.total_questions || 25;
      chaptersToInsert.push({
        id: genId('chp'),
        test_id: testObj.id,
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
  ws.chapterPerformances.push(...chaptersToInsert);

  generateAIReport(ws, testObj, savedSubjects, chaptersToInsert);

  return {
    workspace: ws,
    result: buildTestDetail(ws, testObj),
  };
}

function getTests(userId, rawWs, params = {}) {
  const ws = normalizeWorkspace(userId, rawWs);
  const { search, test_type } = params || {};

  let tests = [...ws.tests];

  if (search && String(search).trim() !== '') {
    const needle = String(search).trim().toLowerCase();
    tests = tests.filter(
      (t) =>
        String(t.test_name || '').toLowerCase().includes(needle) ||
        String(t.test_id_code || '').toLowerCase().includes(needle)
    );
  }
  if (test_type && test_type !== 'All') {
    tests = tests.filter((t) => t.test_type === String(test_type));
  }

  tests.sort((a, b) => {
    if (a.test_date !== b.test_date) return a.test_date < b.test_date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });

  return tests.map((t) => {
    const subs = ws.subjectResults.filter((s) => s.test_id === t.id);
    const subject_marks = {};
    for (const s of subs) {
      subject_marks[s.subject] = s.total_marks;
    }
    return {
      ...t,
      subject_marks,
    };
  });
}

function getTestDetail(userId, rawWs, testId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const test = ws.tests.find((t) => t.id === testId);
  if (!test) {
    throw createHttpError(404, 'Test not found.');
  }
  return buildTestDetail(ws, test);
}

function deleteTest(userId, rawWs, testId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const idx = ws.tests.findIndex((t) => t.id === testId);
  if (idx === -1) {
    throw createHttpError(404, 'Test not found.');
  }
  ws.tests.splice(idx, 1);
  ws.subjectResults = ws.subjectResults.filter((s) => s.test_id !== testId);
  ws.questionResults = ws.questionResults.filter((q) => q.test_id !== testId);
  ws.chapterPerformances = ws.chapterPerformances.filter((c) => c.test_id !== testId);
  ws.aiRecommendations = ws.aiRecommendations.filter((a) => a.test_id !== testId);
  return {
    workspace: ws,
    result: { message: 'Test successfully deleted.' },
  };
}

function getTimeAnalytics(userId, rawWs, testId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const testDoc = ws.tests.find((t) => t.id === testId);
  if (!testDoc) {
    throw createHttpError(404, 'Test not found.');
  }

  const questions = ws.questionResults
    .filter((q) => q.test_id === testId)
    .sort((a, b) => a.question_number - b.question_number);
  const subjectResults = ws.subjectResults.filter((s) => s.test_id === testId);

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

// ---------- Dashboard & Weak Topics ----------

function getDashboardOverview(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  const tests = [...ws.tests].sort((a, b) => {
    if (a.test_date !== b.test_date) return a.test_date > b.test_date ? 1 : -1;
    return a.created_at > b.created_at ? 1 : -1;
  });

  if (tests.length === 0) {
    return {
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
    };
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

  const marksHistory = [];
  const accuracyHistory = [];
  const subjectTotals = {
    Physics: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
    Chemistry: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
    Mathematics: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
  };
  const statusBreakdown = { Correct: 0, Incorrect: 0, Unattempted: 0 };

  for (const t of tests) {
    const subs = ws.subjectResults.filter((s) => s.test_id === t.id);
    const subMap = {};
    for (const s of subs) {
      subMap[s.subject] = Number(s.total_marks || 0);
      if (!subjectTotals[s.subject]) {
        subjectTotals[s.subject] = { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 };
      }
      subjectTotals[s.subject].marks += Number(s.total_marks || 0);
      subjectTotals[s.subject].accuracy_sum += Number(s.accuracy || 0);
      subjectTotals[s.subject].neg_marks += Number(s.negative_marks || 0);
      subjectTotals[s.subject].count += 1;

      statusBreakdown.Correct += Number(s.correct || 0);
      statusBreakdown.Incorrect += Number(s.incorrect || 0);
      statusBreakdown.Unattempted += Number(s.unattempted || 0);
    }

    marksHistory.push({
      test_id: t.id,
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

  const coreSubjects = new Set(['Physics', 'Chemistry', 'Mathematics']);
  const subjectComparison = Object.entries(subjectTotals)
    .filter(([sub, data]) => coreSubjects.has(sub) || data.count > 0)
    .map(([sub, data]) => {
      const cnt = data.count || 1;
      return {
        subject: sub,
        average_marks: round1(data.marks / cnt),
        average_accuracy: round1(data.accuracy_sum / cnt),
        total_negative_marks: round1(data.neg_marks),
      };
    });

  const weakCount = ws.chapterPerformances.filter((c) => c.classification === 'Weak').length;
  const strongCount = ws.chapterPerformances.filter((c) => c.classification === 'Strong').length;

  return {
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
  };
}

function getWeakTopics(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  const chapters = ws.chapterPerformances;

  if (chapters.length === 0) {
    return {
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
    };
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

  return {
    strong_topics: strong,
    average_topics: average,
    weak_topics: weak,
    repeated_mistakes: repeatedMistakes,
    strongest_subject: strongestSub,
    weakest_subject: weakestSub,
    strongest_chapter: strongestChap,
    weakest_chapter: weakestChap,
    total_weak_chapters: weak.length,
  };
}

function getReminders(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  return [...ws.weakReminders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function addReminder(userId, rawWs, data = {}) {
  const { subject, chapter_name, marks_lost, notes, exam_type } = data;
  if (!subject || !chapter_name) {
    throw createHttpError(400, 'subject and chapter_name are required.');
  }
  const ws = normalizeWorkspace(userId, rawWs);
  const rem = {
    id: genId('rem'),
    user_id: userId,
    subject,
    chapter_name,
    marks_lost: Number(marks_lost || 0),
    notes: notes || null,
    exam_type: exam_type || 'JEE Main',
    is_resolved: false,
    created_at: new Date().toISOString(),
  };
  ws.weakReminders.push(rem);
  return { workspace: ws, result: rem };
}

function deleteReminder(userId, rawWs, reminderId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const idx = ws.weakReminders.findIndex((r) => r.id === reminderId);
  if (idx === -1) {
    throw createHttpError(404, 'Reminder not found.');
  }
  ws.weakReminders.splice(idx, 1);
  return { workspace: ws, result: { message: 'Reminder deleted successfully.' } };
}

function toggleReminder(userId, rawWs, reminderId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const rem = ws.weakReminders.find((r) => r.id === reminderId);
  if (!rem) {
    throw createHttpError(404, 'Reminder not found.');
  }
  rem.is_resolved = !rem.is_resolved;
  return { workspace: ws, result: rem };
}

// ---------- Subjects Breakdown ----------

function getSubjectBreakdown(userId, rawWs, params = {}) {
  const ws = normalizeWorkspace(userId, rawWs);
  const { subject, test_id } = params || {};

  let records = ws.chapterPerformances;
  if (test_id) records = records.filter((c) => c.test_id === String(test_id));
  if (subject) records = records.filter((c) => c.subject === String(subject));

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
    d.classification = classifyAccuracy(acc);
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

  return {
    chapters: chapterList,
    units: unitList,
    subject: subject || null,
  };
}

// ---------- Predictions & Comparisons ----------

function getTargetAnalysis(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  const profile = ws.profile;

  const targetMarks = profile.target_marks || 220.0;
  const targetPct = profile.target_percentile || 99.0;
  const targetDateStr = profile.target_exam_date || '2026-01-24';

  const tests = [...ws.tests].sort((a, b) => (a.test_date > b.test_date ? 1 : -1));

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
    Physics: { target: profile.target_physics_marks || 75.0, current_avg: 0.0, gap: 0.0 },
    Chemistry: { target: profile.target_chemistry_marks || 80.0, current_avg: 0.0, gap: 0.0 },
    Mathematics: { target: profile.target_maths_marks || 65.0, current_avg: 0.0, gap: 0.0 },
  };

  if (tests.length > 0) {
    const testIds = new Set(tests.map((t) => t.id));
    const subResults = ws.subjectResults.filter((s) => testIds.has(s.test_id));
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

  return {
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
  };
}

function compareTests(userId, rawWs, testIds) {
  if (!Array.isArray(testIds) || testIds.length < 2) {
    throw createHttpError(400, 'At least two test IDs are required for comparison.');
  }

  const ws = normalizeWorkspace(userId, rawWs);
  const idSet = new Set(testIds.map(String));

  const tests = ws.tests
    .filter((t) => idSet.has(t.id))
    .sort((a, b) => {
      if (a.test_date !== b.test_date) return a.test_date > b.test_date ? 1 : -1;
      return a.created_at > b.created_at ? 1 : -1;
    });

  if (tests.length < 2) {
    throw createHttpError(400, 'Could not find at least two matching tests for your account.');
  }

  const subByTest = new Map();
  for (const t of tests) {
    const map = { Physics: 0.0, Chemistry: 0.0, Mathematics: 0.0 };
    const subs = ws.subjectResults.filter((sr) => sr.test_id === t.id);
    for (const sr of subs) {
      map[sr.subject] = Number(sr.total_marks || 0);
    }
    subByTest.set(t.id, map);
  }

  const firstTest = tests[0];
  const lastTest = tests[tests.length - 1];
  const firstSub = subByTest.get(firstTest.id);
  const lastSub = subByTest.get(lastTest.id);

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
    const subDict = subByTest.get(t.id);
    return {
      test_id: t.id,
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

  const testDetails = tests.map((t) => buildTestDetail(ws, t));

  return {
    tests: testDetails,
    deltas,
    primary_contributor: primaryContributor,
    metrics_comparison: metricsComparison,
  };
}

// ---------- Study Planner & Scheduled Tests ----------

function createEmptyPlanInWs(ws, userId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const plan = {
    id: genId('pln'),
    user_id: userId,
    title: `Weekly Study Plan (Week of ${todayStr})`,
    week_start_date: todayStr,
    is_active: true,
    summary: 'Add your own subjects, chapters, and target study hours for each day of the week.',
    generated_date: new Date().toISOString(),
  };
  ws.studyPlans.push(plan);
  return { ...plan, tasks: [] };
}

function getStudyPlan(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  const activePlan = ws.studyPlans
    .filter((p) => p.is_active)
    .sort((a, b) => (a.generated_date < b.generated_date ? 1 : -1))[0];

  if (!activePlan) {
    const created = createEmptyPlanInWs(ws, userId);
    return { workspace: ws, result: created, mutated: true };
  }

  const tasks = ws.studyTasks.filter((t) => t.plan_id === activePlan.id);
  return {
    workspace: ws,
    result: { ...activePlan, tasks },
    mutated: false,
  };
}

function regenerateStudyPlan(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  const chapters = ws.chapterPerformances;

  if (chapters.length === 0) {
    throw createHttpError(
      400,
      'Please enter or upload at least one test first so weak chapters can be identified, or add study sessions manually.'
    );
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
    throw createHttpError(
      400,
      'All logged chapters currently have >= 75% accuracy. Add custom study sessions manually for targeted practice.'
    );
  }

  for (const p of ws.studyPlans) {
    p.is_active = false;
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayStr = new Date().toISOString().split('T')[0];

  const plan = {
    id: genId('pln'),
    user_id: userId,
    title: `7-Day Targeted Recovery Plan (Week of ${todayStr})`,
    week_start_date: todayStr,
    is_active: true,
    summary: 'Targeted revision schedule generated strictly from your logged test chapter accuracy.',
    generated_date: new Date().toISOString(),
  };
  ws.studyPlans.push(plan);

  const tasks = weakList.slice(0, 7).map((item, i) => ({
    id: genId('tsk'),
    plan_id: plan.id,
    user_id: userId,
    day_of_week: days[i % days.length],
    subject: item.subject,
    chapter: item.chapter,
    task_description: `Concept revision (${Math.round(item.acc)}% accuracy in your logged tests) + timed practice problems.`,
    duration_minutes: 90,
    practice_questions: 25,
    revision_topics: `Core formulas and error review for ${item.chapter}.`,
    is_completed: false,
  }));
  ws.studyTasks.push(...tasks);

  return {
    workspace: ws,
    result: { ...plan, tasks },
  };
}

function toggleStudyTask(userId, rawWs, taskId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const task = ws.studyTasks.find((t) => t.id === taskId);
  if (!task) {
    throw createHttpError(404, 'Task not found.');
  }
  task.is_completed = !task.is_completed;
  return {
    workspace: ws,
    result: { id: task.id, is_completed: task.is_completed },
  };
}

function addStudyTask(userId, rawWs, data = {}) {
  const {
    day_of_week,
    subject,
    chapter,
    duration_hours,
    practice_questions,
    revision_topics,
    task_description,
  } = data;

  if (!subject || !chapter) {
    throw createHttpError(400, 'subject and chapter are required.');
  }

  const ws = normalizeWorkspace(userId, rawWs);
  let plan = ws.studyPlans
    .filter((p) => p.is_active)
    .sort((a, b) => (a.generated_date < b.generated_date ? 1 : -1))[0];

  if (!plan) {
    plan = createEmptyPlanInWs(ws, userId);
  }

  const hrs = Number(duration_hours || 2.0);
  const pq = Number(practice_questions ?? 20);
  const durationMins = Math.round(hrs * 60);
  const desc = task_description || `Study ${chapter} (${hrs} hrs) + ${pq} practice questions.`;

  const task = {
    id: genId('tsk'),
    plan_id: plan.id,
    user_id: userId,
    day_of_week: day_of_week || 'Monday',
    subject,
    chapter,
    task_description: desc,
    duration_minutes: durationMins,
    practice_questions: pq,
    revision_topics: revision_topics || `Focus on ${chapter} core problems.`,
    is_completed: false,
  };
  ws.studyTasks.push(task);

  return { workspace: ws, result: task };
}

function deleteStudyTask(userId, rawWs, taskId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const idx = ws.studyTasks.findIndex((t) => t.id === taskId);
  if (idx === -1) {
    throw createHttpError(404, 'Task not found.');
  }
  ws.studyTasks.splice(idx, 1);
  return { workspace: ws, result: { message: 'Study task deleted.' } };
}

function getScheduledTests(userId, rawWs) {
  const ws = normalizeWorkspace(userId, rawWs);
  return [...ws.scheduledTests].sort((a, b) => (a.scheduled_date > b.scheduled_date ? 1 : -1));
}

function scheduleTest(userId, rawWs, data = {}) {
  const {
    test_title,
    exam_type,
    scheduled_date,
    scheduled_time,
    duration_minutes,
    syllabus_chapters,
  } = data;

  if (!test_title || !scheduled_date) {
    throw createHttpError(400, 'test_title and scheduled_date are required.');
  }

  const ws = normalizeWorkspace(userId, rawWs);
  const rem = {
    id: genId('sch'),
    user_id: userId,
    test_title,
    exam_type: exam_type || 'JEE Main',
    scheduled_date,
    scheduled_time: scheduled_time || '09:00 AM',
    duration_minutes: Number(duration_minutes || 180),
    syllabus_chapters: syllabus_chapters || 'Full Syllabus',
    is_completed: false,
    created_at: new Date().toISOString(),
  };
  ws.scheduledTests.push(rem);
  return { workspace: ws, result: rem };
}

function deleteScheduledTest(userId, rawWs, testId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const idx = ws.scheduledTests.findIndex((t) => t.id === testId);
  if (idx === -1) {
    throw createHttpError(404, 'Scheduled test not found.');
  }
  ws.scheduledTests.splice(idx, 1);
  return { workspace: ws, result: { message: 'Scheduled test deleted.' } };
}

function toggleScheduledTest(userId, rawWs, testId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const rem = ws.scheduledTests.find((t) => t.id === testId);
  if (!rem) {
    throw createHttpError(404, 'Scheduled test not found.');
  }
  rem.is_completed = !rem.is_completed;
  return { workspace: ws, result: rem };
}

// ---------- HSC Revision ----------

function getHscChapters(userId, rawWs, params = {}) {
  const ws = normalizeWorkspace(userId, rawWs);
  const { subject, search } = params || {};

  let list = [...ws.hscRevisions];
  if (subject && subject !== 'All') {
    list = list.filter((c) => c.subject === subject);
  }
  if (search && String(search).trim() !== '') {
    const needle = String(search).trim().toLowerCase();
    list = list.filter(
      (c) =>
        String(c.chapter_name || '').toLowerCase().includes(needle) ||
        String(c.notes || '').toLowerCase().includes(needle)
    );
  }
  list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return list;
}

function addHscChapter(userId, rawWs, { subject, chapter_name, notes } = {}) {
  const cleanSubject = HSC_SUBJECT_LIST.includes(subject) ? subject : null;
  if (!cleanSubject) {
    throw createHttpError(
      400,
      'Please select a valid HSC subject (Physics, Maths, English, Chemistry, or CS).'
    );
  }
  if (!chapter_name || !String(chapter_name).trim()) {
    throw createHttpError(400, 'Chapter name is required.');
  }

  const ws = normalizeWorkspace(userId, rawWs);
  const todayStr = new Date().toISOString().split('T')[0];

  const entry = {
    id: genId('hsc'),
    user_id: userId,
    subject: cleanSubject,
    chapter_name: String(chapter_name).trim(),
    notes: notes && String(notes).trim() ? String(notes).trim() : null,
    revision_count: 1,
    completed_date: todayStr,
    created_at: new Date().toISOString(),
  };

  ws.hscRevisions.push(entry);
  return { workspace: ws, result: entry };
}

function incrementHscRevision(userId, rawWs, chapterId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const entry = ws.hscRevisions.find((c) => c.id === chapterId);
  if (!entry) {
    throw createHttpError(404, 'HSC revision chapter not found.');
  }
  entry.revision_count = Number(entry.revision_count || 1) + 1;
  entry.completed_date = new Date().toISOString().split('T')[0];
  return { workspace: ws, result: entry };
}

function deleteHscChapter(userId, rawWs, chapterId) {
  const ws = normalizeWorkspace(userId, rawWs);
  const idx = ws.hscRevisions.findIndex((c) => c.id === chapterId);
  if (idx === -1) {
    throw createHttpError(404, 'HSC revision chapter not found.');
  }
  ws.hscRevisions.splice(idx, 1);
  return { workspace: ws, result: { message: 'Completed chapter removed.' } };
}

function updateProfileFields(userId, rawWs, account, profileData = {}) {
  const ws = normalizeWorkspace(userId, rawWs);
  const allowedFields = [
    'target_year',
    'target_attempt',
    'target_percentile',
    'target_marks',
    'target_physics_marks',
    'target_chemistry_marks',
    'target_maths_marks',
    'daily_study_hours',
    'target_exam_date',
  ];

  const nextAccount = { ...account };
  if (profileData.full_name && String(profileData.full_name).trim() !== '') {
    nextAccount.full_name = String(profileData.full_name).trim();
    nextAccount.updated_at = new Date().toISOString();
  }

  for (const key of allowedFields) {
    if (profileData[key] !== undefined) {
      ws.profile[key] = profileData[key];
    }
  }

  return {
    account: nextAccount,
    workspace: ws,
    result: {
      ...ws.profile,
      full_name: nextAccount.full_name,
    },
  };
}

module.exports = {
  createHttpError,
  genId,
  createDefaultProfile,
  createEmptyWorkspace,
  normalizeWorkspace,
  formatUserOut,
  confirmTest,
  getTests,
  getTestDetail,
  deleteTest,
  getTimeAnalytics,
  getDashboardOverview,
  getWeakTopics,
  getReminders,
  addReminder,
  deleteReminder,
  toggleReminder,
  getSubjectBreakdown,
  getTargetAnalysis,
  compareTests,
  getStudyPlan,
  regenerateStudyPlan,
  toggleStudyTask,
  addStudyTask,
  deleteStudyTask,
  getScheduledTests,
  scheduleTest,
  deleteScheduledTest,
  toggleScheduledTest,
  getHscChapters,
  addHscChapter,
  incrementHscRevision,
  deleteHscChapter,
  updateProfileFields,
};
