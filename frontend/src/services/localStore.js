const STORAGE_KEY = 'jee_analyzer_db_v1';
const memoryFallback = new Map();

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return {
    getItem: (k) => (memoryFallback.has(k) ? memoryFallback.get(k) : null),
    setItem: (k, v) => {
      memoryFallback.set(k, String(v));
    },
    removeItem: (k) => {
      memoryFallback.delete(k);
    },
  };
}

export function createApiError(status, detail) {
  const err = new Error(detail);
  err.response = {
    status,
    data: { detail },
  };
  return err;
}

function genId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function round2(val) {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

export function round1(val) {
  return Math.round((Number(val || 0) + Number.EPSILON) * 10) / 10;
}

export function classifyAccuracy(accuracy) {
  if (accuracy >= 80.0) return 'Strong';
  if (accuracy >= 50.0) return 'Average';
  return 'Weak';
}

export const JEE_CHAPTER_UNIT_MAP = {
  'Units and Measurements': ['Physics', 'Units & Measurements'],
  Kinematics: ['Physics', 'Mechanics'],
  'Laws of Motion': ['Physics', 'Mechanics'],
  'Work, Energy and Power': ['Physics', 'Mechanics'],
  'Rotational Motion': ['Physics', 'Mechanics'],
  Gravitation: ['Physics', 'Mechanics'],
  'Properties of Solids and Liquids': ['Physics', 'Mechanics'],
  Thermodynamics: ['Physics', 'Thermodynamics'],
  'Kinetic Theory of Gases': ['Physics', 'Thermodynamics'],
  'Oscillations and Waves': ['Physics', 'Waves and Oscillations'],
  Electrostatics: ['Physics', 'Electrodynamics'],
  'Current Electricity': ['Physics', 'Electrodynamics'],
  'Magnetic Effects of Current and Magnetism': ['Physics', 'Electrodynamics'],
  'Magnetic Effects of Current': ['Physics', 'Electrodynamics'],
  'Electromagnetic Induction and AC': ['Physics', 'Electrodynamics'],
  'Electromagnetic Waves': ['Physics', 'Electrodynamics'],
  Optics: ['Physics', 'Optics'],
  'Dual Nature of Matter and Radiation': ['Physics', 'Modern Physics'],
  'Atoms and Nuclei': ['Physics', 'Modern Physics'],
  'Electronic Devices': ['Physics', 'Modern Physics'],
  'Modern Physics': ['Physics', 'Modern Physics'],

  'Some Basic Concepts of Chemistry': ['Chemistry', 'Physical Chemistry'],
  'Atomic Structure': ['Chemistry', 'Physical Chemistry'],
  'Chemical Thermodynamics': ['Chemistry', 'Physical Chemistry'],
  'Chemical Equilibrium': ['Chemistry', 'Physical Chemistry'],
  'Ionic Equilibrium': ['Chemistry', 'Physical Chemistry'],
  'Redox Reactions and Electrochemistry': ['Chemistry', 'Physical Chemistry'],
  'Chemical Kinetics': ['Chemistry', 'Physical Chemistry'],
  Solutions: ['Chemistry', 'Physical Chemistry'],
  'Periodic Table and Periodicity': ['Chemistry', 'Inorganic Chemistry'],
  'Chemical Bonding and Molecular Structure': ['Chemistry', 'Inorganic Chemistry'],
  'Chemical Bonding': ['Chemistry', 'Inorganic Chemistry'],
  'p-Block Elements': ['Chemistry', 'Inorganic Chemistry'],
  'd- and f-Block Elements': ['Chemistry', 'Inorganic Chemistry'],
  'Coordination Compounds': ['Chemistry', 'Inorganic Chemistry'],
  'General Organic Chemistry': ['Chemistry', 'Organic Chemistry'],
  Hydrocarbons: ['Chemistry', 'Organic Chemistry'],
  'Haloalkanes and Haloarenes': ['Chemistry', 'Organic Chemistry'],
  'Alcohols, Phenols and Ethers': ['Chemistry', 'Organic Chemistry'],
  'Aldehydes, Ketones and Carboxylic Acids': ['Chemistry', 'Organic Chemistry'],
  'Amines and Nitrogen Compounds': ['Chemistry', 'Organic Chemistry'],
  Biomolecules: ['Chemistry', 'Organic Chemistry'],

  'Sets, Relations and Functions': ['Mathematics', 'Algebra'],
  'Complex Numbers and Quadratic Equations': ['Mathematics', 'Algebra'],
  'Complex Numbers': ['Mathematics', 'Algebra'],
  'Matrices and Determinants': ['Mathematics', 'Matrices & Determinants'],
  'Permutations and Combinations': ['Mathematics', 'Algebra'],
  'Binomial Theorem': ['Mathematics', 'Algebra'],
  'Sequence and Series': ['Mathematics', 'Algebra'],
  'Limits, Continuity and Differentiability': ['Mathematics', 'Calculus'],
  'Differential Calculus': ['Mathematics', 'Calculus'],
  'Integral Calculus': ['Mathematics', 'Calculus'],
  'Differential Equations': ['Mathematics', 'Calculus'],
  'Coordinate Geometry (Lines & Circles)': ['Mathematics', 'Coordinate Geometry'],
  'Conic Sections': ['Mathematics', 'Coordinate Geometry'],
  'Vectors and 3D Geometry': ['Mathematics', 'Vectors and 3D Geometry'],
  Trigonometry: ['Mathematics', 'Trigonometry'],
  'Statistics and Probability': ['Mathematics', 'Probability & Statistics'],
};

function createInitialDb() {
  const now = new Date().toISOString();
  const userId = 'user_om_pal';
  return {
    users: [
      {
        id: userId,
        email: 'demo@jeemain.ai',
        password: 'password123',
        full_name: 'Om Pal',
        created_at: now,
      },
    ],
    profiles: [
      {
        id: 'profile_om_pal',
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
      },
    ],
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

function loadDb() {
  const storage = getStorage();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDb();
      storage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    const defaults = createInitialDb();
    return {
      users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : defaults.users,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : defaults.profiles,
      tests: Array.isArray(parsed.tests) ? parsed.tests : [],
      subjectResults: Array.isArray(parsed.subjectResults) ? parsed.subjectResults : [],
      questionResults: Array.isArray(parsed.questionResults) ? parsed.questionResults : [],
      chapterPerformances: Array.isArray(parsed.chapterPerformances) ? parsed.chapterPerformances : [],
      aiRecommendations: Array.isArray(parsed.aiRecommendations) ? parsed.aiRecommendations : [],
      weakReminders: Array.isArray(parsed.weakReminders) ? parsed.weakReminders : [],
      studyPlans: Array.isArray(parsed.studyPlans) ? parsed.studyPlans : [],
      studyTasks: Array.isArray(parsed.studyTasks) ? parsed.studyTasks : [],
      scheduledTests: Array.isArray(parsed.scheduledTests) ? parsed.scheduledTests : [],
      hscRevisions: Array.isArray(parsed.hscRevisions) ? parsed.hscRevisions : [],
    };
  } catch {
    const initial = createInitialDb();
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch {
      // Ignore write failures
    }
    return initial;
  }
}

function saveDb(db) {
  const storage = getStorage();
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    throw createApiError(
      507,
      'Browser local storage limit reached. Consider deleting old tests to free space on this page.'
    );
  }
}

function getCurrentUserFromDb(db) {
  const storage = getStorage();
  const token = storage.getItem('token') || '';
  if (!token.startsWith('local-token:')) {
    throw createApiError(401, 'Could not validate credentials');
  }
  const userId = token.slice('local-token:'.length).trim();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw createApiError(401, 'Could not validate credentials');
  }
  return user;
}

