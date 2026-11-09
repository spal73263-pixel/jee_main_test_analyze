const fs = require('fs');
const path = require('path');
const { parse: parseCsvSync } = require('csv-parse/sync');
const XLSX = require('xlsx');
const { extractTextAndTablesFromPdf } = require('./pdfExtractor');
const { extractTextFromImage } = require('./ocrService');
const { calculateSubjectMetrics, round2 } = require('./marksCalculator');

function normalizeSubject(rawSub, qNum) {
  const s = String(rawSub || '').trim().toLowerCase();
  if (s.includes('phy')) return 'Physics';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('math') || s.includes('mat')) return 'Mathematics';

  if (qNum >= 1 && qNum <= 25) return 'Physics';
  if (qNum >= 26 && qNum <= 50) return 'Chemistry';
  if (qNum >= 51 && qNum <= 75) return 'Mathematics';
  return 'Physics';
}

function guessChapter(subject, qNum) {
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

function formatBaseName(filename) {
  const parsed = path.parse(filename || 'Uploaded_Test');
  return parsed.name
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

function parseSubjectsFromRawText(text) {
  const subjects = [];
  const patterns = [
    ['Physics', /Physics[^\d]*?(\d+)[^\d]+(\d+)[^\d]+(\d+)/i],
    ['Chemistry', /Chemistry[^\d]*?(\d+)[^\d]+(\d+)[^\d]+(\d+)/i],
    ['Mathematics', /(?:Mathematics|Maths|Math)[^\d]*?(\d+)[^\d]+(\d+)[^\d]+(\d+)/i],
  ];

  for (const [name, pat] of patterns) {
    const match = String(text || '').match(pat);
    if (match) {
      const corr = parseInt(match[1], 10);
      const inc = parseInt(match[2], 10);
      const marks = parseFloat(match[3]);
      const att = corr + inc;
      if (!Number.isNaN(corr) && !Number.isNaN(inc) && !Number.isNaN(marks)) {
        subjects.push({
          subject: name,
          total_questions: 25,
          attempted: att,
          correct: corr,
          incorrect: inc,
          unattempted: Math.max(0, 25 - att),
          positive_marks: corr * 4.0,
          negative_marks: inc * 1.0,
          total_marks: marks,
          accuracy: att > 0 ? round2((corr / att) * 100) : 0.0,
          percentage: round2((marks / 100.0) * 100),
          time_spent_seconds: 3600,
        });
      }
    }
  }

  if (subjects.length < 3) {
    const existingNames = new Set(subjects.map((s) => s.subject));
    for (const name of ['Physics', 'Chemistry', 'Mathematics']) {
      if (!existingNames.has(name)) {
        subjects.push({
          subject: name,
          total_questions: 25,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 25,
          positive_marks: 0.0,
          negative_marks: 0.0,
          total_marks: 0.0,
          accuracy: 0.0,
          percentage: 0.0,
          time_spent_seconds: 0,
        });
      }
    }
  }

  return subjects;
}

function parseRowsToPreview(rows, filename, source) {
  const normalizedRows = (rows || []).map((row) => {
    const next = {};
    for (const [key, val] of Object.entries(row || {})) {
      const normKey = String(key).trim().toLowerCase().replace(/\s+/g, '_').replace(/\./g, '');
      next[normKey] = val;
    }
    return next;
  });

  const columns = normalizedRows.length > 0 ? Object.keys(normalizedRows[0]) : [];
  const qCols = ['question', 'q_no', 'qno', 'question_number', 'q_num', 'qid'];
  const matchedQCol = columns.find((c) => qCols.some((q) => c.includes(q)));

  const subCols = ['subject', 'sub', 'subject_name'];
  const matchedSubCol = columns.find((c) => subCols.includes(c));

  const testName = formatBaseName(filename);
  const testDate = todayIsoDate();
  const questions = [];
  const subjects = [];
  const warnings = [];
  const missingFields = [];

  if (matchedQCol) {
    normalizedRows.forEach((row, idx) => {
      const rawQ = row[matchedQCol];
      const qNum = rawQ !== undefined && rawQ !== '' && !Number.isNaN(Number(rawQ))
        ? parseInt(rawQ, 10)
        : idx + 1;

      const rawSub = String(row.subject || row.sub || '').trim();
      const subject = normalizeSubject(rawSub, qNum);

      let chapter = String(row.chapter || row.topic || row.unit || '').trim();
      if (!chapter || ['nan', 'none', 'undefined'].includes(chapter.toLowerCase())) {
        chapter = guessChapter(subject, qNum);
      }

      const topic = row.topic && String(row.topic).trim() !== '' ? String(row.topic).trim() : null;

      const rawStatus = String(row.status || row.result || '').trim();
      const capStatus = rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase() : '';
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
      const timeCol = columns.find((c) => c.includes('time'));
      if (timeCol && row[timeCol] !== undefined && row[timeCol] !== '' && !Number.isNaN(Number(row[timeCol]))) {
        timeVal = parseInt(parseFloat(row[timeCol]), 10);
      }

      const rawDiff = String(row.difficulty || 'Medium').trim().toLowerCase();
      const diffCap = rawDiff.charAt(0).toUpperCase() + rawDiff.slice(1);
      const difficulty = ['Easy', 'Medium', 'Hard'].includes(diffCap) ? diffCap : 'Medium';
      const qType = String(row.question_type || row.type || 'MCQ').trim() || 'MCQ';

      questions.push({
        question_number: qNum,
        subject,
        chapter,
        topic,
        question_type: qType,
        difficulty,
        selected_answer: selected && selected.toLowerCase() !== 'nan' ? selected : null,
        correct_answer: correctAns && correctAns.toLowerCase() !== 'nan' ? correctAns : null,
        status,
        marks,
        time_spent_seconds: timeVal,
      });
    });

    for (const subName of ['Physics', 'Chemistry', 'Mathematics']) {
      subjects.push(calculateSubjectMetrics(questions, subName));
    }
  } else if (matchedSubCol) {
    for (const row of normalizedRows) {
      const subName = normalizeSubject(row[matchedSubCol], 0);
      if (!['Physics', 'Chemistry', 'Mathematics'].includes(subName)) continue;

      const totQ = parseInt(row.total_questions || row.total || 25, 10) || 25;
      const att = parseInt(row.attempted || 0, 10) || 0;
      const corr = parseInt(row.correct || 0, 10) || 0;
      const inc = row.incorrect !== undefined ? parseInt(row.incorrect, 10) : Math.max(0, att - corr);
      const unatt = row.unattempted !== undefined ? parseInt(row.unattempted, 10) : Math.max(0, totQ - att);
      const posM = row.positive_marks !== undefined ? parseFloat(row.positive_marks) : corr * 4.0;
      const negM = row.negative_marks !== undefined ? parseFloat(row.negative_marks) : inc * 1.0;
      const totM =
        row.total_marks !== undefined
          ? parseFloat(row.total_marks)
          : row.marks !== undefined
          ? parseFloat(row.marks)
          : posM - negM;
      const acc = att > 0 ? round2((corr / att) * 100) : 0.0;
      const pct = totQ > 0 ? round2((totM / (totQ * 4.0)) * 100) : 0.0;
      const timeVal = parseInt(row.time_spent_seconds || row.time_spent || 0, 10) || 0;

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
        accuracy: acc,
        percentage: pct,
        time_spent_seconds: timeVal,
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
    test_name: testName,
    test_date: testDate,
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
    extraction_source: source,
    confidence_level: questions.length > 0 ? 'high' : 'medium',
    warnings,
    missing_fields: missingFields,
    validation_status: warnings.length === 0 ? 'valid' : 'needs_review',
  };
}

async function parseCsvFile(filePath, filename) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsvSync(rawContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return parseRowsToPreview(rows, filename, 'CSV Spreadsheet');
}

async function parseExcelFile(filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('Workbook contains no sheets');
  }

  let targetSheet = sheetNames[0];
  for (const s of sheetNames) {
    if (s.toLowerCase().includes('question')) {
      targetSheet = s;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheet];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (!rows || rows.length === 0 || (rows.length === 1 && Object.keys(rows[0]).length <= 1)) {
    return {
      test_name: formatBaseName(filename),
      test_date: todayIsoDate(),
      test_type: 'Mock Test',
      shift: 'Shift 1',
      duration_minutes: 180,
      total_questions: 75,
      max_marks: 300.0,
      marks_obtained: 0.0,
      official_percentile: null,
      official_rank: null,
      subjects: parseSubjectsFromRawText(''),
      questions: [],
      extraction_source: `Excel Spreadsheet (${targetSheet})`,
      confidence_level: 'partial',
      warnings: ['Uploaded file had minimal structured rows; enter your actual subject marks below before saving.'],
      missing_fields: ['Please enter subject scores before saving'],
      validation_status: 'needs_review',
    };
  }

  return parseRowsToPreview(rows, filename, `Excel Spreadsheet (${targetSheet})`);
}

async function parsePdfFile(filePath, filename) {
  const pdfRes = await extractTextAndTablesFromPdf(filePath);
  const rawText = pdfRes.raw_text || '';
  const tables = pdfRes.tables || [];

  let testName = formatBaseName(filename);
  let testDate = todayIsoDate();
  let shift = 'Shift 1';
  let percentile = null;
  let rank = null;
  const warnings = [];
  const missingFields = [];

  const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/);
  if (dateMatch) testDate = dateMatch[1];

  const nameMatch = rawText.match(/(?:Test Name|Exam Name|Examination|Mock Test)[:\s]+([^\n\r]+)/i);
  if (nameMatch) testName = nameMatch[1].trim();

  const shiftMatch = rawText.match(/(?:Shift|Session)[:\s]+([^\n\r]+)/i);
  if (shiftMatch) shift = shiftMatch[1].trim();

  const pctMatch = rawText.match(/(?:Percentile|NTA Score)[:\s]+(\d+(?:\.\d+)?)/i);
  if (pctMatch) percentile = parseFloat(pctMatch[1]);

  const rankMatch = rawText.match(/(?:AIR|Rank|Overall Rank)[:\s]+(\d+)/i);
  if (rankMatch) rank = parseInt(rankMatch[1], 10);

  const questions = [];
  const subjects = [];

  for (const table of tables) {
    if (!table || table.length < 2) continue;
    const header = table[0].map((c) => String(c).toLowerCase());

    if (
      header.some((h) => h.includes('q') || h.includes('question')) &&
      header.some((h) => h.includes('status') || h.includes('ans') || h.includes('mark'))
    ) {
      const qIdx = header.findIndex((h) => h.includes('q'));
      const subIdx = header.findIndex((h) => h.includes('sub'));
      const statIdx = header.findIndex((h) => h.includes('stat') || h.includes('result'));
      const markIdx = header.findIndex((h) => h.includes('mark') || h.includes('score'));
      const timeIdx = header.findIndex((h) => h.includes('time'));

      table.slice(1).forEach((row, rIdx) => {
        const qVal = qIdx >= 0 && row[qIdx] ? parseInt(row[qIdx], 10) : rIdx + 1;
        const qNum = !Number.isNaN(qVal) ? qVal : rIdx + 1;
        const rawSub = subIdx >= 0 && row[subIdx] ? row[subIdx] : '';
        const subject = normalizeSubject(rawSub, qNum);

        const rawStat = statIdx >= 0 && row[statIdx] ? row[statIdx].toLowerCase() : '';
        const status = rawStat.includes('corr') || rawStat.includes('right')
          ? 'Correct'
          : rawStat.includes('incorr') || rawStat.includes('wrong')
          ? 'Incorrect'
          : 'Unattempted';

        let marks = status === 'Correct' ? 4.0 : status === 'Incorrect' ? -1.0 : 0.0;
        if (markIdx >= 0 && row[markIdx] && !Number.isNaN(Number(row[markIdx]))) {
          marks = parseFloat(row[markIdx]);
        }

        let timeS = 0;
        if (timeIdx >= 0 && row[timeIdx] && !Number.isNaN(Number(row[timeIdx]))) {
          timeS = parseInt(parseFloat(row[timeIdx]), 10);
        }

        questions.push({
          question_number: qNum,
          subject,
          chapter: guessChapter(subject, qNum),
          question_type: 'MCQ',
          difficulty: 'Medium',
          status,
          marks,
          time_spent_seconds: timeS,
        });
      });
    }
  }

  if (questions.length > 0 && subjects.length === 0) {
    for (const s of ['Physics', 'Chemistry', 'Mathematics']) {
      subjects.push(calculateSubjectMetrics(questions, s));
    }
  }

  if (subjects.length === 0) {
    subjects.push(...parseSubjectsFromRawText(rawText));
  }

  if (questions.length === 0) {
    missingFields.push('Question-level tabular information was not present in this PDF');
  }

  const totalMarksObtained = subjects.reduce((acc, s) => acc + Number(s.total_marks || 0), 0);
  const totalQ = subjects.reduce((acc, s) => acc + Number(s.total_questions || 0), 0) || 75;

  return {
    test_name: testName,
    test_date: testDate,
    test_type: 'Mock Test',
    shift,
    duration_minutes: 180,
    total_questions: totalQ,
    max_marks: totalQ * 4.0,
    marks_obtained: totalMarksObtained,
    official_percentile: percentile,
    official_rank: rank,
    subjects,
    questions,
    extraction_source: 'PDF Document Parser',
    confidence_level: subjects.length === 3 ? 'high' : 'partial',
    warnings,
    missing_fields: missingFields,
    validation_status: warnings.length === 0 ? 'valid' : 'needs_review',
  };
}

async function parseImageFile(filePath, filename) {
  const ocrRes = await extractTextFromImage(filePath);
  const rawText = ocrRes.text || '';
  const warnings = [];
  const missingFields = ['Question-level breakdown not detectable from screenshot OCR'];

  if (ocrRes.error) {
    warnings.push(`OCR Note: ${ocrRes.error}. Verification preview is ready for manual review.`);
  }

  const subjects = parseSubjectsFromRawText(rawText);
  const totalMarks = subjects.reduce((acc, s) => acc + Number(s.total_marks || 0), 0);

  return {
    test_name: formatBaseName(filename),
    test_date: todayIsoDate(),
    test_type: 'Mock Test',
    shift: 'Shift 1',
    duration_minutes: 180,
    total_questions: 75,
    max_marks: 300.0,
    marks_obtained: totalMarks,
    official_percentile: null,
    official_rank: null,
    subjects,
    questions: [],
    extraction_source: 'OCR Screenshot Extraction',
    confidence_level: warnings.length > 0 ? 'partial' : 'medium',
    warnings,
    missing_fields: missingFields,
    validation_status: 'needs_review',
  };
}

async function parseUploadedFile(filePath, originalFilename) {
  const ext = path.extname(String(originalFilename || '').toLowerCase());
  if (ext === '.csv') return parseCsvFile(filePath, originalFilename);
  if (ext === '.xlsx' || ext === '.xls') return parseExcelFile(filePath, originalFilename);
  if (ext === '.pdf') return parsePdfFile(filePath, originalFilename);
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return parseImageFile(filePath, originalFilename);
  throw new Error(`Unsupported file format: ${ext}`);
}

module.exports = {
  parseUploadedFile,
  normalizeSubject,
  guessChapter,
};
