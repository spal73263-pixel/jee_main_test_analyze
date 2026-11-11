const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

let baseUrl = process.env.TEST_BASE_URL || '';

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function apiReq(endpoint, { token = null, method = 'GET', body = null, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }
  const init = { method, headers: finalHeaders };
  if (body !== null && body !== undefined) {
    if (typeof body === 'string' || body instanceof FormData) {
      init.body = body;
    } else {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
      init.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${baseUrl}${endpoint}`, init);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body: data };
}

async function runTests() {
  let localServer = null;
  let tempDbPath = null;
  let closeCloudStoreFn = null;

  try {
    // ------------------------------------------------------------------
    // Boot in-process Express server against an isolated temporary DB file
    // ------------------------------------------------------------------
    if (!baseUrl) {
      tempDbPath = path.join(os.tmpdir(), `jee_analyzer_e2e_${process.pid}_${Date.now()}.json`);
      process.env.LOCAL_DB_PATH = tempDbPath;

      const app = require('./server');
      ({ closeCloudStore: closeCloudStoreFn } = require('./services/cloudStore'));

      localServer = await new Promise((resolve) => {
        const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
      });
      const addr = localServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }

    console.log(`Running Multi-Phone Cloud Sync E2E Suite against ${baseUrl}...`);

    // 1. Health check & Cache-Control header check
    const health = await apiReq('/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'Health check should return 200 healthy');
    assert(health.body.cloud_sync_ready === true, `Expected cloud_sync_ready=true locally, got ${health.body.cloud_sync_ready}`);
    assert(
      String(health.headers.get('cache-control') || '').includes('no-store'),
      'Expected Cache-Control: no-store on /api responses for fresh mobile polling'
    );
    console.log(`✓ 1. Backend health & anti-cache headers passed (driver=${health.body.storage_driver})`);

    // 2. Vercel unconfigured storage guard (503 + setup_required)
    if (localServer) {
      const savedEnv = {
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        MONGODB_URI: process.env.MONGODB_URI,
        MONGO_URL: process.env.MONGO_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_URL_POOLED: process.env.DATABASE_URL_POOLED,
        POSTGRES_URL: process.env.POSTGRES_URL,
        POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        KV_REST_API_URL: process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      };
      try {
        process.env.VERCEL = '1';
        delete process.env.MONGODB_URI;
        delete process.env.MONGO_URL;
        delete process.env.DATABASE_URL;
        delete process.env.DATABASE_URL_POOLED;
        delete process.env.POSTGRES_URL;
        delete process.env.POSTGRES_PRISMA_URL;
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.KV_REST_API_URL;
        delete process.env.KV_REST_API_TOKEN;
        delete process.env.BLOB_READ_WRITE_TOKEN;

        const vHealth = await apiReq('/api/health');
        assert(
          vHealth.status === 200 && vHealth.body.requires_cloud_config === true && vHealth.body.cloud_sync_ready === false,
          'Expected requires_cloud_config=true when running on Vercel without cloud DB env vars'
        );

        const vLogin = await apiReq('/api/users/login', {
          method: 'POST',
          body: { email: 'demo@jeemain.ai', password: 'password123' },
        });
        assert(
          vLogin.status === 503 && vLogin.body.setup_required === true,
          `Expected 503 setup_required on unconfigured Vercel deployment, got ${vLogin.status}`
        );
      } finally {
        for (const [k, v] of Object.entries(savedEnv)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
      }
      console.log('✓ 2. Vercel unconfigured cloud-storage 503 guard passed');
    }

    // 3. Built React SPA & client-side deep routes
    const rootHtml = await fetch(`${baseUrl}/`);
    const htmlText = await rootHtml.text();
    assert(rootHtml.status === 200 && htmlText.includes('id="root"'), 'Built React SPA should be served on /');
    const hscRoute = await fetch(`${baseUrl}/hsc-revision`);
    assert(hscRoute.status === 200, 'SPA fallback route /hsc-revision should return 200');
    console.log('✓ 3. Built React SPA & deep routing verified');

    // 4. Protected routes reject unauthenticated requests
    const unauthTests = await apiReq('/api/tests');
    const unauthDash = await apiReq('/api/dashboard/overview');
    const unauthHsc = await apiReq('/api/hsc-revision');
    assert(
      unauthTests.status === 401 && unauthDash.status === 401 && unauthHsc.status === 401,
      'Protected endpoints must require Bearer token (401)'
    );
    console.log('✓ 4. Auth protection (401 without Bearer token) verified');

    // 5. Multipart CSV upload extraction + browser CSV fallback sanity check
    const sampleCsvPath = path.resolve(__dirname, '..', 'sample_tests', 'allen_mock_test_result.csv');
    let sampleCsvBytes = null;
    if (fs.existsSync(sampleCsvPath)) {
      sampleCsvBytes = fs.readFileSync(sampleCsvPath);
      const formData = new FormData();
      formData.append('file', new Blob([sampleCsvBytes], { type: 'text/csv' }), 'allen_mock_test_result.csv');
      const upRes = await fetch(`${baseUrl}/api/uploads/process`, { method: 'POST', body: formData });
      const upBody = await upRes.json();
      assert(upRes.status === 200 && upBody.questions.length === 75, 'Multipart CSV upload extraction failed');

      const { parseCsvTextInBrowser } = await import(
        pathToFileURL(path.resolve(__dirname, '..', 'frontend', 'src', 'utils', 'csvFallback.js')).href
      );
      const fallbackParsed = parseCsvTextInBrowser(sampleCsvBytes.toString('utf8'), 'allen_mock_test_result.csv');
      assert(fallbackParsed.questions.length === 75, 'Browser CSV fallback helper failed');
      console.log('✓ 5. Multipart CSV upload & CSV fallback parser (75 questions) passed');
    }

    // ==================================================================
    // PART 2: MULTI-PHONE SYNC SIMULATION (PHONE A -> PARENTS' PHONE B)
    // ==================================================================

    // 6. Phone A logs into Om Pal & verifies clean initial workspace
    const phoneALogin = await apiReq('/api/users/login', {
      method: 'POST',
      body: { email: 'demo@jeemain.ai', password: 'password123' },
    });
    assert(phoneALogin.status === 200 && phoneALogin.body.access_token, 'Phone A Om Pal login failed');
    assert(phoneALogin.body.user.full_name === 'Om Pal', `Expected Om Pal, got ${phoneALogin.body.user.full_name}`);
    const phoneAToken = phoneALogin.body.access_token;

    const dashInit = await apiReq('/api/dashboard/overview', { token: phoneAToken });
    assert(dashInit.status === 200 && dashInit.body.total_tests === 0, 'Expected 0 initial tests for clean Om Pal');
    const planInit = await apiReq('/api/planner/plan', { token: phoneAToken });
    assert(Array.isArray(planInit.body.tasks) && planInit.body.tasks.length === 0, 'Expected 0 initial study tasks');
    const hscInit = await apiReq('/api/hsc-revision', { token: phoneAToken });
    assert(Array.isArray(hscInit.body) && hscInit.body.length === 0, 'Expected 0 initial HSC chapters');
    console.log('✓ 6. Phone A signed into clean Om Pal workspace (0 seeded items)');

    // 7. Phone A enters JEE Main + JEE Advanced tests, Weak Reminder, Study Task, Scheduled Mock, HSC Chapters & Profile Update
    const jee1Res = await apiReq('/api/uploads/confirm', {
      token: phoneAToken,
      method: 'POST',
      body: {
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
      },
    });
    assert(jee1Res.status === 201 && jee1Res.body.id && jee1Res.body.ai_recommendation?.overall_summary, 'Phone A JEE Main confirm failed');

    const jee2Res = await apiReq('/api/uploads/confirm', {
      token: phoneAToken,
      method: 'POST',
      body: {
        test_name: 'Self Entered JEE Advanced 1',
        test_date: '2026-02-08',
        test_type: 'JEE Advanced',
        shift: 'Shift 1',
        duration_minutes: 180,
        total_questions: 54,
        max_marks: 360,
        marks_obtained: 234,
        subjects: [
          { subject: 'Physics', total_questions: 18, attempted: 15, correct: 13, incorrect: 2, unattempted: 3, positive_marks: 80, negative_marks: 2, total_marks: 78, accuracy: 86.67, percentage: 65, time_spent_seconds: 0 },
          { subject: 'Chemistry', total_questions: 18, attempted: 16, correct: 14, incorrect: 2, unattempted: 2, positive_marks: 86, negative_marks: 2, total_marks: 84, accuracy: 87.5, percentage: 70, time_spent_seconds: 0 },
          { subject: 'Mathematics', total_questions: 18, attempted: 14, correct: 12, incorrect: 2, unattempted: 4, positive_marks: 74, negative_marks: 2, total_marks: 72, accuracy: 85.71, percentage: 60, time_spent_seconds: 0 },
        ],
        questions: [],
      },
    });
    assert(jee2Res.status === 201 && jee2Res.body.id, 'Phone A JEE Advanced confirm failed');

    const remRes = await apiReq('/api/dashboard/reminders', {
      token: phoneAToken,
      method: 'POST',
      body: { subject: 'Physics', chapter_name: 'Rotational Motion', marks_lost: -8, exam_type: 'JEE Main', notes: 'Revise moment of inertia' },
    });
    assert(remRes.status === 201 && remRes.body.id, 'Phone A add reminder failed');
    await apiReq(`/api/dashboard/reminders/${remRes.body.id}/toggle`, { token: phoneAToken, method: 'PATCH' });

    await apiReq('/api/planner/regenerate', { token: phoneAToken, method: 'POST' });
    const taskRes = await apiReq('/api/planner/tasks', {
      token: phoneAToken,
      method: 'POST',
      body: { day_of_week: 'Sunday', subject: 'Physics', chapter: 'Electrostatics PYQs', duration_hours: 2, practice_questions: 30 },
    });
    assert(taskRes.status === 201 && taskRes.body.id, 'Phone A add study task failed');

    const schedRes = await apiReq('/api/planner/scheduled-tests', {
      token: phoneAToken,
      method: 'POST',
      body: { test_title: 'Parents Review Mock 1', exam_type: 'JEE Main', scheduled_date: '2026-03-10', scheduled_time: '09:00 AM', duration_minutes: 180 },
    });
    assert(schedRes.status === 201 && schedRes.body.id, 'Phone A schedule test failed');

    const hscSubjects = ['Physics', 'Maths', 'English', 'Chemistry', 'CS'];
    const hscIds = [];
    for (const sub of hscSubjects) {
      const added = await apiReq('/api/hsc-revision', {
        token: phoneAToken,
        method: 'POST',
        body: { subject: sub, chapter_name: `${sub} Completed Ch 1`, notes: 'Board revision done' },
      });
      assert(added.status === 201 && added.body.id, `Phone A add HSC ${sub} failed`);
      hscIds.push(added.body.id);
    }
    const bumpedHsc = await apiReq(`/api/hsc-revision/${hscIds[0]}/increment`, { token: phoneAToken, method: 'PATCH' });
    assert(bumpedHsc.status === 200 && bumpedHsc.body.revision_count === 2, 'Phone A HSC increment failed');

    const profRes = await apiReq('/api/users/profile', {
      token: phoneAToken,
      method: 'PUT',
      body: { full_name: 'Om Pal (Class 12)' },
    });
    assert(profRes.status === 200 && profRes.body.full_name === 'Om Pal (Class 12)', 'Phone A profile update failed');
    console.log('✓ 7. Phone A entered tests, reminders, planner, HSC revision chapters & profile edit');

    // 8. Phone B (Parents' Phone) signs in independently with zero shared client state
    const phoneBLogin = await apiReq('/api/users/login', {
      method: 'POST',
      body: { email: 'demo@jeemain.ai', password: 'password123' },
    });
    assert(phoneBLogin.status === 200 && phoneBLogin.body.access_token, 'Phone B login failed');
    assert(phoneBLogin.body.user.full_name === 'Om Pal (Class 12)', 'Phone B did not receive updated profile name');
    const phoneBToken = phoneBLogin.body.access_token;

    const phoneBDash = await apiReq('/api/dashboard/overview', { token: phoneBToken });
    assert(phoneBDash.body.total_tests === 2, `Phone B expected 2 tests, got ${phoneBDash.body.total_tests}`);
    assert(phoneBDash.body.highest_marks === 234, `Phone B expected highest_marks=234, got ${phoneBDash.body.highest_marks}`);
    assert(phoneBDash.body.latest_test_score === 234, `Phone B expected latest_test_score=234, got ${phoneBDash.body.latest_test_score}`);

    const phoneBTests = await apiReq('/api/tests', { token: phoneBToken });
    assert(phoneBTests.body.length === 2, 'Phone B test history mismatch');

    const phoneBTime = await apiReq(`/api/tests/${jee1Res.body.id}/time-analytics`, { token: phoneBToken });
    assert(phoneBTime.body.has_question_level_timing && phoneBTime.body.excessive_time_questions_count === 1, 'Phone B time analytics mismatch');

    const phoneBWeak = await apiReq('/api/dashboard/weak-topics', { token: phoneBToken });
    assert(phoneBWeak.body.weak_topics.length >= 1, 'Phone B weak topics missing');

    const phoneBRems = await apiReq('/api/dashboard/reminders', { token: phoneBToken });
    assert(
      phoneBRems.body.length === 1 && phoneBRems.body[0].is_resolved === true,
      'Phone B did not see Phone A reminder state'
    );

    const phoneBSubjects = await apiReq('/api/subjects/breakdown?subject=Physics', { token: phoneBToken });
    assert(phoneBSubjects.body.chapters.length >= 1, 'Phone B subject breakdown mismatch');

    const phoneBPlan = await apiReq('/api/planner/plan', { token: phoneBToken });
    assert(
      phoneBPlan.body.tasks.some((t) => t.chapter === 'Electrostatics PYQs') &&
        phoneBPlan.body.tasks.some((t) => t.chapter === 'Rotational Motion'),
      'Phone B did not see Phone A study plan tasks'
    );

    const phoneBSched = await apiReq('/api/planner/scheduled-tests', { token: phoneBToken });
    assert(phoneBSched.body.length === 1 && phoneBSched.body[0].test_title === 'Parents Review Mock 1', 'Phone B scheduled tests mismatch');

    const phoneBHsc = await apiReq('/api/hsc-revision', { token: phoneBToken });
    assert(phoneBHsc.body.length === 5, `Phone B expected 5 HSC chapters, got ${phoneBHsc.body.length}`);
    const phoneBPhysHsc = phoneBHsc.body.find((c) => c.id === hscIds[0]);
    assert(phoneBPhysHsc && phoneBPhysHsc.revision_count === 2, 'Phone B HSC revision count mismatch');

    const phoneBCompare = await apiReq('/api/predictions/compare', {
      token: phoneBToken,
      method: 'POST',
      body: { test_ids: [jee1Res.body.id, jee2Res.body.id] },
    });
    assert(phoneBCompare.status === 200 && phoneBCompare.body.primary_contributor, 'Phone B comparison failed');

    const phoneBTarget = await apiReq('/api/predictions/target-analysis', { token: phoneBToken });
    assert(phoneBTarget.status === 200 && phoneBTarget.body.progression_milestones.length > 0, 'Phone B target analysis failed');
    console.log("✓ 8. Phone B (Parents' Phone) verified EXACT SAME live dashboard, tests, HSC revisions & planner!");

    // 9. Mutation / deletion sync from Phone A -> Phone B
    await apiReq(`/api/tests/${jee2Res.body.id}`, { token: phoneAToken, method: 'DELETE' });
    await apiReq(`/api/hsc-revision/${hscIds[4]}`, { token: phoneAToken, method: 'DELETE' });
    await apiReq('/api/users/profile', { token: phoneAToken, method: 'PUT', body: { full_name: 'Om Pal' } });

    const phoneBAfterDelDash = await apiReq('/api/dashboard/overview', { token: phoneBToken });
    const phoneBAfterDelHsc = await apiReq('/api/hsc-revision', { token: phoneBToken });
    assert(phoneBAfterDelDash.body.total_tests === 1, 'Phone B did not reflect Phone A test deletion');
    assert(phoneBAfterDelHsc.body.length === 4, 'Phone B did not reflect Phone A HSC deletion');
    console.log('✓ 9. Cross-phone delete & update synchronization verified');

    // 10. Multi-student registration, isolation & forgot/reset password flow
    const regRes = await apiReq('/api/users/register', {
      method: 'POST',
      body: { email: 'student2@jeemain.ai', password: 'secret123', full_name: 'Student Two' },
    });
    assert(regRes.status === 201 && regRes.body.access_token, 'Student Two registration failed');
    const student2Token = regRes.body.access_token;

    const student2Dash = await apiReq('/api/dashboard/overview', { token: student2Token });
    const student2Hsc = await apiReq('/api/hsc-revision', { token: student2Token });
    assert(student2Dash.body.total_tests === 0 && student2Hsc.body.length === 0, 'Data isolation leak between accounts!');

    const forgotRes = await apiReq('/api/users/forgot-password', {
      method: 'POST',
      body: { email: 'student2@jeemain.ai' },
    });
    assert(forgotRes.status === 200 && forgotRes.body.reset_token, 'Forgot password reset token failed');

    const resetRes = await apiReq('/api/users/reset-password', {
      method: 'POST',
      body: { token: forgotRes.body.reset_token, new_password: 'newpassword123' },
    });
    assert(resetRes.status === 200, 'Reset password failed');

    const relogin = await apiReq('/api/users/login', {
      method: 'POST',
      body: { email: 'student2@jeemain.ai', password: 'newpassword123' },
    });
    assert(relogin.status === 200 && relogin.body.user.full_name === 'Student Two', 'Re-login after password reset failed');
    console.log('✓ 10. Multi-user data isolation & password reset flow passed');

    console.log('\nALL MULTI-PHONE CLOUD SYNC & FULL-STACK E2E TESTS PASSED!');
  } finally {
    if (closeCloudStoreFn) {
      await closeCloudStoreFn().catch(() => {});
    }
    if (localServer) {
      if (typeof localServer.closeAllConnections === 'function') {
        localServer.closeAllConnections();
      }
      await new Promise((resolve) => localServer.close(resolve));
    }
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }
}

runTests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
