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
  ArrowRight
} from 'lucide-react';
import { uploadsAPI } from '../services/api';

const UploadTest = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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

  // 1-Click Sample File Loader for quick testing
  const handleLoadSample = async (sampleName) => {
    setUploading(true);
    setError('');
    try {
      // Fetch sample file from static backend or create mock File object
      const sampleMap = {
        'csv': { name: 'allen_mock_test_result.csv', type: 'text/csv' },
        'excel': { name: 'resonance_test_result.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        'pdf': { name: 'nta_jee_main_scorecard.pdf', type: 'application/pdf' },
        'png': { name: 'mock_scorecard_screenshot.png', type: 'image/png' },
      };
      const info = sampleMap[sampleName];
      const res = await fetch(`/api/health`); // test ping
      // To load the actual file from sample_tests directory on server:
      const formData = new FormData();
      // We can create a mock file with realistic headers or fetch
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
    
    // Auto-recalculate subject total marks and accuracy
    const s = updated[index];
    if (field === 'correct' || field === 'incorrect') {
      s.attempted = s.correct + s.incorrect;
      s.positive_marks = s.correct * 4.0;
      s.negative_marks = s.incorrect * 1.0;
      s.total_marks = s.positive_marks - s.negative_marks;
      s.accuracy = s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(2)) : 0;
    }

    // Auto-update overall marks obtained
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Upload Test Result</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload mock test scorecards in PDF, Screenshot image (PNG/JPG), or CSV/Excel formats for automated extraction and validation.
        </p>
      </div>

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
                              max={25}
                              value={sub.correct}
                              onChange={(e) => handleSubjectChange(idx, 'correct', e.target.value)}
                              className="w-16 px-2 py-1 text-center border border-slate-300 rounded-lg text-emerald-700 font-bold focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={25}
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
                          {preview.subjects.reduce((a, b) => a + b.attempted, 0)} / 75
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-700 text-sm">
                          {preview.marks_obtained} / 300
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
