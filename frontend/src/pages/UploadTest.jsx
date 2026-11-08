import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  Download,
  Sparkles,
  FileSpreadsheet,
  Image as ImageIcon,
  ArrowRight,
  Calculator,
  Award,
  Layers,
  GraduationCap,
  Calendar,
  Clock,
  RotateCcw
} from 'lucide-react';
import { uploadsAPI } from '../services/api';

const EXAM_PRESETS = {
  'JEE Main': {
    name: 'JEE Main',
    badge: 'Objective +4/-1',
    description: '300 Marks • Physics, Chemistry, Mathematics (25 questions each)',
    defaultDuration: 180,
    defaultMaxMarks: 300,
    subjects: [
      { subject: 'Physics', defaultMax: 100, total_questions: 25 },
      { subject: 'Chemistry', defaultMax: 100, total_questions: 25 },
      { subject: 'Mathematics', defaultMax: 100, total_questions: 25 },
    ]
  },
  'JEE Advanced': {
    name: 'JEE Advanced',
    badge: 'Multi-Concept Rigor',
    description: '360 Marks • Physics, Chemistry, Mathematics (Advanced pattern)',
    defaultDuration: 180,
    defaultMaxMarks: 360,
    subjects: [
      { subject: 'Physics', defaultMax: 120, total_questions: 18 },
      { subject: 'Chemistry', defaultMax: 120, total_questions: 18 },
      { subject: 'Mathematics', defaultMax: 120, total_questions: 18 },
    ]
  },
  'Board Exam Class 12th': {
    name: 'Board Exam Class 12th',
    badge: 'HSC / Class 12th',
    description: '600 Marks • Maths, CS 1, CS 2, English, Physics, Chemistry',
    defaultDuration: 180,
    defaultMaxMarks: 600,
    subjects: [
      { subject: 'Mathematics', defaultMax: 100, total_questions: 30 },
      { subject: 'Computer Science 1 (CS 1)', defaultMax: 100, total_questions: 25 },
      { subject: 'Computer Science 2 (CS 2)', defaultMax: 100, total_questions: 25 },
      { subject: 'English', defaultMax: 100, total_questions: 20 },
      { subject: 'Physics', defaultMax: 100, total_questions: 30 },
      { subject: 'Chemistry', defaultMax: 100, total_questions: 30 },
    ]
  }
};