function getOrCreateProfile(db, userId) {
  let profile = db.profiles.find((p) => p.user_id === userId);
  if (!profile) {
    profile = {
      id: genId('prof'),
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
    db.profiles.push(profile);
    saveDb(db);
  }
  return profile;
}

function formatUserOut(db, user) {
  const profile = getOrCreateProfile(db, user.id);
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    profile: { ...profile },
  };
}

function wrapRes(data) {
  return Promise.resolve({ data });
}

// ---------- Browser CSV Fallback Parser ----------
function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

function normalizeSubjectBrowser(rawSub, qNum) {
  const s = String(rawSub || '').trim().toLowerCase();
  if (s.includes('phy')) return 'Physics';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('math') || s.includes('mat')) return 'Mathematics';
  if (qNum >= 1 && qNum <= 25) return 'Physics';
  if (qNum >= 26 && qNum <= 50) return 'Chemistry';
  if (qNum >= 51 && qNum <= 75) return 'Mathematics';
  return 'Physics';
}

function guessChapterBrowser(subject, qNum) {
  const physicsChapters = [
    'Kinematics', 'Laws of Motion', 'Work, Energy and Power', 'Rotational Motion',
    'Gravitation', 'Thermodynamics', 'Oscillations and Waves', 'Electrostatics',
    'Current Electricity', 'Magnetic Effects of Current and Magnetism', 'Optics',
    'Modern Physics', 'Units and Measurements',
  ];
  const chemChapters = [
    'Some Basic Concepts of Chemistry', 'Atomic Structure', 'Chemical Bonding and Molecular Structure',
    'Chemical Thermodynamics', 'Chemical Equilibrium', 'Solutions', 'Redox Reactions and Electrochemistry',
    'General Organic Chemistry', 'Hydrocarbons', 'Aldehydes, Ketones and Carboxylic Acids', 'Coordination Compounds',
  ];
  const mathsChapters = [
    'Complex Numbers and Quadratic Equations', 'Matrices and Determinants', 'Permutations and Combinations',
    'Sequence and Series', 'Limits, Continuity and Differentiability', 'Differential Calculus',
    'Integral Calculus', 'Coordinate Geometry (Lines & Circles)', 'Vectors and 3D Geometry', 'Statistics and Probability',
  ];
  const idx = Math.abs(parseInt(qNum, 10) || 0);
  if (subject === 'Physics') return physicsChapters[idx % physicsChapters.length];
  if (subject === 'Chemistry') return chemChapters[idx % chemChapters.length];
  return mathsChapters[idx % mathsChapters.length];
}

