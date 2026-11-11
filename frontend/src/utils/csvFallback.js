function round2(val) {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

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
    const err = new Error('CSV file has no data rows.');
    err.response = { status: 400, data: { detail: 'CSV file has no data rows.' } };
    throw err;
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
      const totM =
        row.total_marks !== undefined
          ? parseFloat(row.total_marks)
          : row.marks !== undefined
          ? parseFloat(row.marks)
          : posM - negM;
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
