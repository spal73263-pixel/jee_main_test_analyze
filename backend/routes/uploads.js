const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { UPLOAD_DIR } = require('../config/env');
const { parseUploadedFile } = require('../services/resultParser');

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

router.post('/process', (req, res) => {
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
      const fallbackName = path
        .parse(originalName)
        .name.replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
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
    } finally {
      fs.promises.unlink(filePath).catch(() => {});
    }
  });
});

module.exports = router;