export function parseCsvTextInBrowser(csvText, filename) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw createApiError(400, 'CSV file has no data rows.');
  }

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '')
  );

  const normalizedRows = lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] !== undefined ? vals[i] : '';
    });
    return obj;
  });

  const qCols = ['question', 'q_no', 'qno', 'question_number', 'q_num', 'qid'];
  const matchedQCol = headers.find((c) => qCols.some((q) => c.includes(q)));
  const subCols = ['subject', 'sub', 'subject_name'];
  const matchedSubCol = headers.find((c) => subCols.includes(c));

  const baseName = String(filename || 'Uploaded Test')
    .replace(/\.[^.]+$/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  const questions = [];
  const subjects = [];
  const warnings = [];
  const missingFields = [];

  if (matchedQCol) {
    normalizedRows.forEach((row, idx) => {
      const rawQ = row[matchedQCol];
      const qNum =
        rawQ !== undefined && rawQ !== '' && !Number.isNaN(Number(rawQ))
          ? parseInt(rawQ, 10)
          : idx + 1;

      const subject = normalizeSubjectBrowser(row.subject || row.sub || '', qNum);
      let chapter = String(row.chapter || row.topic || row.unit || '').trim();
      if (!chapter || ['nan', 'none', 'undefined'].includes(chapter.toLowerCase())) {
        chapter = guessChapterBrowser(subject, qNum);
      }

      const rawStatus = String(row.status || row.result || '').trim();
      const capStatus = rawStatus
        ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
        : '';
      const selected = String(row.selected_answer || row.student_answer || row.your_ans || '').trim();
      const correctAns = String(row.correct_answer || row.key || row.ans || '').trim();

      let status = 'Unattempted';
      if (['Correct', 'Right', 'Pass'].includes(capStatus)) {
        status = 'Correct';
      } else if (['Incorrect', 'Wrong', 'Fail'].includes(capStatus)) {
        status = 'Incorrect';
      } else if (['Unattempted', 'Left', 'Skipped', 'Not attempted'].includes(capStatus)) {
        status = 'Unattempted';
      } else if (selected && correctAns && !['nan', 'undefined'].includes(selected.toLowerCase())) {
        status = selected.toUpperCase() === correctAns.toUpperCase() ? 'Correct' : 'Incorrect';
      } else if (selected && !['nan', '', '-', 'none', 'undefined'].includes(selected.toLowerCase())) {
        status = 'Correct';
      }

      let marks = 0.0;
      if (row.marks !== undefined && row.marks !== '' && !Number.isNaN(Number(row.marks))) {
        marks = parseFloat(row.marks);
      } else {
        marks = status === 'Correct' ? 4.0 : status === 'Incorrect' ? -1.0 : 0.0;
      }

      let timeVal = 0;
      const timeCol = headers.find((c) => c.includes('time'));
      if (timeCol && row[timeCol] !== undefined && row[timeCol] !== '' && !Number.isNaN(Number(row[timeCol]))) {
        timeVal = parseInt(parseFloat(row[timeCol]), 10);
      }

      const rawDiff = String(row.difficulty || 'Medium').trim().toLowerCase();
      const diffCap = rawDiff.charAt(0).toUpperCase() + rawDiff.slice(1);
      const difficulty = ['Easy', 'Medium', 'Hard'].includes(diffCap) ? diffCap : 'Medium';

      questions.push({
        question_number: qNum,
        subject,
        chapter,
        topic: row.topic && String(row.topic).trim() !== '' ? String(row.topic).trim() : null,
        question_type: String(row.question_type || row.type || 'MCQ').trim() || 'MCQ',
        difficulty,
        selected_answer: selected && selected.toLowerCase() !== 'nan' ? selected : null,
        correct_answer: correctAns && correctAns.toLowerCase() !== 'nan' ? correctAns : null,
        status,
        marks,
        time_spent_seconds: timeVal,
      });
    });

    for (const subName of ['Physics', 'Chemistry', 'Mathematics']) {
      const subQs = questions.filter((q) => q.subject === subName);
      let att = 0;
      let corr = 0;
      let inc = 0;
      let unatt = 0;
      let posM = 0;
      let negM = 0;
      let timeSpent = 0;
      for (const q of subQs) {
        if (q.status === 'Correct') {
          att += 1;
          corr += 1;
          posM += q.marks > 0 ? q.marks : 4;
        } else if (q.status === 'Incorrect') {
          att += 1;
          inc += 1;
          negM += Math.abs(q.marks !== 0 ? q.marks : 1);
        } else {
          unatt += 1;
        }
        timeSpent += Number(q.time_spent_seconds || 0);
      }
      const totM = posM - negM;
      const totQ = subQs.length > 0 ? subQs.length : 25;
      subjects.push({
        subject: subName,
        total_questions: totQ,
        attempted: att,
        correct: corr,
        incorrect: inc,
        unattempted: unatt,
        positive_marks: posM,
        negative_marks: negM,
        total_marks: totM,
        accuracy: att > 0 ? round2((corr / att) * 100) : 0,
        percentage: round2((totM / (totQ * 4)) * 100),
        time_spent_seconds: timeSpent,
      });
    }
  } else if (matchedSubCol) {
    for (const row of normalizedRows) {
      const subName = normalizeSubjectBrowser(row[matchedSubCol], 0);
      const totQ = parseInt(row.total_questions || row.total || 25, 10) || 25;
      const att = parseInt(row.attempted || 0, 10) || 0;
      const corr = parseInt(row.correct || 0, 10) || 0;
      const inc = row.incorrect !== undefined ? parseInt(row.incorrect, 10) : Math.max(0, att - corr);
      const unatt = row.unattempted !== undefined ? parseInt(row.unattempted, 10) : Math.max(0, totQ - att);
      const posM = row.positive_marks !== undefined ? parseFloat(row.positive_marks) : corr * 4.0;
      const negM = row.negative_marks !== undefined ? parseFloat(row.negative_marks) : inc * 1.0;
      const totM = row.total_marks !== undefined ? parseFloat(row.total_marks) : row.marks !== undefined ? parseFloat(row.marks) : posM - negM;
      subjects.push({
        subject: subName,
        total_questions: totQ,
        attempted: att,
        correct: corr,
        incorrect: inc,
        unattempted: unatt,
        positive_marks: posM,
        negative_marks: negM,
        total_marks: totM,
        accuracy: att > 0 ? round2((corr / att) * 100) : 0.0,
        percentage: totQ > 0 ? round2((totM / (totQ * 4.0)) * 100) : 0.0,
        time_spent_seconds: parseInt(row.time_spent_seconds || row.time_spent || 0, 10) || 0,
      });
    }
    missingFields.push('Question-level breakdown not provided in summary table');
  }

  if (subjects.length === 0) {
    for (const s of ['Physics', 'Chemistry', 'Mathematics']) {
      subjects.push({
        subject: s,
        total_questions: 25,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 25,
        positive_marks: 0,
        negative_marks: 0,
        total_marks: 0,
        accuracy: 0,
        percentage: 0,
        time_spent_seconds: 0,
      });
    }
    warnings.push('Could not find standard subject rows. Defaulted empty templates.');
  }

  const totalMarksObtained = subjects.reduce((acc, s) => acc + Number(s.total_marks || 0), 0);
  const totalQ = subjects.reduce((acc, s) => acc + Number(s.total_questions || 0), 0) || questions.length || 75;

  return {
    test_name: baseName,
    test_date: new Date().toISOString().split('T')[0],
    test_type: 'Mock Test',
    shift: 'Shift 1',
    duration_minutes: 180,
    total_questions: totalQ,
    max_marks: totalQ * 4.0,
    marks_obtained: totalMarksObtained,
    official_percentile: null,
    official_rank: null,
    subjects,
    questions,
    extraction_source: 'Browser CSV Parser',
    confidence_level: questions.length > 0 ? 'high' : 'medium',
    warnings,
    missing_fields: missingFields,
    validation_status: warnings.length === 0 ? 'valid' : 'needs_review',
  };
}

