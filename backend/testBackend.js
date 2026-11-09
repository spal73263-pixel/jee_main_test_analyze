const fs = require('fs');
const path = require('path');

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

async function runTests() {
  let localServer = null;
  let closeDBFn = null;

  try {
    if (!baseUrl) {
      const app = require('./server');
      const { ensureDatabaseReady, closeDB } = require('./config/db');
      closeDBFn = closeDB;
      await ensureDatabaseReady();
      localServer = await new Promise((resolve) => {
        const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
      });
      const addr = localServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }

    console.log(`Running MERN End-to-End Smoke Suite against ${baseUrl}...`);

    // 1. Health & SPA check
    const health = await req('/api/health');
    assert(health.status === 200, `Health status expected 200, got ${health.status}`);
    assert(health.body.status === 'healthy', 'Health status should be healthy');
    assert(String(health.body.stack).includes('MERN'), 'Stack should mention MERN');
    console.log('✓ 1. Health check passed');

    const rootHtml = await fetch(`${baseUrl}/`);
    const htmlText = await rootHtml.text();
    assert(rootHtml.status === 200 && htmlText.includes('id="root"'), 'Frontend SPA HTML should be served on /');
    console.log('✓ 2. Built React SPA served on /');

    // 2. Om Pal Login & Profile Verification
    const login = await req('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@jeemain.ai', password: 'password123' }),
    });
    assert(login.status === 200 && login.body.access_token, 'Login should succeed with token');
    assert(login.body.user?.full_name === 'Om Pal', `Expected Om Pal, got ${login.body.user?.full_name}`);
    const token = login.body.access_token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('✓ 3. Om Pal login & JWT verification passed');

    // 3. Clean Empty State Verification (zero hardcoded tests or study tasks)
    const dashEmpty = await req('/api/analysis/dashboard', { headers: authHeaders });
    assert(dashEmpty.status === 200 && dashEmpty.body.total_tests === 0, 'Expected clean 0 pre-seeded tests');
    const planInit = await req('/api/study-planner', { headers: authHeaders });
    assert(planInit.status === 200 && Array.isArray(planInit.body.tasks) && planInit.body.tasks.length === 0, 'Study planner should start empty with 0 hardcoded tasks');
    console.log('✓ 4. Zero hardcoded tests & empty initial study planner verified');

    // 4. Manual JEE Main + HSC 6-Subject Entry
    const jeePayload = {
      test_name: 'Self Entered JEE Main 1',
      test_date: '2026-02-01',
      test_type: 'JEE Main',
      shift: 'Shift 1',
      duration_minutes: 180,
      total_questions: 75,
      max_marks: 300,
      marks_obtained: 210,
      subjects: [
        { subject: 'Physics', total_questions: 25, attempted: 22, correct: 18, incorrect: 4, unattempted: 3, positive_marks: 72, negative_marks: 4, total_marks: 68, accuracy: 81.82, percentage: 68, time_spent_seconds: 0 },
        { subject: 'Chemistry', total_questions: 25, attempted: 24, correct: 20, incorrect: 4, unattempted: 1, positive_marks: 80, negative_marks: 4, total_marks: 76, accuracy: 83.33, percentage: 76, time_spent_seconds: 0 },
        { subject: 'Mathematics', total_questions: 25, attempted: 21, correct: 17, incorrect: 4, unattempted: 4, positive_marks: 68, negative_marks: 4, total_marks: 64, accuracy: 80.95, percentage: 64, time_spent_seconds: 0 },
      ],
      questions: [],
    };
    const jeeRes = await req('/api/uploads/confirm', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(jeePayload),
    });
    assert(jeeRes.status === 200 && jeeRes.body.id, 'JEE manual confirm failed');

    const hscPayload = {
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
    };
    const hscRes = await req('/api/uploads/confirm', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(hscPayload),
    });
    assert(hscRes.status === 200 && hscRes.body.subject_results.length === 6, 'HSC 6-subject manual entry failed');
    console.log('✓ 5. Manual JEE Main + HSC 6-subject entry passed');

    // 5. Dashboard & Test Comparison with user-entered tests
    const dashPop = await req('/api/analysis/dashboard', { headers: authHeaders });
    assert(dashPop.status === 200 && dashPop.body.total_tests === 2, `Expected 2 user-entered tests, got ${dashPop.body.total_tests}`);

    const compRes = await req('/api/predictions/compare', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_ids: [jeeRes.body.id, hscRes.body.id] }),
    });
    assert(compRes.status === 200 && compRes.body.primary_contributor, 'Multi-test comparison failed');
    console.log('✓ 6. Dashboard analytics & multi-test comparison passed');

    // 6. Multipart CSV Upload Extraction
    const sampleCsvPath = path.resolve(__dirname, '..', 'sample_tests', 'allen_mock_test_result.csv');
    if (fs.existsSync(sampleCsvPath)) {
      const csvBytes = fs.readFileSync(sampleCsvPath);
      const formData = new FormData();
      formData.append('file', new Blob([csvBytes], { type: 'text/csv' }), 'allen_mock_test_result.csv');
      const upRes = await fetch(`${baseUrl}/api/uploads/process`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const upBody = await upRes.json();
      assert(upRes.status === 200 && upBody.questions.length === 75, `CSV extraction failed`);
      console.log('✓ 7. CSV multipart upload & extraction (75 questions) passed');
    }

    // 7. Weak Topics Reminders & Study Planner Manual CRUD
    const addRem = await req('/api/analysis/reminders', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Physics', chapter_name: 'Optics Self Entry', marks_lost: -4, exam_type: 'JEE Main' }),
    });
    assert(addRem.status === 200 && addRem.body.id, 'Create weak topic reminder failed');
    const delRem = await req(`/api/analysis/reminders/${addRem.body.id}`, { method: 'DELETE', headers: authHeaders });
    assert(delRem.status === 200, 'Delete reminder failed');

    const addTaskRes = await req('/api/study-planner/tasks', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: 'Monday', subject: 'Computer Science 1 (CS 1)', chapter: 'C++ Data Structures', duration_hours: 1.5, practice_questions: 25 }),
    });
    assert(addTaskRes.status === 200 && addTaskRes.body.duration_minutes === 90, 'Add study task failed');
    const delTask = await req(`/api/study-planner/tasks/${addTaskRes.body.id}`, { method: 'DELETE', headers: authHeaders });
    assert(delTask.status === 200, 'Delete study task failed');

    const schedRes = await req('/api/study-planner/tests', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_title: 'Om Mock Notification', exam_type: 'JEE Main', scheduled_date: '2026-03-01', scheduled_time: '09:00 AM', duration_minutes: 180 }),
    });
    assert(schedRes.status === 200 && schedRes.body.id, 'Schedule test failed');
    const delSched = await req(`/api/study-planner/tests/${schedRes.body.id}`, { method: 'DELETE', headers: authHeaders });
    assert(delSched.status === 200, 'Delete scheduled test failed');
    console.log('✓ 8. Weak topic reminders & manual study planner + test notifications CRUD passed');

    // 8. Clean up temporary smoke tests so DB stays clean for Om Pal
    await req(`/api/tests/${jeeRes.body.id}`, { method: 'DELETE', headers: authHeaders });
    await req(`/api/tests/${hscRes.body.id}`, { method: 'DELETE', headers: authHeaders });
    const dashAfterClean = await req('/api/analysis/dashboard', { headers: authHeaders });
    assert(dashAfterClean.body.total_tests === 0, 'Test cleanup failed');
    console.log('✓ 9. Clean teardown leaving empty DB verified');

    console.log('\nALL MERN E2E SMOKE TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (localServer) {
      await new Promise((resolve) => localServer.close(resolve));
    }
    if (closeDBFn) {
      await closeDBFn();
    }
  }
}

runTests().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err);
  process.exit(1);
});
