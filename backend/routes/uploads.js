const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { UPLOAD_DIR } = require('../config/env');
const { Test, SubjectResult, QuestionResult } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { parseUploadedFile } = require('../services/resultParser');
const { validateTestData, round2 } = require('../services/marksCalculator');
const { computeAndSaveTestAnalysis, buildTestDetail } = require('../services/performanceAnalyzer');
const { generateAIRecommendationReport } = require('../services/aiRecommendation');

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg']);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniquePrefix = crypto.randomBytes(12).toString('hex');
    const safeName = String(file.originalname || 'upload.dat').replace(/[^\w.-]/g, '_');
    cb(null, `${uniquePrefix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(String(file.originalname || '').toLowerCase());
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(
        `Unsupported file format '${ext}'. Allowed: PDF, PNG, JPG, CSV, Excel (XLSX/XLS).`
      );
      err.status = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

router.post('/process', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(uploadErr.status || 400).json({ detail: uploadErr.message });
    }
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    try {
      const preview = await parseUploadedFile(filePath, originalName);
      return res.json(preview);
    } catch (err) {
      const fallbackName = path.parse(originalName).name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return res.json({
        test_name: fallbackName,
        test_date: new Date().toISOString().split('T')[0],
        test_type: 'Mock Test',
        shift: 'Shift 1',
        duration_minutes: 180,
        total_questions: 75,
        max_marks: 300.0,
        marks_obtained: 0.0,
        official_percentile: null,
        official_rank: null,
        subjects: [
          { subject: 'Physics', total_questions: 25, attempted: 0, correct: 0, incorrect: 0, unattempted: 25, positive_marks: 0, negative_marks: 0, total_marks: 0, accuracy: 0, percentage: 0, time_spent_seconds: 0 },
          { subject: 'Chemistry', total_questions: 25, attempted: 0, correct: 0, incorrect: 0, unattempted: 25, positive_marks: 0, negative_marks: 0, total_marks: 0, accuracy: 0, percentage: 0, time_spent_seconds: 0 },
          { subject: 'Mathematics', total_questions: 25, attempted: 0, correct: 0, incorrect: 0, unattempted: 25, positive_marks: 0, negative_marks: 0, total_marks: 0, accuracy: 0, percentage: 0, time_spent_seconds: 0 },
        ],
        questions: [],
        extraction_source: 'Manual Fallback',
        confidence_level: 'partial',
        warnings: [
          `Automated extraction had difficulty reading formatting: ${err.message}. Please review the fields below.`,
        ],
        missing_fields: ['Automatic extraction failed; please review fields manually'],
        validation_status: 'needs_review',
      });
    }
  });
});

router.post('/confirm', requireAuth, async (req, res, next) => {
  try {
    const testIn = req.body || {};
    if (!testIn.test_name || !testIn.test_date) {
      return res.status(400).json({ detail: 'test_name and test_date are required.' });
    }

    validateTestData(testIn);

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

    const dbTest = await Test.create({
      user_id: req.user._id,
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
        testIn.official_percentile !== null && testIn.official_percentile !== undefined && testIn.official_percentile !== ''
          ? Number(testIn.official_percentile)
          : null,
      official_rank:
        testIn.official_rank !== null && testIn.official_rank !== undefined && testIn.official_rank !== ''
          ? Number(testIn.official_rank)
          : null,
      overall_accuracy: overallAcc,
      attempt_rate: attemptRate,
      notes: testIn.notes || null,
    });

    if (subjects.length > 0) {
      await SubjectResult.insertMany(
        subjects.map((sub) => ({
          test_id: dbTest._id,
          user_id: req.user._id,
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
        }))
      );
    }

    if (questions.length > 0) {
      await QuestionResult.insertMany(
        questions.map((q, idx) => ({
          test_id: dbTest._id,
          user_id: req.user._id,
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
        }))
      );
    }

    await computeAndSaveTestAnalysis(dbTest);
    await generateAIRecommendationReport(dbTest._id);

    const detail = await buildTestDetail(dbTest);
    return res.json(detail);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