// ---------- Test Diagnostic Helpers ----------
function buildTestDetailFromDb(db, testObj) {
  const subjectResults = db.subjectResults.filter((s) => s.test_id === testObj.id);
  const questionResults = db.questionResults
    .filter((q) => q.test_id === testObj.id)
    .sort((a, b) => a.question_number - b.question_number);
  const chapterPerformances = db.chapterPerformances.filter((c) => c.test_id === testObj.id);
  const aiRec = db.aiRecommendations.find((a) => a.test_id === testObj.id) || null;

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

function generateAIReportInDb(db, testObj, subjects, chapters) {
  const prevTests = db.tests
    .filter((t) => t.user_id === testObj.user_id && t.id !== testObj.id && t.created_at < testObj.created_at)
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

  db.aiRecommendations = db.aiRecommendations.filter((r) => r.test_id !== testObj.id);
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
  db.aiRecommendations.push(aiObj);
  return aiObj;
}

// ---------- Public Service Endpoints Matching REST API Shapes ----------

export const localAuthAPI = {
  async login({ email, password } = {}) {
    if (!email || !password) {
      throw createApiError(401, 'Incorrect email or password.');
    }
    const db = loadDb();
    const normEmail = String(email).toLowerCase().trim();
    const user = db.users.find((u) => u.email === normEmail);
    if (!user || String(user.password) !== String(password)) {
      throw createApiError(401, 'Incorrect email or password.');
    }
    return wrapRes({
      access_token: `local-token:${user.id}`,
      token_type: 'bearer',
      user: formatUserOut(db, user),
    });
  },

  async register({ email, password, full_name, target_year, target_marks, target_percentile } = {}) {
    if (!email || !password || !full_name) {
      throw createApiError(400, 'Email, password, and full_name are required.');
    }
    if (String(password).length < 6) {
      throw createApiError(400, 'Password must be at least 6 characters.');
    }
    const db = loadDb();
    const normEmail = String(email).toLowerCase().trim();
    if (db.users.some((u) => u.email === normEmail)) {
      throw createApiError(400, 'An account with this email already exists.');
    }

    const newUser = {
      id: genId('usr'),
      email: normEmail,
      password: String(password),
      full_name: String(full_name).trim(),
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);

    const newProfile = {
      id: genId('prof'),
      user_id: newUser.id,
      target_year: Number(target_year || 2026),
      target_attempt: 'January & April',
      target_percentile: Number(target_percentile || 99.0),
      target_marks: Number(target_marks || 220.0),
      target_physics_marks: 75.0,
      target_chemistry_marks: 80.0,
      target_maths_marks: 65.0,
      daily_study_hours: 6.5,
      target_exam_date: '2026-01-24',
    };
    db.profiles.push(newProfile);
    saveDb(db);

    return wrapRes({
      access_token: `local-token:${newUser.id}`,
      token_type: 'bearer',
      user: formatUserOut(db, newUser),
    });
  },

  async getMe() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    return wrapRes(formatUserOut(db, user));
  },

  async updateProfile(profileData = {}) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
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

    if (profileData.full_name && String(profileData.full_name).trim() !== '') {
      user.full_name = String(profileData.full_name).trim();
    }

    const profile = getOrCreateProfile(db, user.id);
    for (const key of allowedFields) {
      if (profileData[key] !== undefined) {
        profile[key] = profileData[key];
      }
    }
    saveDb(db);

    return wrapRes({
      ...profile,
      full_name: user.full_name,
    });
  },

  async forgotPassword({ email } = {}) {
    if (!email) {
      throw createApiError(400, 'Email address is required.');
    }
    const db = loadDb();
    const normEmail = String(email).toLowerCase().trim();
    const user = db.users.find((u) => u.email === normEmail);
    if (!user) {
      return wrapRes({
        message: 'If this email is registered, password reset instructions have been sent.',
      });
    }
    return wrapRes({
      message: 'Password reset token generated successfully.',
      reset_token: `local-reset:${user.id}:${Date.now()}`,
    });
  },

  async resetPassword({ token, new_password } = {}) {
    if (!token || !new_password || String(new_password).length < 6) {
      throw createApiError(400, 'Valid token and password (min 6 characters) are required.');
    }
    if (!String(token).startsWith('local-reset:')) {
      throw createApiError(400, 'Invalid or expired reset token.');
    }
    const parts = String(token).split(':');
    const userId = parts[1];
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      throw createApiError(404, 'User not found.');
    }
    user.password = String(new_password);
    saveDb(db);
    return wrapRes({ message: 'Password successfully updated.' });
  },
};

