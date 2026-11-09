const JEE_CHAPTER_UNIT_MAP = {
  // Physics
  'Units and Measurements': ['Physics', 'Units & Measurements'],
  Kinematics: ['Physics', 'Mechanics'],
  'Laws of Motion': ['Physics', 'Mechanics'],
  'Work, Energy and Power': ['Physics', 'Mechanics'],
  'Rotational Motion': ['Physics', 'Mechanics'],
  Gravitation: ['Physics', 'Mechanics'],
  'Properties of Solids and Liquids': ['Physics', 'Mechanics'],
  Thermodynamics: ['Physics', 'Thermodynamics'],
  'Kinetic Theory of Gases': ['Physics', 'Thermodynamics'],
  'Oscillations and Waves': ['Physics', 'Waves and Oscillations'],
  Electrostatics: ['Physics', 'Electrodynamics'],
  'Current Electricity': ['Physics', 'Electrodynamics'],
  'Magnetic Effects of Current and Magnetism': ['Physics', 'Electrodynamics'],
  'Magnetic Effects of Current': ['Physics', 'Electrodynamics'],
  'Electromagnetic Induction and AC': ['Physics', 'Electrodynamics'],
  'Electromagnetic Waves': ['Physics', 'Electrodynamics'],
  Optics: ['Physics', 'Optics'],
  'Dual Nature of Matter and Radiation': ['Physics', 'Modern Physics'],
  'Atoms and Nuclei': ['Physics', 'Modern Physics'],
  'Electronic Devices': ['Physics', 'Modern Physics'],
  'Modern Physics': ['Physics', 'Modern Physics'],

  // Chemistry
  'Some Basic Concepts of Chemistry': ['Chemistry', 'Physical Chemistry'],
  'Atomic Structure': ['Chemistry', 'Physical Chemistry'],
  'Chemical Thermodynamics': ['Chemistry', 'Physical Chemistry'],
  'Chemical Equilibrium': ['Chemistry', 'Physical Chemistry'],
  'Ionic Equilibrium': ['Chemistry', 'Physical Chemistry'],
  'Redox Reactions and Electrochemistry': ['Chemistry', 'Physical Chemistry'],
  'Chemical Kinetics': ['Chemistry', 'Physical Chemistry'],
  Solutions: ['Chemistry', 'Physical Chemistry'],
  'Periodic Table and Periodicity': ['Chemistry', 'Inorganic Chemistry'],
  'Chemical Bonding and Molecular Structure': ['Chemistry', 'Inorganic Chemistry'],
  'Chemical Bonding': ['Chemistry', 'Inorganic Chemistry'],
  'p-Block Elements': ['Chemistry', 'Inorganic Chemistry'],
  'd- and f-Block Elements': ['Chemistry', 'Inorganic Chemistry'],
  'Coordination Compounds': ['Chemistry', 'Inorganic Chemistry'],
  'General Organic Chemistry': ['Chemistry', 'Organic Chemistry'],
  Hydrocarbons: ['Chemistry', 'Organic Chemistry'],
  'Haloalkanes and Haloarenes': ['Chemistry', 'Organic Chemistry'],
  'Alcohols, Phenols and Ethers': ['Chemistry', 'Organic Chemistry'],
  'Aldehydes, Ketones and Carboxylic Acids': ['Chemistry', 'Organic Chemistry'],
  'Amines and Nitrogen Compounds': ['Chemistry', 'Organic Chemistry'],
  Biomolecules: ['Chemistry', 'Organic Chemistry'],

  // Mathematics
  'Sets, Relations and Functions': ['Mathematics', 'Algebra'],
  'Complex Numbers and Quadratic Equations': ['Mathematics', 'Algebra'],
  'Complex Numbers': ['Mathematics', 'Algebra'],
  'Matrices and Determinants': ['Mathematics', 'Matrices & Determinants'],
  'Permutations and Combinations': ['Mathematics', 'Algebra'],
  'Binomial Theorem': ['Mathematics', 'Algebra'],
  'Sequence and Series': ['Mathematics', 'Algebra'],
  'Limits, Continuity and Differentiability': ['Mathematics', 'Calculus'],
  'Differential Calculus': ['Mathematics', 'Calculus'],
  'Integral Calculus': ['Mathematics', 'Calculus'],
  'Differential Equations': ['Mathematics', 'Calculus'],
  'Coordinate Geometry (Lines & Circles)': ['Mathematics', 'Coordinate Geometry'],
  'Conic Sections': ['Mathematics', 'Coordinate Geometry'],
  'Vectors and 3D Geometry': ['Mathematics', 'Vectors and 3D Geometry'],
  Trigonometry: ['Mathematics', 'Trigonometry'],
  'Statistics and Probability': ['Mathematics', 'Probability & Statistics'],
};

