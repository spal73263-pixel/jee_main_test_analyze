const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let baseUrl = process.env.TEST_BASE_URL || '';

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function req(endpoint, options = {}) {
  const res = await fetch(`${baseUrl}${endpoint}`, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body };
}

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

async function runTests() {
  let localServer = null;

  try {
    // ------------------------------------------------------------------
    // PART 1: Stateless Express Backend (Zero Database Required)
    // ------------------------------------------------------------------
    if (!baseUrl) {
      const app = require('./server');
      localServer = await new Promise((resolve) => {
        const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
      });
      const addr = localServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }

    console.log(`Running Zero-DB E2E Suite against ${baseUrl}...`);

    const health = await req('/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'Health check should pass');
    assert(health.body.database === 'none', `Expected database="none", got ${health.body.database}`);
    console.log('✓ 1. Stateless backend health check passed (zero database)');

    const rootHtml = await fetch(`${baseUrl}/`);
    const htmlText = await rootHtml.text();
    assert(rootHtml.status === 200 && htmlText.includes('id="root"'), 'Built React SPA should be served on /');
    console.log('✓ 2. Built React SPA served on /');

    const sampleCsvPath = path.resolve(__dirname, '..', 'sample_tests', 'allen_mock_test_result.csv');
    let sampleCsvBytes = null;
    if (fs.existsSync(sampleCsvPath)) {
      sampleCsvBytes = fs.readFileSync(sampleCsvPath);
      const formData = new FormData();
      formData.append('file', new Blob([sampleCsvBytes], { type: 'text/csv' }), 'allen_mock_test_result.csv');
      const upRes = await fetch(`${baseUrl}/api/uploads/process`, {
        method: 'POST',
        body: formData,
      });
      const upBody = await upRes.json();
      assert(upRes.status === 200 && upBody.questions.length === 75, 'Stateless CSV upload extraction failed');
      console.log('✓ 3. Stateless multipart CSV extraction (75 questions) passed');
    }

    // ------------------------------------------------------------------
    // PART 2: Browser-Persisted LocalStorage Engine (Om Pal & Full UI)
    // ------------------------------------------------------------------
    installLocalStorageShim();
    const localStoreUrl = pathToFileURL(
      path.resolve(__dirname, '..', 'frontend', 'src', 'services', 'localStore.js')
    ).href;
    const {
      localAuthAPI,
      localDashboardAPI,
      localTestsAPI,
      localUploadsAPI,
      localSubjectsAPI,
      localPredictionsAPI,
      localPlannerAPI,
      localHscRevisionAPI,
      parseCsvTextInBrowser,
    } = await import(localStoreUrl);

    // 4. Om Pal login + multi-user registration / profile / reset flow
    const loginRes = await localAuthAPI.login({ email: 'demo@jeemain.ai', password: 'password123' });
    assert(loginRes.data.user.full_name === 'Om Pal', `Expected Om Pal, got ${loginRes.data.user.full_name}`);

    const regRes = await localAuthAPI.register({
      email: 'student2@jeemain.ai',
      password: 'secret123',
      full_name: 'Student Two',
      target_marks: 250,
    });
    globalThis.localStorage.setItem('token', regRes.data.access_token);
    const updProf = await localAuthAPI.updateProfile({ target_marks: 260, daily_study_hours: 8 });
    assert(updProf.data.target_marks === 260, 'Profile update failed');
    const forgotRes = await localAuthAPI.forgotPassword({ email: 'student2@jeemain.ai' });
    assert(forgotRes.data.reset_token, 'Forgot password token generation failed');
    await localAuthAPI.resetPassword({ token: forgotRes.data.reset_token, new_password: 'newpassword123' });
    const relogin = await localAuthAPI.login({ email: 'student2@jeemain.ai', password: 'newpassword123' });
    assert(relogin.data.user.profile.target_marks === 260, 'Password reset / profile persistence check failed');

    // Switch back to Om Pal
    const omRes = await localAuthAPI.login({ email: 'demo@jeemain.ai', password: 'password123' });
    globalThis.localStorage.setItem('token', omRes.data.access_token);
    console.log('✓ 4. Om Pal login, registration, profile edit & password reset passed');

    // 5. Clean empty state (0 tests, 0 reminders, 0 study tasks, 0 HSC chapters)
    const dashEmpty = await localDashboardAPI.getOverview();
    assert(dashEmpty.data.total_tests === 0, 'Expected 0 initial tests');
    const planInit = await localPlannerAPI.getPlan();
    assert(Array.isArray(planInit.data.tasks) && planInit.data.tasks.length === 0, 'Expected 0 initial study tasks');
    const hscInit = await localHscRevisionAPI.getChapters();
    assert(Array.isArray(hscInit.data) && hscInit.data.length === 0, 'Expected 0 initial HSC revision chapters');
    console.log('✓ 5. Zero hardcoded tests, empty planner & empty HSC revision verified');

    // 6. Manual JEE Main (with chapter questions for AI plan/time analytics) + HSC 6-subject entry
    const jeeRes = await localUploadsAPI.confirmTest({
      test_name: 'Self Entered JEE Main 1',
      test_date: '2026-02-01',
      test_type: 'JEE Main',
      shift: 'Shift 1',
      duration_minutes: 180,
      total_questions: 75,
      max_marks: 300,
      marks_obtained: 208,
      subjects: [
        { subject: 'Physics', total_questions: 25, attempted: 22, correct: 18, incorrect: 4, unattempted: 3, positive_marks: 72, negative_marks: 4, total_marks: 68, accuracy: 81.82, percentage: 68, time_spent_seconds: 3200 },
        { subject: 'Chemistry', total_questions: 25, attempted: 24, correct: 20, incorrect: 4, unattempted: 1, positive_marks: 80, negative_marks: 4, total_marks: 76, accuracy: 83.33, percentage: 76, time_spent_seconds: 2600 },
        { subject: 'Mathematics', total_questions: 25, attempted: 21, correct: 17, incorrect: 4, unattempted: 4, positive_marks: 68, negative_marks: 4, total_marks: 64, accuracy: 80.95, percentage: 64, time_spent_seconds: 4000 },
      ],
      questions: [
        { question_number: 1, subject: 'Physics', chapter: 'Rotational Motion', status: 'Incorrect', marks: -1, time_spent_seconds: 240 },
        { question_number: 2, subject: 'Physics', chapter: 'Rotational Motion', status: 'Incorrect', marks: -1, time_spent_seconds: 190 },
        { question_number: 3, subject: 'Chemistry', chapter: 'Chemical Bonding', status: 'Correct', marks: 4, time_spent_seconds: 75 },
        { question_number: 4, subject: 'Mathematics', chapter: 'Definite Integration', status: 'Correct', marks: 4, time_spent_seconds: 120 },
      ],
    });
    assert(jeeRes.data.id && jeeRes.data.ai_recommendation?.overall_summary, 'JEE confirm + AI report failed');

    const hscRes = await localUploadsAPI.confirmTest({
      test_name: 'Self Entered HSC Exam 1',
      test_date: '2026-02-05',
      test_type: 'Board Exam Class 12th',
      shift: 'Single Session',
      duration_minutes: 180,
      total_questions: 160,
      max_marks: 600,
      marks_obtained: 534,
      subjects: [
        { subject: 'Mathematics', total_questions: 30, attempted: 28, correct: 28, incorrect: 0, unattempted: 2, positive_marks: 94, negative_marks: 0, total_marks: 94, accuracy: 100, percentage: 94, time_spent_seconds: 0 },
        { subject: 'Computer Science 1 (CS 1)', total_questions: 25, attempted: 24, correct: 24, incorrect: 0, unattempted: 1, positive_marks: 92, negative_marks: 0, total_marks: 92, accuracy: 100, percentage: 92, time_spent_seconds: 0 },
        { subject: 'Computer Science 2 (CS 2)', total_questions: 25, attempted: 23, correct: 23, incorrect: 0, unattempted: 2, positive_marks: 90, negative_marks: 0, total_marks: 90, accuracy: 100, percentage: 90, time_spent_seconds: 0 },
        { subject: 'English', total_questions: 20, attempted: 17, correct: 17, incorrect: 0, unattempted: 3, positive_marks: 84, negative_marks: 0, total_marks: 84, accuracy: 100, percentage: 84, time_spent_seconds: 0 },
        { subject: 'Physics', total_questions: 30, attempted: 26, correct: 26, incorrect: 0, unattempted: 4, positive_marks: 88, negative_marks: 0, total_marks: 88, accuracy: 100, percentage: 88, time_spent_seconds: 0 },
        { subject: 'Chemistry', total_questions: 30, attempted: 26, correct: 26, incorrect: 0, unattempted: 4, positive_marks: 86, negative_marks: 0, total_marks: 86, accuracy: 100, percentage: 86, time_spent_seconds: 0 },
      ],
      questions: [],
    });
    assert(hscRes.data.subject_results.length === 6, 'HSC 6-subject entry failed');
    console.log('✓ 6. Browser-persisted JEE Main + HSC 6-subject entry + AI report passed');

    // 7. Dashboard, weak topics, subject breakdown, time analytics, comparison & target analysis
    const dashPop = await localDashboardAPI.getOverview();
    assert(dashPop.data.total_tests === 2, `Expected 2 tests, got ${dashPop.data.total_tests}`);
    const weakTopics = await localDashboardAPI.getWeakTopics();
    assert(weakTopics.data.weak_topics.length >= 1, 'Expected weak topics classification');
    const breakdown = await localSubjectsAPI.getBreakdown({ subject: 'Physics' });
    assert(breakdown.data.chapters.length >= 1 && breakdown.data.units.length >= 1, 'Subject breakdown failed');
    const timeRes = await localTestsAPI.getTimeAnalytics(jeeRes.data.id);
    assert(timeRes.data.has_question_level_timing && timeRes.data.excessive_time_questions_count === 1, 'Time analytics failed');
    const compRes = await localPredictionsAPI.compareTests({ test_ids: [jeeRes.data.id, hscRes.data.id] });
    assert(compRes.data.primary_contributor, 'Test comparison failed');
    const targetRes = await localPredictionsAPI.getTargetAnalysis();
    assert(targetRes.data.progression_milestones.length > 0, 'Target analysis failed');
    console.log('✓ 7. Browser analytics, weak topics, subjects, timing, comparison & target projection passed');

    // 8. Browser CSV offline parser + Reminders + Study Planner CRUD + AI Auto-Plan
    if (sampleCsvBytes) {
      const browserParsed = parseCsvTextInBrowser(sampleCsvBytes.toString('utf8'), 'allen_mock_test_result.csv');
      assert(browserParsed.questions.length === 75, 'Browser CSV fallback parser failed');
    }
    const rem = await localDashboardAPI.addReminder({ subject: 'Physics', chapter_name: 'Optics', marks_lost: -4, exam_type: 'JEE Main' });
    await localDashboardAPI.toggleReminder(rem.data.id);
    await localDashboardAPI.deleteReminder(rem.data.id);

    const regenRes = await localPlannerAPI.regeneratePlan();
    assert(regenRes.data.tasks.some((t) => t.chapter === 'Rotational Motion'), 'AI auto-plan regeneration failed');

    const task = await localPlannerAPI.addTask({ day_of_week: 'Monday', subject: 'Computer Science 1 (CS 1)', chapter: 'C++ Pointers', duration_hours: 1.5, practice_questions: 25 });
    await localPlannerAPI.toggleTask(task.data.id);
    await localPlannerAPI.deleteTask(task.data.id);

    const sched = await localPlannerAPI.scheduleTest({ test_title: 'Mock Reminder 1', exam_type: 'JEE Main', scheduled_date: '2026-03-01', scheduled_time: '09:00 AM', duration_minutes: 180 });
    await localPlannerAPI.toggleScheduledTest(sched.data.id);
    await localPlannerAPI.deleteScheduledTest(sched.data.id);
    console.log('✓ 8. Browser CSV fallback + reminders + AI auto-plan + study planner CRUD passed');

    // 9. HSC Revision Tracker CRUD (Physics, Maths, English, Chemistry, CS)
    const hscSubjects = ['Physics', 'Maths', 'English', 'Chemistry', 'CS'];
    const addedHscIds = [];
    for (const sub of hscSubjects) {
      const added = await localHscRevisionAPI.addChapter({
        subject: sub,
        chapter_name: `${sub} Revision Chapter 1`,
        notes: 'Completed textbook exercises',
      });
      addedHscIds.push(added.data.id);
    }
    const allHsc = await localHscRevisionAPI.getChapters();
    assert(allHsc.data.length === 5, `Expected 5 HSC chapters, got ${allHsc.data.length}`);
    const csOnly = await localHscRevisionAPI.getChapters({ subject: 'CS' });
    assert(csOnly.data.length === 1 && csOnly.data[0].subject === 'CS', 'HSC subject filter failed');
    const bumped = await localHscRevisionAPI.incrementRevision(addedHscIds[0]);
    assert(bumped.data.revision_count === 2, 'HSC revision round increment failed');
    for (const id of addedHscIds) {
      await localHscRevisionAPI.deleteChapter(id);
    }
    const hscEmptyAfter = await localHscRevisionAPI.getChapters();
    assert(hscEmptyAfter.data.length === 0, 'HSC delete cleanup failed');
    console.log('✓ 9. HSC Revision CRUD across Physics, Maths, English, Chemistry & CS passed');

    // 10. Clean delete & state persistence check
    await localTestsAPI.deleteTest(jeeRes.data.id);
    await localTestsAPI.deleteTest(hscRes.data.id);
    const dashAfter = await localDashboardAPI.getOverview();
    assert(dashAfter.data.total_tests === 0, 'Delete cleanup failed');
    console.log('✓ 10. Test deletion & clean state verification passed');

    console.log('\nALL ZERO-DB WEB STORAGE + STATELESS API E2E TESTS PASSED!');
  } finally {
    if (localServer) {
      if (typeof localServer.closeAllConnections === 'function') {
        localServer.closeAllConnections();
      }
      await new Promise((resolve) => localServer.close(resolve));
    }
  }
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
