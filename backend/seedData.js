const {
  User,
  StudentProfile,
  Test,
  SubjectResult,
  QuestionResult,
  ChapterPerformance,
  StudyPlan,
  StudyTask,
  AIRecommendation,
  WeakTopicReminder,
  ScheduledTestReminder,
} = require('./models');
const { getPasswordHash } = require('./middleware/auth');
const { computeAndSaveTestAnalysis } = require('./services/performanceAnalyzer');
const { generateAIRecommendationReport } = require('./services/aiRecommendation');
const { round2 } = require('./services/marksCalculator');

// Simple deterministic PRNG so seeded tests match consistent realistic scores
function createRng(seedVal) {
  let s = seedVal >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

async function seed(forceReset = false) {
  const existingUser = await User.findOne({ email: 'demo@jeemain.ai' });
  if (existingUser) {
    if (!forceReset) {
      console.log('Demo user already exists, skipping seed.');
      return;
    }
    console.log('Refreshing demo student tests & reminders...');
    const uid = existingUser._id;
    await Promise.all([
      StudentProfile.deleteMany({ user_id: uid }),
      SubjectResult.deleteMany({ user_id: uid }),
      QuestionResult.deleteMany({ user_id: uid }),
      ChapterPerformance.deleteMany({ user_id: uid }),
      AIRecommendation.deleteMany({ user_id: uid }),
      StudyTask.deleteMany({ user_id: uid }),
      StudyPlan.deleteMany({ user_id: uid }),
      WeakTopicReminder.deleteMany({ user_id: uid }),
      ScheduledTestReminder.deleteMany({ user_id: uid }),
      Test.deleteMany({ user_id: uid }),
      User.deleteOne({ _id: uid }),
    ]);
  }

  console.log('Seeding demo JEE student user and realistic mock test history...');

  const hashed_password = await getPasswordHash('password123');
  const user = await User.create({
    email: 'demo@jeemain.ai',
    hashed_password,
    full_name: 'Aarav Sharma',
  });

  await StudentProfile.create({
    user_id: user._id,
    target_year: 2026,
    target_attempt: 'January & April',
    target_percentile: 99.2,
    target_marks: 225.0,
    target_physics_marks: 80.0,
    target_chemistry_marks: 85.0,
    target_maths_marks: 60.0,
    daily_study_hours: 7.0,
    target_exam_date: '2026-01-24',
  });

  const physicsChapters = [
    ['Kinematics', 'Mechanics', 120],
    ['Laws of Motion', 'Mechanics', 130],
    ['Work, Energy and Power', 'Mechanics', 140],
    ['Rotational Motion', 'Mechanics', 190],
    ['Gravitation', 'Mechanics', 110],
    ['Thermodynamics', 'Thermodynamics', 145],
    ['Oscillations and Waves', 'Waves and Oscillations', 160],
    ['Electrostatics', 'Electrodynamics', 180],
    ['Current Electricity', 'Electrodynamics', 130],
    ['Magnetic Effects of Current', 'Electrodynamics', 150],
    ['Optics', 'Optics', 175],
    ['Modern Physics', 'Modern Physics', 100],
    ['Units and Measurements', 'Units & Measurements', 90],
  ];

  const chemChapters = [
    ['Some Basic Concepts of Chemistry', 'Physical Chemistry', 110],
    ['Atomic Structure', 'Physical Chemistry', 115],
    ['Chemical Thermodynamics', 'Physical Chemistry', 140],
    ['Chemical Equilibrium', 'Physical Chemistry', 130],
    ['Solutions', 'Physical Chemistry', 120],
    ['Redox Reactions and Electrochemistry', 'Physical Chemistry', 135],
    ['Periodic Table and Periodicity', 'Inorganic Chemistry', 75],
    ['Chemical Bonding and Molecular Structure', 'Inorganic Chemistry', 85],
    ['Coordination Compounds', 'Inorganic Chemistry', 95],
    ['General Organic Chemistry', 'Organic Chemistry', 125],
    ['Hydrocarbons', 'Organic Chemistry', 110],
    ['Aldehydes, Ketones and Carboxylic Acids', 'Organic Chemistry', 130],
  ];

  const mathsChapters = [
    ['Complex Numbers and Quadratic Equations', 'Algebra', 170],
    ['Matrices and Determinants', 'Matrices & Determinants', 140],
    ['Permutations and Combinations', 'Algebra', 210],
    ['Sequence and Series', 'Algebra', 150],
    ['Limits, Continuity and Differentiability', 'Calculus', 180],
    ['Differential Calculus', 'Calculus', 190],
    ['Integral Calculus', 'Calculus', 220],
    ['Coordinate Geometry (Lines & Circles)', 'Coordinate Geometry', 200],
    ['Vectors and 3D Geometry', 'Vectors and 3D Geometry', 165],
    ['Statistics and Probability', 'Probability & Statistics', 185],
  ];

  const testsData = [
    {
      name: 'JEE Main Diagnostic Mock 01',
      date: '2025-10-12',
      type: 'JEE Main',
      shift: 'Morning',
      percentile: 92.15,
      rank: 98400,
      phy_acc: 0.65,
      chem_acc: 0.70,
      math_acc: 0.50,
      phy_att: 17,
      chem_att: 20,
      math_att: 14,
      max_marks: 300.0,
    },
    {
      name: 'Allen JEE Main Major 02',
      date: '2025-10-26',
      type: 'JEE Main',
      shift: 'Evening',
      percentile: 95.80,
      rank: 52100,
      phy_acc: 0.75,
      chem_acc: 0.78,
      math_acc: 0.58,
      phy_att: 19,
      chem_att: 21,
      math_att: 15,
      max_marks: 300.0,
    },
    {
      name: 'NTA Full Syllabus Simulation 03',
      date: '2025-11-05',
      type: 'JEE Main',
      shift: 'Morning',
      percentile: 98.42,
      rank: 19800,
      phy_acc: 0.84,
      chem_acc: 0.86,
      math_acc: 0.68,
      phy_att: 21,
      chem_att: 22,
      math_att: 17,
      max_marks: 300.0,
    },
    {
      name: 'JEE Advanced All India Simulation 01',
      date: '2025-11-15',
      type: 'JEE Advanced',
      shift: 'Paper 1 & Paper 2',
      percentile: 99.10,
      rank: 4820,
      phy_acc: 0.72,
      chem_acc: 0.76,
      math_acc: 0.62,
      phy_att: 18,
      chem_att: 19,
      math_att: 15,
      max_marks: 360.0,
    },
    {
      name: 'CBSE Class 12 Pre-Board Exam 01',
      date: '2025-12-02',
      type: 'Board Exam Class 12th',
      shift: 'Annual Theory',
      percentile: 96.50,
      rank: null,
      phy_acc: 0.88,
      chem_acc: 0.92,
      math_acc: 0.84,
      phy_att: 24,
      chem_att: 24,
      math_att: 23,
      max_marks: 220.0,
    },
  ];

  const rng = createRng(202601);

  for (let tIdx = 0; tIdx < testsData.length; tIdx += 1) {
    const td = testsData[tIdx];
    const testDoc = await Test.create({
      user_id: user._id,
      test_name: td.name,
      test_id_code: `MOCK-2025-0${tIdx + 1}`,
      test_date: td.date,
      test_type: td.type,
      shift: td.shift,
      duration_minutes: 180,
      total_questions: 75,
      max_marks: td.max_marks || 300.0,
      official_percentile: td.percentile,
      official_rank: td.rank,
      created_at: new Date(Date.now() - (testsData.length - tIdx) * 86400000),
    });

    const allQuestions = [];

    // Physics Q1-25
    for (let qn = 1; qn <= 25; qn += 1) {
      const [chapName, , baseTime] = physicsChapters[(qn - 1) % physicsChapters.length];
      const isAtt = qn <= td.phy_att;
      let status = 'Unattempted';
      let marks = 0.0;
      let timeS = randInt(rng, 10, 40);

      if (isAtt) {
        const isCorr = rng() < td.phy_acc;
        status = isCorr ? 'Correct' : 'Incorrect';
        marks = isCorr ? 4.0 : -1.0;
        timeS = baseTime + randInt(rng, -20, 45);
      }

      allQuestions.push({
        test_id: testDoc._id,
        user_id: user._id,
        question_number: qn,
        subject: 'Physics',
        chapter: chapName,
        topic: `${chapName} Core Application`,
        question_type: qn <= 20 ? 'MCQ' : 'Numerical',
        difficulty: qn % 3 === 1 ? 'Easy' : qn % 3 === 2 ? 'Medium' : 'Hard',
        selected_answer: isAtt ? 'Option B' : null,
        correct_answer: status === 'Correct' ? 'Option B' : 'Option C',
        status,
        marks,
        time_spent_seconds: timeS,
      });
    }

    // Chemistry Q26-50
    for (let qn = 26; qn <= 50; qn += 1) {
      const idx = qn - 26;
      const [chapName, , baseTime] = chemChapters[idx % chemChapters.length];
      const isAtt = idx + 1 <= td.chem_att;
      let status = 'Unattempted';
      let marks = 0.0;
      let timeS = randInt(rng, 10, 30);

      if (isAtt) {
        const isCorr = rng() < td.chem_acc;
        status = isCorr ? 'Correct' : 'Incorrect';
        marks = isCorr ? 4.0 : -1.0;
        timeS = baseTime + randInt(rng, -15, 30);
      }

      allQuestions.push({
        test_id: testDoc._id,
        user_id: user._id,
        question_number: qn,
        subject: 'Chemistry',
        chapter: chapName,
        topic: `${chapName} Reactions & Principles`,
        question_type: qn <= 45 ? 'MCQ' : 'Numerical',
        difficulty: qn % 3 === 1 ? 'Easy' : qn % 3 === 2 ? 'Medium' : 'Hard',
        selected_answer: isAtt ? 'Option A' : null,
        correct_answer: status === 'Correct' ? 'Option A' : 'Option D',
        status,
        marks,
        time_spent_seconds: timeS,
      });
    }

    // Mathematics Q51-75
    for (let qn = 51; qn <= 75; qn += 1) {
      const idx = qn - 51;
      const [chapName, , baseTime] = mathsChapters[idx % mathsChapters.length];
      const isAtt = idx + 1 <= td.math_att;
      let status = 'Unattempted';
      let marks = 0.0;
      let timeS = randInt(rng, 15, 50);

      if (isAtt) {
        const isCorr = rng() < td.math_acc;
        status = isCorr ? 'Correct' : 'Incorrect';
        marks = isCorr ? 4.0 : -1.0;
        timeS = baseTime + randInt(rng, -20, 60);
      }

      allQuestions.push({
        test_id: testDoc._id,
        user_id: user._id,
        question_number: qn,
        subject: 'Mathematics',
        chapter: chapName,
        topic: `${chapName} Problem Solving`,
        question_type: qn <= 70 ? 'MCQ' : 'Numerical',
        difficulty: qn % 2 === 1 ? 'Medium' : 'Hard',
        selected_answer: isAtt ? 'Option C' : null,
        correct_answer: status === 'Correct' ? 'Option C' : 'Option A',
        status,
        marks,
        time_spent_seconds: timeS,
      });
    }

    await QuestionResult.insertMany(allQuestions);

    const subjectDocs = [];
    for (const subName of ['Physics', 'Chemistry', 'Mathematics']) {
      const subQs = allQuestions.filter((q) => q.subject === subName);
      const att = subQs.filter((q) => q.status === 'Correct' || q.status === 'Incorrect').length;
      const corr = subQs.filter((q) => q.status === 'Correct').length;
      const inc = subQs.filter((q) => q.status === 'Incorrect').length;
      const unatt = subQs.filter((q) => q.status === 'Unattempted').length;
      const posM = corr * 4.0;
      const negM = inc * 1.0;
      const totM = posM - negM;
      const acc = att > 0 ? round2((corr / att) * 100) : 0.0;
      const timeS = subQs.reduce((sum, q) => sum + q.time_spent_seconds, 0);

      subjectDocs.push({
        test_id: testDoc._id,
        user_id: user._id,
        subject: subName,
        total_questions: 25,
        attempted: att,
        correct: corr,
        incorrect: inc,
        unattempted: unatt,
        positive_marks: posM,
        negative_marks: negM,
        total_marks: totM,
        accuracy: acc,
        percentage: round2((totM / 100.0) * 100),
        time_spent_seconds: timeS,
      });
    }
    await SubjectResult.insertMany(subjectDocs);

    await computeAndSaveTestAnalysis(testDoc);
    await generateAIRecommendationReport(testDoc._id);
  }

  // Weak Topic Reminders
  const remindersData = [
    ['Physics', 'Rotational Motion', -8.0, 'Conceded negative marking in rolling without slipping torque balance', 'JEE Main'],
    ['Chemistry', 'Coordination Compounds', -4.0, 'Splitting of d-orbitals in octahedral vs tetrahedral fields', 'JEE Advanced'],
    ['Mathematics', 'Differential Equations', -5.0, 'Missed integrating factor in linear first order form', 'Board Exam Class 12th'],
    ['Physics', 'Current Electricity', -4.0, 'Meter bridge and potentiometer circuit sensitivity derivations', 'Board Exam Class 12th'],
    ['Mathematics', 'Integral Calculus', -6.0, "Definite integral periodicity and King's property errors", 'JEE Advanced'],
  ];

  await WeakTopicReminder.insertMany(
    remindersData.map(([subject, chapter_name, marks_lost, notes, exam_type]) => ({
      user_id: user._id,
      subject,
      chapter_name,
      marks_lost,
      notes,
      exam_type,
      is_resolved: false,
    }))
  );

  // Scheduled Mock Test Reminders
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const fourDaysOut = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];

  await ScheduledTestReminder.insertMany([
    {
      user_id: user._id,
      test_title: 'JEE Main Full Syllabus Mock 04',
      exam_type: 'JEE Main',
      scheduled_date: tomorrow,
      scheduled_time: '09:00 AM',
      duration_minutes: 180,
      syllabus_chapters: 'Physics: Mechanics & Electrostatics; Chemistry: Full; Maths: Calculus & Algebra',
      is_completed: false,
    },
    {
      user_id: user._id,
      test_title: 'HSC Class 12th Computer Science & Maths Practice',
      exam_type: 'Board Exam Class 12th',
      scheduled_date: fourDaysOut,
      scheduled_time: '10:30 AM',
      duration_minutes: 180,
      syllabus_chapters: 'Mathematics Part 1 & 2, CS 1 (C++ & Data Structures), CS 2 (8085 Microprocessor)',
      is_completed: false,
    },
  ]);

  console.log('Successfully seeded realistic JEE Main, JEE Advanced, Board Class 12th tests & reminders!');
}

if (require.main === module) {
  const { connectDB, closeDB } = require('./config/db');
  const forceReset = process.argv.includes('--reset');
  connectDB()
    .then(() => seed(forceReset))
    .then(() => closeDB())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };
