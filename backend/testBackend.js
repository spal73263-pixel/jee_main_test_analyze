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

  // 2. Demo Login
  const login = await req('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@jeemain.ai', password: 'password123' }),
  });
  assert(login.status === 200 && login.body.access_token, 'Demo login should succeed with token');
  const token = login.body.access_token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  assert(login.body.user?.profile?.target_year === 2026, 'User profile should be attached');
  console.log('✓ 3. Demo student login & JWT verification passed');

  // 3. Dashboard Overview
  const dash = await req('/api/analysis/dashboard', { headers: authHeaders });
  assert(dash.status === 200 && dash.body.total_tests >= 5, `Expected >=5 seeded tests, got ${dash.body.total_tests}`);
  assert(Array.isArray(dash.body.marks_history) && dash.body.marks_history.length >= 5, 'Marks history present');
  console.log('✓ 4. Dashboard overview analytics passed');

  // 4. List Tests & Get Detail
  const testsRes = await req('/api/tests', { headers: authHeaders });
  assert(testsRes.status === 200 && testsRes.body.length >= 5, 'Should return seeded tests');
  const firstTwoIds = testsRes.body.slice(0, 2).map((t) => t.id);

  const detailRes = await req(`/api/tests/${firstTwoIds[0]}`, { headers: authHeaders });
  assert(detailRes.status === 200, 'Test detail should return 200');
  assert(detailRes.body.subject_results.length === 3, 'Should have 3 subject results');
  assert(detailRes.body.question_results.length === 75, 'Should have 75 question results');
  assert(detailRes.body.ai_recommendation?.overall_summary, 'Should include 12-point AI recommendation');
  console.log('✓ 5. Test list, detail, questions & AI report passed');

  // 5. Manual HSC 6-Subject Entry + Delete Cleanup
  const hscPayload = {
    test_name: 'HSC Smoke Verify Exam',
    test_date: '2026-02-01',
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

  const hscConfirm = await req('/api/uploads/confirm', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(hscPayload),
  });
  assert(hscConfirm.status === 200, `HSC manual save failed: ${JSON.stringify(hscConfirm.body)}`);
  assert(hscConfirm.body.subject_results.length === 6, 'Should save all 6 HSC subjects');
  assert(hscConfirm.body.chapter_performances.length === 6, 'Should create 6 subject chapter summaries');

  const delHsc = await req(`/api/tests/${hscConfirm.body.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert(delHsc.status === 200, 'Delete HSC test should succeed');
  console.log('✓ 6. HSC 6-subject manual entry + AI diagnostics + deletion passed');

  // 6. Multipart CSV Upload Extraction Test
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
    assert(upRes.status === 200 && upBody.questions.length === 75, `CSV extraction failed: ${JSON.stringify(upBody)}`);
    console.log('✓ 7. CSV multipart upload & extraction (75 questions) passed');
  }

  // 7. Weak Topics & Reminders CRUD
  const weakRes = await req('/api/analysis/weak-topics', { headers: authHeaders });
  assert(weakRes.status === 200 && Array.isArray(weakRes.body.weak_topics), 'Weak topics endpoint passed');

  const addRem = await req('/api/analysis/reminders', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: 'Physics', chapter_name: 'Optics Verify', marks_lost: -4, exam_type: 'JEE Main' }),
  });
  assert(addRem.status === 200 && addRem.body.id, 'Create weak topic reminder failed');
  const toggleRem = await req(`/api/analysis/reminders/${addRem.body.id}/toggle`, { method: 'PUT', headers: authHeaders });
  assert(toggleRem.status === 200 && toggleRem.body.is_resolved === true, 'Toggle reminder failed');
  const delRem = await req(`/api/analysis/reminders/${addRem.body.id}`, { method: 'DELETE', headers: authHeaders });
  assert(delRem.status === 200, 'Delete reminder failed');
  console.log('✓ 8. Weak topics analytics & reminders CRUD passed');

  // 8. Multi-Test Comparison
  const compRes = await req('/api/predictions/compare', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_ids: firstTwoIds }),
  });
  assert(compRes.status === 200 && compRes.body.primary_contributor, 'Multi-test comparison failed');
  console.log('✓ 9. Multi-test comparison engine passed');

  // 9. Study Planner Tasks & Scheduled Tests CRUD
  const planRes = await req('/api/study-planner', { headers: authHeaders });
  assert(planRes.status === 200 && planRes.body.tasks.length >= 7, 'Study planner should auto-generate 7 tasks');

  const addTaskRes = await req('/api/study-planner/tasks', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ day_of_week: 'Monday', subject: 'Chemistry', chapter: 'Electrochemistry', duration_hours: 1.5, practice_questions: 30 }),
  });
  assert(addTaskRes.status === 200 && addTaskRes.body.duration_minutes === 90, 'Add custom study task failed');

  const togTask = await req(`/api/study-planner/tasks/${addTaskRes.body.id}/toggle`, { method: 'PUT', headers: authHeaders });
  assert(togTask.status === 200 && togTask.body.is_completed === true, 'Toggle study task failed');

  const delTask = await req(`/api/study-planner/tasks/${addTaskRes.body.id}`, { method: 'DELETE', headers: authHeaders });
  assert(delTask.status === 200, 'Delete study task failed');

  const schedRes = await req('/api/study-planner/tests', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_title: 'Smoke Mock Reminder', exam_type: 'JEE Main', scheduled_date: '2026-03-01', scheduled_time: '09:00 AM', duration_minutes: 180 }),
  });
  assert(schedRes.status === 200 && schedRes.body.id, 'Schedule test failed');
  const togSched = await req(`/api/study-planner/tests/${schedRes.body.id}/toggle`, { method: 'PUT', headers: authHeaders });
  assert(togSched.status === 200 && togSched.body.is_completed === true, 'Toggle scheduled test failed');
  const delSched = await req(`/api/study-planner/tests/${schedRes.body.id}`, { method: 'DELETE', headers: authHeaders });
  assert(delSched.status === 200, 'Delete scheduled test failed');
  console.log('✓ 10. Study planner tasks & scheduled mock test notifications CRUD passed');

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