function round2(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function round1(val) {
  return Math.round((Number(val) + Number.EPSILON) * 10) / 10;
}

function classifyAccuracy(accuracy) {
  if (accuracy >= 80.0) return 'Strong';
  if (accuracy >= 50.0) return 'Average';
  return 'Weak';
}

function calculateSubjectMetrics(questions, subjectName) {
  const targetLower = String(subjectName || '').trim().toLowerCase();
  const subQs = (questions || []).filter(
    (q) => String(q.subject || '').trim().toLowerCase() === targetLower
  );
  const totalQ = subQs.length;

  let attempted = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let posMarks = 0.0;
  let negMarks = 0.0;
  let timeSpent = 0;

  for (const q of subQs) {
    const st = String(q.status || '').toLowerCase();
    const qMarks = Number(q.marks || 0);
    if (st === 'correct') {
      attempted += 1;
      correct += 1;
      posMarks += qMarks > 0 ? qMarks : 4.0;
    } else if (st === 'incorrect') {
      attempted += 1;
      incorrect += 1;
      negMarks += Math.abs(qMarks !== 0 ? qMarks : 1.0);
    } else {
      unattempted += 1;
    }
    timeSpent += Number(q.time_spent_seconds || 0);
  }

  const totalMarks = posMarks - negMarks;
  const accuracy = attempted > 0 ? round2((correct / attempted) * 100) : 0.0;
  const maxSubjectMarks = totalQ > 0 ? totalQ * 4.0 : 100.0;
  const percentage = maxSubjectMarks > 0 ? round2((totalMarks / maxSubjectMarks) * 100) : 0.0;

  return {
    subject: subjectName,
    total_questions: totalQ > 0 ? totalQ : 25,
    attempted,
    correct,
    incorrect,
    unattempted,
    positive_marks: posMarks,
    negative_marks: negMarks,
    total_marks: totalMarks,
    accuracy,
    percentage,
    time_spent_seconds: timeSpent,
  };
}

function validateTestData(testData) {
  const warnings = [];
  const marksObtained = Number(testData.marks_obtained || 0);
  const maxMarks = Number(testData.max_marks || 300);

  if (marksObtained > maxMarks) {
    warnings.push(`Marks obtained (${marksObtained}) exceeds maximum marks (${maxMarks}).`);
  }

  if (Array.isArray(testData.subjects) && testData.subjects.length > 0) {
    const subjectsTotal = testData.subjects.reduce((acc, s) => acc + Number(s.total_marks || 0), 0);
    if (Math.abs(subjectsTotal - marksObtained) > 1.0) {
      warnings.push(
        `Sum of subject marks (${subjectsTotal}) differs from total marks obtained (${marksObtained}).`
      );
    }

    for (const sub of testData.subjects) {
      const att = Number(sub.attempted || 0);
      const corr = Number(sub.correct || 0);
      const inc = Number(sub.incorrect || 0);
      const totQ = Number(sub.total_questions || 0);
      const unatt = Number(sub.unattempted || 0);

      if (att > 0 && att !== corr + inc) {
        warnings.push(`${sub.subject}: Attempted count (${att}) != Correct (${corr}) + Incorrect (${inc}).`);
      }
      if (totQ > 0 && att > 0 && totQ !== att + unatt) {
        warnings.push(
          `${sub.subject}: Total questions (${totQ}) != Attempted (${att}) + Unattempted (${unatt}).`
        );
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

module.exports = {
  JEE_CHAPTER_UNIT_MAP,
  round1,
  round2,
  classifyAccuracy,
  calculateSubjectMetrics,
  validateTestData,
};