export const localUploadsAPI = {
  async confirmTest(testIn = {}) {
    if (!testIn.test_name || !testIn.test_date) {
      throw createApiError(400, 'test_name and test_date are required.');
    }

    const db = loadDb();
    const user = getCurrentUserFromDb(db);

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
      user_id: user.id,
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
    db.tests.push(testObj);

    const savedSubjects = subjects.map((sub) => ({
      id: genId('sub'),
      test_id: testObj.id,
      user_id: user.id,
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
    db.subjectResults.push(...savedSubjects);

    const savedQuestions = questions.map((q, idx) => ({
      id: genId('q'),
      test_id: testObj.id,
      user_id: user.id,
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
    db.questionResults.push(...savedQuestions);

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
            user_id: user.id,
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
          user_id: user.id,
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
    db.chapterPerformances.push(...chaptersToInsert);

    generateAIReportInDb(db, testObj, savedSubjects, chaptersToInsert);
    saveDb(db);

    return wrapRes(buildTestDetailFromDb(db, testObj));
  },
};

export const localTestsAPI = {
  async getTests(params = {}) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const { search, test_type } = params || {};

    let tests = db.tests.filter((t) => t.user_id === user.id);

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

    const results = tests.map((t) => {
      const subs = db.subjectResults.filter((s) => s.test_id === t.id);
      const subject_marks = {};
      for (const s of subs) {
        subject_marks[s.subject] = s.total_marks;
      }
      return {
        ...t,
        subject_marks,
      };
    });

    return wrapRes(results);
  },

  async getTestDetail(testId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const test = db.tests.find((t) => t.id === testId && t.user_id === user.id);
    if (!test) {
      throw createApiError(404, 'Test not found.');
    }
    return wrapRes(buildTestDetailFromDb(db, test));
  },

  async deleteTest(testId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const idx = db.tests.findIndex((t) => t.id === testId && t.user_id === user.id);
    if (idx === -1) {
      throw createApiError(404, 'Test not found.');
    }
    db.tests.splice(idx, 1);
    db.subjectResults = db.subjectResults.filter((s) => s.test_id !== testId);
    db.questionResults = db.questionResults.filter((q) => q.test_id !== testId);
    db.chapterPerformances = db.chapterPerformances.filter((c) => c.test_id !== testId);
    db.aiRecommendations = db.aiRecommendations.filter((a) => a.test_id !== testId);
    saveDb(db);
    return wrapRes({ message: 'Test successfully deleted.' });
  },

  async getTimeAnalytics(testId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const testDoc = db.tests.find((t) => t.id === testId && t.user_id === user.id);
    if (!testDoc) {
      throw createApiError(404, 'Test not found.');
    }

    const questions = db.questionResults
      .filter((q) => q.test_id === testId)
      .sort((a, b) => a.question_number - b.question_number);
    const subjectResults = db.subjectResults.filter((s) => s.test_id === testId);

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

    return wrapRes({
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
    });
  },
};

export const localDashboardAPI = {
  async getOverview() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const tests = db.tests
      .filter((t) => t.user_id === user.id)
      .sort((a, b) => {
        if (a.test_date !== b.test_date) return a.test_date > b.test_date ? 1 : -1;
        return a.created_at > b.created_at ? 1 : -1;
      });

    if (tests.length === 0) {
      return wrapRes({
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

    const marksHistory = [];
    const accuracyHistory = [];
    const subjectTotals = {
      Physics: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
      Chemistry: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
      Mathematics: { marks: 0.0, accuracy_sum: 0.0, count: 0, neg_marks: 0.0 },
    };
    const statusBreakdown = { Correct: 0, Incorrect: 0, Unattempted: 0 };

    for (const t of tests) {
      const subs = db.subjectResults.filter((s) => s.test_id === t.id);
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

    const allChapters = db.chapterPerformances.filter((c) => c.user_id === user.id);
    const weakCount = allChapters.filter((c) => c.classification === 'Weak').length;
    const strongCount = allChapters.filter((c) => c.classification === 'Strong').length;

    return wrapRes({
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
  },

  async getWeakTopics() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const chapters = db.chapterPerformances.filter((c) => c.user_id === user.id);

    if (chapters.length === 0) {
      return wrapRes({
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

    return wrapRes({
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
  },

  async getReminders() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const list = db.weakReminders
      .filter((r) => r.user_id === user.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return wrapRes(list);
  },

  async addReminder({ subject, chapter_name, marks_lost, notes, exam_type } = {}) {
    if (!subject || !chapter_name) {
      throw createApiError(400, 'subject and chapter_name are required.');
    }
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const rem = {
      id: genId('rem'),
      user_id: user.id,
      subject,
      chapter_name,
      marks_lost: Number(marks_lost || 0),
      notes: notes || null,
      exam_type: exam_type || 'JEE Main',
      is_resolved: false,
      created_at: new Date().toISOString(),
    };
    db.weakReminders.push(rem);
    saveDb(db);
    return wrapRes(rem);
  },

  async deleteReminder(reminderId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const idx = db.weakReminders.findIndex((r) => r.id === reminderId && r.user_id === user.id);
    if (idx === -1) {
      throw createApiError(404, 'Reminder not found.');
    }
    db.weakReminders.splice(idx, 1);
    saveDb(db);
    return wrapRes({ message: 'Reminder deleted successfully.' });
  },

  async toggleReminder(reminderId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const rem = db.weakReminders.find((r) => r.id === reminderId && r.user_id === user.id);
    if (!rem) {
      throw createApiError(404, 'Reminder not found.');
    }
    rem.is_resolved = !rem.is_resolved;
    saveDb(db);
    return wrapRes(rem);
  },
};

export const localSubjectsAPI = {
  async getBreakdown(params = {}) {
    const { subject, test_id } = params || {};
    const db = loadDb();
    const user = getCurrentUserFromDb(db);

    let records = db.chapterPerformances.filter((c) => c.user_id === user.id);
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

    return wrapRes({
      chapters: chapterList,
      units: unitList,
      subject: subject || null,
    });
  },
};

export const localPredictionsAPI = {
  async getTargetAnalysis() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const profile = getOrCreateProfile(db, user.id);

    const targetMarks = profile.target_marks || 220.0;
    const targetPct = profile.target_percentile || 99.0;
    const targetDateStr = profile.target_exam_date || '2026-01-24';

    const tests = db.tests
      .filter((t) => t.user_id === user.id)
      .sort((a, b) => (a.test_date > b.test_date ? 1 : -1));

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
      const subResults = db.subjectResults.filter((s) => testIds.has(s.test_id));
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

    return wrapRes({
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
  },

  async compareTests({ test_ids } = {}) {
    if (!Array.isArray(test_ids) || test_ids.length < 2) {
      throw createApiError(400, 'At least two test IDs are required for comparison.');
    }

    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const idSet = new Set(test_ids.map(String));

    const tests = db.tests
      .filter((t) => t.user_id === user.id && idSet.has(t.id))
      .sort((a, b) => {
        if (a.test_date !== b.test_date) return a.test_date > b.test_date ? 1 : -1;
        return a.created_at > b.created_at ? 1 : -1;
      });

    if (tests.length < 2) {
      throw createApiError(400, 'Could not find the specified tests on this page.');
    }

    const subByTest = new Map();
    for (const t of tests) {
      const map = { Physics: 0.0, Chemistry: 0.0, Mathematics: 0.0 };
      const subs = db.subjectResults.filter((sr) => sr.test_id === t.id);
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

    const testDetails = tests.map((t) => buildTestDetailFromDb(db, t));

    return wrapRes({
      tests: testDetails,
      deltas,
      primary_contributor: primaryContributor,
      metrics_comparison: metricsComparison,
    });
  },
};

function createEmptyPlanInDb(db, userId) {
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
  db.studyPlans.push(plan);
  return { ...plan, tasks: [] };
}

export const localPlannerAPI = {
  async getPlan() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    let activePlan = db.studyPlans
      .filter((p) => p.user_id === user.id && p.is_active)
      .sort((a, b) => (a.generated_date < b.generated_date ? 1 : -1))[0];

    if (!activePlan) {
      const created = createEmptyPlanInDb(db, user.id);
      saveDb(db);
      return wrapRes(created);
    }

    const tasks = db.studyTasks.filter((t) => t.plan_id === activePlan.id);
    return wrapRes({
      ...activePlan,
      tasks,
    });
  },

  async regeneratePlan() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const chapters = db.chapterPerformances.filter((c) => c.user_id === user.id);

    if (chapters.length === 0) {
      throw createApiError(
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
      throw createApiError(
        400,
        'All logged chapters currently have >= 75% accuracy. Add custom study sessions manually for targeted practice.'
      );
    }

    for (const p of db.studyPlans) {
      if (p.user_id === user.id) p.is_active = false;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayStr = new Date().toISOString().split('T')[0];

    const plan = {
      id: genId('pln'),
      user_id: user.id,
      title: `7-Day Targeted Recovery Plan (Week of ${todayStr})`,
      week_start_date: todayStr,
      is_active: true,
      summary: 'Targeted revision schedule generated strictly from your logged test chapter accuracy.',
      generated_date: new Date().toISOString(),
    };
    db.studyPlans.push(plan);

    const tasks = weakList.slice(0, 7).map((item, i) => ({
      id: genId('tsk'),
      plan_id: plan.id,
      user_id: user.id,
      day_of_week: days[i % days.length],
      subject: item.subject,
      chapter: item.chapter,
      task_description: `Concept revision (${Math.round(item.acc)}% accuracy in your logged tests) + timed practice problems.`,
      duration_minutes: 90,
      practice_questions: 25,
      revision_topics: `Core formulas and error review for ${item.chapter}.`,
      is_completed: false,
    }));
    db.studyTasks.push(...tasks);
    saveDb(db);

    return wrapRes({
      ...plan,
      tasks,
    });
  },

  async toggleTask(taskId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const task = db.studyTasks.find((t) => t.id === taskId && t.user_id === user.id);
    if (!task) {
      throw createApiError(404, 'Task not found.');
    }
    task.is_completed = !task.is_completed;
    saveDb(db);
    return wrapRes({ id: task.id, is_completed: task.is_completed });
  },

  async addTask(data = {}) {
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
      throw createApiError(400, 'subject and chapter are required.');
    }

    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    let plan = db.studyPlans
      .filter((p) => p.user_id === user.id && p.is_active)
      .sort((a, b) => (a.generated_date < b.generated_date ? 1 : -1))[0];

    if (!plan) {
      plan = createEmptyPlanInDb(db, user.id);
    }

    const hrs = Number(duration_hours || 2.0);
    const pq = Number(practice_questions ?? 20);
    const durationMins = Math.round(hrs * 60);
    const desc = task_description || `Study ${chapter} (${hrs} hrs) + ${pq} practice questions.`;

    const task = {
      id: genId('tsk'),
      plan_id: plan.id,
      user_id: user.id,
      day_of_week: day_of_week || 'Monday',
      subject,
      chapter,
      task_description: desc,
      duration_minutes: durationMins,
      practice_questions: pq,
      revision_topics: revision_topics || `Focus on ${chapter} core problems.`,
      is_completed: false,
    };
    db.studyTasks.push(task);
    saveDb(db);
    return wrapRes(task);
  },

  async deleteTask(taskId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const idx = db.studyTasks.findIndex((t) => t.id === taskId && t.user_id === user.id);
    if (idx === -1) {
      throw createApiError(404, 'Task not found.');
    }
    db.studyTasks.splice(idx, 1);
    saveDb(db);
    return wrapRes({ message: 'Study task deleted.' });
  },

  async getScheduledTests() {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const list = db.scheduledTests
      .filter((t) => t.user_id === user.id)
      .sort((a, b) => (a.scheduled_date > b.scheduled_date ? 1 : -1));
    return wrapRes(list);
  },

  async scheduleTest(data = {}) {
    const {
      test_title,
      exam_type,
      scheduled_date,
      scheduled_time,
      duration_minutes,
      syllabus_chapters,
    } = data;

    if (!test_title || !scheduled_date) {
      throw createApiError(400, 'test_title and scheduled_date are required.');
    }

    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const rem = {
      id: genId('sch'),
      user_id: user.id,
      test_title,
      exam_type: exam_type || 'JEE Main',
      scheduled_date,
      scheduled_time: scheduled_time || '09:00 AM',
      duration_minutes: Number(duration_minutes || 180),
      syllabus_chapters: syllabus_chapters || 'Full Syllabus',
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    db.scheduledTests.push(rem);
    saveDb(db);
    return wrapRes(rem);
  },

  async deleteScheduledTest(testId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const idx = db.scheduledTests.findIndex((t) => t.id === testId && t.user_id === user.id);
    if (idx === -1) {
      throw createApiError(404, 'Scheduled test not found.');
    }
    db.scheduledTests.splice(idx, 1);
    saveDb(db);
    return wrapRes({ message: 'Scheduled test deleted.' });
  },

  async toggleScheduledTest(testId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const rem = db.scheduledTests.find((t) => t.id === testId && t.user_id === user.id);
    if (!rem) {
      throw createApiError(404, 'Scheduled test not found.');
    }
    rem.is_completed = !rem.is_completed;
    saveDb(db);
    return wrapRes(rem);
  },
};

const HSC_SUBJECT_LIST = ['Physics', 'Maths', 'English', 'Chemistry', 'CS'];

export const localHscRevisionAPI = {
  async getChapters(params = {}) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const { subject, search } = params || {};

    let list = (db.hscRevisions || []).filter((c) => c.user_id === user.id);
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
    return wrapRes(list);
  },

  async addChapter({ subject, chapter_name, notes } = {}) {
    const cleanSubject = HSC_SUBJECT_LIST.includes(subject) ? subject : null;
    if (!cleanSubject) {
      throw createApiError(400, 'Please select a valid HSC subject (Physics, Maths, English, Chemistry, or CS).');
    }
    if (!chapter_name || !String(chapter_name).trim()) {
      throw createApiError(400, 'Chapter name is required.');
    }

    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    if (!Array.isArray(db.hscRevisions)) {
      db.hscRevisions = [];
    }

    const cleanName = String(chapter_name).trim();
    const todayStr = new Date().toISOString().split('T')[0];

    const entry = {
      id: genId('hsc'),
      user_id: user.id,
      subject: cleanSubject,
      chapter_name: cleanName,
      notes: notes && String(notes).trim() ? String(notes).trim() : null,
      revision_count: 1,
      completed_date: todayStr,
      created_at: new Date().toISOString(),
    };

    db.hscRevisions.push(entry);
    saveDb(db);
    return wrapRes(entry);
  },

  async incrementRevision(chapterId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const entry = (db.hscRevisions || []).find((c) => c.id === chapterId && c.user_id === user.id);
    if (!entry) {
      throw createApiError(404, 'HSC revision chapter not found.');
    }
    entry.revision_count = Number(entry.revision_count || 1) + 1;
    entry.completed_date = new Date().toISOString().split('T')[0];
    saveDb(db);
    return wrapRes(entry);
  },

  async deleteChapter(chapterId) {
    const db = loadDb();
    const user = getCurrentUserFromDb(db);
    const list = db.hscRevisions || [];
    const idx = list.findIndex((c) => c.id === chapterId && c.user_id === user.id);
    if (idx === -1) {
      throw createApiError(404, 'HSC revision chapter not found.');
    }
    list.splice(idx, 1);
    db.hscRevisions = list;
    saveDb(db);
    return wrapRes({ message: 'Completed chapter removed.' });
  },
};
