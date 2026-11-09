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

async function seed(forceReset = false) {
  const existingDemoUser = await User.findOne({ email: 'demo@jeemain.ai' });

  if (!forceReset) {
    if (existingDemoUser) {
      if (existingDemoUser.full_name === 'Aarav Sharma') {
        existingDemoUser.full_name = 'Om Pal';
        await existingDemoUser.save();
        console.log('Updated default student name to Om Pal.');
      }
      return;
    }

    const totalUsers = await User.countDocuments();
    if (totalUsers > 0) {
      return;
    }
  } else {
    console.log('Force resetting MongoDB database collections...');
    await Promise.all([
      QuestionResult.deleteMany({}),
      SubjectResult.deleteMany({}),
      ChapterPerformance.deleteMany({}),
      AIRecommendation.deleteMany({}),
      Test.deleteMany({}),
      StudyTask.deleteMany({}),
      StudyPlan.deleteMany({}),
      WeakTopicReminder.deleteMany({}),
      ScheduledTestReminder.deleteMany({}),
      StudentProfile.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  console.log('Initializing clean account for Om Pal (zero pre-seeded tests)...');

  const hashedPassword = await getPasswordHash('password123');
  const user = await User.create({
    email: 'demo@jeemain.ai',
    hashed_password: hashedPassword,
    full_name: 'Om Pal',
  });

  await StudentProfile.create({
    user_id: user._id,
    target_year: 2026,
    target_attempt: 'January & April',
    target_percentile: 99.0,
    target_marks: 220.0,
    target_physics_marks: 75.0,
    target_chemistry_marks: 80.0,
    target_maths_marks: 65.0,
    daily_study_hours: 6.5,
    target_exam_date: '2026-01-24',
  });

  console.log('Clean account ready: Om Pal (demo@jeemain.ai / password123).');
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