const UploadTest = () => {
  const navigate = useNavigate();

  // Mode: 'manual' (default) | 'upload'
  const [entryMode, setEntryMode] = useState('manual');

  // --- Manual Entry State ---
  const [selectedExam, setSelectedExam] = useState('JEE Main');
  const [manualTestName, setManualTestName] = useState('JEE Main Full Mock Test 01');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualShift, setManualShift] = useState('Shift 1');
  const [manualDuration, setManualDuration] = useState('180');
  const [manualPercentile, setManualPercentile] = useState('');
  const [manualRank, setManualRank] = useState('');

  // Subject marks state initialized based on selected exam
  const [subjectEntries, setSubjectEntries] = useState(() => {
    return EXAM_PRESETS['JEE Main'].subjects.map(s => ({
      subject: s.subject,
      total_marks: '',
      max_marks: s.defaultMax,
      total_questions: s.total_questions,
      correct: '',
      incorrect: '',
      unattempted: ''
    }));
  });

  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  // --- File Upload State ---
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Switch Exam Preset in Manual Mode
  const handleExamChange = (examKey) => {
    setSelectedExam(examKey);
    const preset = EXAM_PRESETS[examKey];

    const defaultNames = {
      'JEE Main': 'JEE Main Full Mock Test 01',
      'JEE Advanced': 'JEE Advanced Practice Paper 1',
      'Board Exam Class 12th': 'HSC Class 12th Prelim Exam 1'
    };
    setManualTestName(defaultNames[examKey]);
    setManualDuration(String(preset.defaultDuration));

    setSubjectEntries(
      preset.subjects.map(s => ({
        subject: s.subject,
        total_marks: '',
        max_marks: s.defaultMax,
        total_questions: s.total_questions,
        correct: '',
        incorrect: '',
        unattempted: ''
      }))
    );
  };

  // Update a single subject's manual fields
  const handleSubjectFieldChange = (index, field, value) => {
    const updated = [...subjectEntries];
    updated[index][field] = value;

    // If student enters correct and incorrect in JEE modes, calculate marks automatically
    if ((field === 'correct' || field === 'incorrect') && selectedExam !== 'Board Exam Class 12th') {
      const corr = parseFloat(field === 'correct' ? value : updated[index].correct) || 0;
      const incorr = parseFloat(field === 'incorrect' ? value : updated[index].incorrect) || 0;
      const totalQ = updated[index].total_questions || 25;
      
      const calcMarks = (corr * 4.0) - (incorr * 1.0);
      updated[index].total_marks = calcMarks >= 0 ? calcMarks : 0;
      updated[index].unattempted = Math.max(0, totalQ - (corr + incorr));
    }

    setSubjectEntries(updated);
  };

  // Submit Manual Test Entry
  const handleSaveManualTest = async (e) => {
    e.preventDefault();
    setManualError('');

    if (!manualTestName.trim()) {
      setManualError('Please enter a test title/name.');
      return;
    }

    // Validate that at least one subject has marks entered
    const hasAnyMarks = subjectEntries.some(s => s.total_marks !== '' && !isNaN(parseFloat(s.total_marks)));
    if (!hasAnyMarks) {
      setManualError('Please enter marks for at least one subject.');
      return;
    }

    setSavingManual(true);
    try {
      const formattedSubjects = subjectEntries.map(s => {
        const marks = parseFloat(s.total_marks) || 0.0;
        const maxM = parseFloat(s.max_marks) || 100.0;
        const totalQ = s.total_questions || 25;
        
        let corr = parseInt(s.correct) || 0;
        let incorr = parseInt(s.incorrect) || 0;
        let att = corr + incorr;

        if (att === 0 && marks > 0) {
          // If student only typed direct total marks (e.g. HSC or simple mode)
          corr = Math.round((marks / maxM) * totalQ);
          incorr = 0;
          att = corr;
        }

        const unatt = Math.max(0, totalQ - att);
        const accuracy = att > 0 ? Number(((corr / att) * 100).toFixed(2)) : 0.0;
        const percentage = maxM > 0 ? Number(((marks / maxM) * 100).toFixed(2)) : 0.0;

        return {
          subject: s.subject,
          total_questions: totalQ,
          attempted: att,
          correct: corr,
          incorrect: incorr,
          unattempted: unatt,
          positive_marks: marks > 0 ? marks : 0.0,
          negative_marks: incorr * 1.0,
          total_marks: marks,
          accuracy: accuracy,
          percentage: percentage,
          time_spent_seconds: 0
        };
      });

      const totalMarksObtained = formattedSubjects.reduce((acc, curr) => acc + curr.total_marks, 0);
      const totalMaxMarks = subjectEntries.reduce((acc, curr) => acc + (parseFloat(curr.max_marks) || 100), 0);
      const totalQuestions = formattedSubjects.reduce((acc, curr) => acc + curr.total_questions, 0);

      const payload = {
        test_name: manualTestName.trim(),
        test_date: manualDate,
        test_type: selectedExam,
        shift: manualShift,
        duration_minutes: parseInt(manualDuration) || 180,
        total_questions: totalQuestions,
        max_marks: totalMaxMarks,
        marks_obtained: totalMarksObtained,
        official_percentile: manualPercentile ? parseFloat(manualPercentile) : null,
        official_rank: manualRank ? parseInt(manualRank) : null,
        subjects: formattedSubjects,
        questions: []
      };

      const res = await uploadsAPI.confirmTest(payload);
      navigate(`/test-analysis?test_id=${res.data.id}`);
    } catch (err) {
      console.error('Failed to save manual test:', err);
      setManualError(err.response?.data?.detail || err.message || 'Failed to save test.');
    } finally {
      setSavingManual(false);
    }
  };

  // --- File Upload Functions ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleProcessUpload = async (fileToUpload = file) => {
    if (!fileToUpload) {
      setError('Please select a result file (PDF, Image, CSV, or Excel).');
      return;
    }

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const res = await uploadsAPI.processFile(formData);
      setPreview(res.data);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process result file.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = async (sampleName) => {
    setUploading(true);
    setError('');
    try {
      const sampleMap = {
        'csv': { name: 'allen_mock_test_result.csv', type: 'text/csv' },
        'excel': { name: 'resonance_test_result.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        'pdf': { name: 'nta_jee_main_scorecard.pdf', type: 'application/pdf' },
        'png': { name: 'mock_scorecard_screenshot.png', type: 'image/png' },
      };
      const info = sampleMap[sampleName];
      const sampleContent = sampleName === 'csv'
        ? "Question Number,Subject,Chapter,Question Type,Difficulty,Selected Answer,Correct Answer,Status,Marks,Time\n1,Physics,Kinematics,MCQ,Medium,B,B,Correct,4,120\n2,Physics,Laws of Motion,MCQ,Medium,A,A,Correct,4,110\n3,Physics,Work Power Energy,MCQ,Hard,C,D,Incorrect,-1,180\n26,Chemistry,Chemical Bonding,MCQ,Easy,B,B,Correct,4,90\n27,Chemistry,Thermodynamics,MCQ,Medium,C,C,Correct,4,110\n28,Chemistry,GOC,MCQ,Medium,A,D,Incorrect,-1,130\n51,Mathematics,Matrices,MCQ,Easy,A,A,Correct,4,140\n52,Mathematics,Calculus,MCQ,Hard,B,B,Correct,4,200\n53,Mathematics,Vectors 3D,MCQ,Medium,D,C,Incorrect,-1,190"
        : "dummy binary";
      
      const blob = new Blob([sampleContent], { type: info.type });
      const testFile = new File([blob], info.name, { type: info.type });
      
      setFile(testFile);
      handleProcessUpload(testFile);
    } catch (err) {
      setError('Could not load sample file: ' + err.message);
      setUploading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setPreview(prev => ({ ...prev, [field]: value }));
  };

  const handleSubjectChange = (index, field, value) => {
    const updated = [...preview.subjects];
    updated[index][field] = Number(value);
    
    const s = updated[index];
    if (field === 'correct' || field === 'incorrect') {
      s.attempted = s.correct + s.incorrect;
      s.positive_marks = s.correct * 4.0;
      s.negative_marks = s.incorrect * 1.0;
      s.total_marks = s.positive_marks - s.negative_marks;
      s.accuracy = s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(2)) : 0;
    }

    const overallMarks = updated.reduce((acc, curr) => acc + curr.total_marks, 0);

    setPreview(prev => ({
      ...prev,
      subjects: updated,
      marks_obtained: overallMarks
    }));
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const payload = {
        test_name: preview.test_name,
        test_date: preview.test_date,
        test_type: preview.test_type,
        shift: preview.shift,
        duration_minutes: preview.duration_minutes,
        total_questions: preview.total_questions,
        max_marks: preview.max_marks,
        marks_obtained: preview.marks_obtained,
        official_percentile: preview.official_percentile ? Number(preview.official_percentile) : null,
        official_rank: preview.official_rank ? Number(preview.official_rank) : null,
        subjects: preview.subjects,
        questions: preview.questions || []
      };

      const res = await uploadsAPI.confirmTest(payload);
      setShowModal(false);
      navigate(`/test-analysis?test_id=${res.data.id}`);
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Calculations for manual summary
  const manualTotalMarks = subjectEntries.reduce((acc, s) => acc + (parseFloat(s.total_marks) || 0), 0);
  const manualTotalMax = subjectEntries.reduce((acc, s) => acc + (parseFloat(s.max_marks) || 100), 0);
  const manualPercentage = manualTotalMax > 0 ? ((manualTotalMarks / manualTotalMax) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Add & Analyze Test Results</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manually enter your subject marks or upload coaching scorecard files (PDF, Image OCR, CSV, Excel).
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setEntryMode('manual')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              entryMode === 'manual'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Enter Marks Manually</span>
          </button>

          <button
            onClick={() => setEntryMode('upload')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              entryMode === 'upload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File / OCR</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MANUAL MARKS ENTRY */}
      {/* ========================================================================= */}
      {entryMode === 'manual' && (
        <form onSubmit={handleSaveManualTest} className="space-y-6">
          {manualError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}

          {/* Exam Type Selector Cards */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Choose Examination Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.keys(EXAM_PRESETS).map((key) => {
                const preset = EXAM_PRESETS[key];
                const isSelected = selectedExam === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleExamChange(key)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {preset.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          key === 'Board Exam Class 12th' ? 'bg-emerald-100 text-emerald-800' :
                          key === 'JEE Advanced' ? 'bg-amber-100 text-amber-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">Subjects: {preset.subjects.length}</span>
                      <span className={`font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isSelected ? '✓ Selected' : 'Select'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Metadata Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Test Information & Date
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Test Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Allen Mock Test 05, HSC Prelims Exam 1"
                  value={manualTestName}
                  onChange={(e) => setManualTestName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Test Date</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift / Session</label>
                <select
                  value={manualShift}
                  onChange={(e) => setManualShift(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                >
                  <option value="Shift 1">Shift 1 (Morning)</option>
                  <option value="Shift 2">Shift 2 (Evening)</option>
                  <option value="Single Session">Single Session (Board/Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="360"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Percentile (Optional)</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 98.42"
                  value={manualPercentile}
                  onChange={(e) => setManualPercentile(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Rank / AIR (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 1420"
                  value={manualRank}
                  onChange={(e) => setManualRank(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Subject Marks Input Section */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>3. Enter Subject Marks ({selectedExam})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedExam === 'Board Exam Class 12th'
                    ? 'Enter marks obtained for all 6 HSC subjects (Mathematics, CS 1, CS 2, English, Physics, Chemistry).'
                    : 'Enter marks directly, or enter Correct & Incorrect counts to auto-calculate scores (+4 / -1).'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Live Total: </span>
                <span className="text-base font-black text-indigo-700 ml-1">
                  {manualTotalMarks} / {manualTotalMax} Marks ({manualPercentage}%)
                </span>
              </div>
            </div>

            {/* Subject Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectEntries.map((sub, idx) => {
                const marksVal = parseFloat(sub.total_marks) || 0;
                const maxVal = parseFloat(sub.max_marks) || 100;
                const pct = maxVal > 0 ? Math.min(100, Math.round((marksVal / maxVal) * 100)) : 0;

                return (
                  <div
                    key={sub.subject}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/40 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {sub.subject}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        sub.subject.includes('Physics') ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                        sub.subject.includes('Chemistry') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        sub.subject.includes('Math') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        sub.subject.includes('Computer') || sub.subject.includes('CS') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        Max: {sub.max_marks}
                      </span>
                    </div>

                    {/* Marks Obtained Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Marks Obtained
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={sub.max_marks}
                          placeholder="e.g. 78"
                          value={sub.total_marks}
                          onChange={(e) => handleSubjectFieldChange(idx, 'total_marks', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-indigo-700 focus:outline-indigo-600 text-center"
                        />
                        <span className="text-xs font-bold text-slate-400 shrink-0">/ {sub.max_marks}</span>
                      </div>
                    </div>

                    {/* Optional: Correct / Incorrect helpers for JEE */}
                    {selectedExam !== 'Board Exam Class 12th' && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-emerald-700 mb-0.5">
                            Correct (+4)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={sub.total_questions}
                            placeholder="Right"
                            value={sub.correct}
                            onChange={(e) => handleSubjectFieldChange(idx, 'correct', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 text-center focus:outline-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-rose-700 mb-0.5">
                            Incorrect (-1)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={sub.total_questions}
                            placeholder="Wrong"
                            value={sub.incorrect}
                            onChange={(e) => handleSubjectFieldChange(idx, 'incorrect', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-700 text-center focus:outline-rose-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Mini Progress Bar */}
                    <div className="pt-1">
                      <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Score: {marksVal} M</span>
                        <span className="font-bold text-slate-600">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">
                Ready to Generate Performance Diagnostics?
              </h4>
              <p className="text-xs text-slate-500">
                Saving will compute your chapter masteries, subject rankings, and personalized AI recovery roadmap.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleExamChange(selectedExam)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Reset Fields
              </button>

              <button
                type="submit"
                disabled={savingManual}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingManual ? 'Saving & Generating Analysis...' : 'Save & View Test Analysis'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SCORECARD FILE UPLOAD & OCR */}
      {/* ========================================================================= */}
      {entryMode === 'upload' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-colors shadow-xs text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              {file ? file.name : 'Choose or drag a scorecard file here'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
              Supports multi-page coaching PDFs (Allen, Resonance, FIITJEE), NTA scorecards, spreadsheet logs (.csv, .xlsx), or score screenshots (.png, .jpg).
            </p>

            <input
              type="file"
              id="file-upload"
              accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor="file-upload"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Browse Local File
              </label>

              <button
                onClick={() => handleProcessUpload()}
                disabled={!file || uploading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting Result Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process & Preview Result</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 1-Click Quick Sample Testing Area */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Try Pre-Loaded Realistic Test Formats</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Click any format below to instantly test the automated extraction and verification engine without having to upload your own files:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleLoadSample('csv')}
                disabled={uploading}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/40 text-left transition-all"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">Allen Mock CSV</p>
                <p className="text-[11px] text-slate-400">75 Questions table</p>
              </button>

              <button
                onClick={() => handleLoadSample('excel')}
                disabled={uploading}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/40 text-left transition-all"
              >
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">Resonance Excel</p>
                <p className="text-[11px] text-slate-400">Multi-sheet workbook</p>
              </button>

              <button
                onClick={() => handleLoadSample('pdf')}
                disabled={uploading}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/40 text-left transition-all"
              >
                <FileText className="w-5 h-5 text-rose-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">NTA Mock PDF</p>
                <p className="text-[11px] text-slate-400">Multi-page layout</p>
              </button>

              <button
                onClick={() => handleLoadSample('png')}
                disabled={uploading}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/40 text-left transition-all"
              >
                <ImageIcon className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">Scorecard OCR</p>
                <p className="text-[11px] text-slate-400">Image screenshot</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Extraction Verification Modal */}
      {showModal && preview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                  Step 7 & 8: Data Verification & Correction
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Review Extracted Mock Test Data</h3>
                <p className="text-xs text-slate-500">
                  Source: <span className="font-semibold text-slate-700">{preview.extraction_source}</span> • Confidence: <span className="font-semibold text-emerald-600">{preview.confidence_level}</span>
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{w}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Examination Metadata Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Test Name</label>
                  <input
                    type="text"
                    value={preview.test_name}
                    onChange={(e) => handleFieldChange('test_name', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Test Date</label>
                  <input
                    type="date"
                    value={preview.test_date}
                    onChange={(e) => handleFieldChange('test_date', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Shift</label>
                  <select
                    value={preview.shift}
                    onChange={(e) => handleFieldChange('shift', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="Shift 1">Shift 1 (Morning)</option>
                    <option value="Shift 2">Shift 2 (Evening)</option>
                  </select>
                </div>
              </div>

              {/* Subject Breakdown Table - Editable */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Subject-Wise Extracted Marks (Verify & Adjust if needed)
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Subject</th>
                        <th className="py-2.5 px-3 text-center">Correct (+4)</th>
                        <th className="py-2.5 px-3 text-center">Incorrect (-1)</th>
                        <th className="py-2.5 px-3 text-center">Attempted</th>
                        <th className="py-2.5 px-3 text-center">Total Marks</th>
                        <th className="py-2.5 px-3 text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {preview.subjects.map((sub, idx) => (
                        <tr key={sub.subject}>
                          <td className="py-2 px-3 font-bold text-slate-900">{sub.subject}</td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={sub.total_questions || 50}
                              value={sub.correct}
                              onChange={(e) => handleSubjectChange(idx, 'correct', e.target.value)}
                              className="w-16 px-2 py-1 text-center border border-slate-300 rounded-lg text-emerald-700 font-bold focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={sub.total_questions || 50}
                              value={sub.incorrect}
                              onChange={(e) => handleSubjectChange(idx, 'incorrect', e.target.value)}
                              className="w-16 px-2 py-1 text-center border border-slate-300 rounded-lg text-rose-700 font-bold focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{sub.attempted}</td>
                          <td className="py-2 px-3 text-center font-bold text-indigo-700">{sub.total_marks}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">{sub.accuracy}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3">Total Exam</td>
                        <td className="py-2.5 px-3 text-center text-emerald-700">
                          {preview.subjects.reduce((a, b) => a + b.correct, 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-700">
                          {preview.subjects.reduce((a, b) => a + b.incorrect, 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {preview.subjects.reduce((a, b) => a + b.attempted, 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-700 text-sm">
                          {preview.marks_obtained} / {preview.max_marks}
                        </td>
                        <td className="py-2.5 px-3 text-right text-indigo-700">
                          {preview.subjects.reduce((a, b) => a + b.attempted, 0) > 0
                            ? ((preview.subjects.reduce((a, b) => a + b.correct, 0) / preview.subjects.reduce((a, b) => a + b.attempted, 0)) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Official Percentile / Rank (Only if official) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Official Percentile (Leave blank if mock test)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 98.421"
                    value={preview.official_percentile || ''}
                    onChange={(e) => handleFieldChange('official_percentile', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Official AIR Rank (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15420"
                    value={preview.official_rank || ''}
                    onChange={(e) => handleFieldChange('official_rank', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50/60 rounded-b-3xl flex items-center justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving & Generating Analysis...' : 'Save & Generate Full Analysis'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTest;
