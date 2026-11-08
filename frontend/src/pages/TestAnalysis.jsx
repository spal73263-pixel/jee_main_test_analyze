import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Calendar,
  Filter,
  Layers,
  BookOpen
} from 'lucide-react';
import { testsAPI } from '../services/api';

const TestAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const testIdParam = searchParams.get('test_id');

  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(testIdParam || '');
  const [testDetail, setTestDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters for questions table
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  useEffect(() => {
    fetchTestList();
  }, []);

  useEffect(() => {
    if (selectedTestId) {
      fetchTestDetail(selectedTestId);
    }
  }, [selectedTestId]);

  const fetchTestList = async () => {
    try {
      const res = await testsAPI.getTests();
      setTests(res.data);
      if (res.data.length > 0 && !selectedTestId) {
        setSelectedTestId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestDetail = async (id) => {
    setLoading(true);
    try {
      const res = await testsAPI.getTestDetail(id);
      setTestDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch test detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTest = (id) => {
    setSelectedTestId(id);
    setSearchParams({ test_id: id });
  };

  const questions = testDetail?.question_results || [];
  const filteredQuestions = questions.filter(q => {
    if (subjectFilter !== 'All' && q.subject !== subjectFilter) return false;
    if (statusFilter !== 'All' && q.status !== statusFilter) return false;
    if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  const ai = testDetail?.ai_recommendation;

  return (
    <div className="space-y-6">
      {/* Top Bar with Test Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Test Performance Deep Dive</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Detailed breakdown, question logs, marking penalties, and AI diagnostic report
          </p>
        </div>

        {/* Test Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Selected Test:</label>
          <select
            value={selectedTestId}
            onChange={(e) => handleSelectTest(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
          >
            {tests.map(t => (
              <option key={t.id} value={t.id}>
                {t.test_name} ({t.test_date}) - {t.marks_obtained} M
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !testDetail ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : testDetail ? (
        <>
          {/* Test Header Overview Banner */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {testDetail.test_type} • {testDetail.shift}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">{testDetail.test_name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {testDetail.test_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {testDetail.duration_minutes} Minutes
                  </span>
                  {testDetail.official_percentile && (
                    <span className="font-semibold text-violet-700">
                      Percentile: {testDetail.official_percentile}%ile
                    </span>
                  )}
                  {testDetail.official_rank && (
                    <span className="font-semibold text-slate-700">
                      AIR: #{testDetail.official_rank}
                    </span>
                  )}
                </div>
              </div>

              {/* Score Metric Big Pill */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400">Total Score</p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight">
                    {testDetail.marks_obtained}
                    <span className="text-sm font-semibold text-slate-400 ml-1">/ {testDetail.max_marks}</span>
                  </p>
                </div>
                <div className="text-right pl-4 border-l border-slate-200">
                  <p className="text-xs font-semibold text-slate-400">Accuracy</p>
                  <p className="text-2xl font-extrabold text-emerald-600">{testDetail.overall_accuracy}%</p>
                </div>
              </div>
            </div>

            {/* Subject Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              {testDetail.subject_results.map((sub) => (
                <div key={sub.subject} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">{sub.subject}</span>
                    <span className="text-base font-extrabold text-indigo-700">{sub.total_marks} M</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-center my-2">
                    <div className="p-1 rounded bg-emerald-100/60 text-emerald-800 font-bold">
                      {sub.correct} Right
                    </div>
                    <div className="p-1 rounded bg-rose-100/60 text-rose-800 font-bold">
                      {sub.incorrect} Wrong
                    </div>
                    <div className="p-1 rounded bg-slate-200/60 text-slate-700 font-bold">
                      {sub.unattempted} Left
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    <span>Accuracy: <strong className="text-slate-800">{sub.accuracy}%</strong></span>
                    <span className="text-rose-600 font-semibold">Loss: -{sub.negative_marks} M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI-Powered 12-Section Diagnostic Report */}
          {ai && (
            <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-100/50 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">AI-Powered Diagnostic Test Report</h2>
                  <p className="text-xs text-slate-500">Personalized data-backed findings and recommendations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Overall Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Overall Performance</p>
                  <p className="text-slate-800 leading-relaxed">{ai.overall_summary}</p>
                </div>

                {/* 2. Negative Marking Analysis */}
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <p className="font-bold text-rose-800 uppercase tracking-wider text-[10px]">2. Negative Marking Impact</p>
                  <p className="text-rose-950 leading-relaxed">{ai.negative_marking_analysis}</p>
                </div>

                {/* 3. Strong Topics */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <p className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">3. Strong Mastery Chapters</p>
                  <p className="text-emerald-950 font-medium">{ai.strong_topics}</p>
                </div>

                {/* 4. Weak Topics */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <p className="font-bold text-amber-800 uppercase tracking-wider text-[10px]">4. Weak Focus Chapters</p>
                  <p className="text-amber-950 font-medium">{ai.weak_topics}</p>
                </div>

                {/* 5. 3 Major Areas to Improve */}
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                  <p className="font-bold text-indigo-800 uppercase tracking-wider text-[10px]">5. Priority Action Areas</p>
                  <p className="text-indigo-950 whitespace-pre-line leading-relaxed">{ai.improvement_areas}</p>
                </div>

                {/* 6. Comparison with Previous */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">6. Previous Test Comparison</p>
                  <p className="text-slate-800 leading-relaxed">{ai.comparison_with_previous}</p>
                </div>
              </div>

              {/* 7-Day Plan Preview Pill */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Targeted 7-Day Action Plan Generated</p>
                  <p className="text-xs text-slate-200 mt-0.5">Automated revision schedule mapped to your error logs.</p>
                </div>
                <a
                  href="/study-planner"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white whitespace-nowrap self-start sm:self-center"
                >
                  View Full Study Plan →
                </a>
              </div>
            </div>
          )}

          {/* Question-Level Log Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Question-Level Log</h3>
                <p className="text-xs text-slate-500">
                  Showing {filteredQuestions.length} of {questions.length} questions
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
                >
                  <option value="All">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Correct">Correct Only</option>
                  <option value="Incorrect">Incorrect Only</option>
                  <option value="Unattempted">Unattempted Only</option>
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {filteredQuestions.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-center">Q#</th>
                      <th className="py-2.5 px-3 text-left">Subject</th>
                      <th className="py-2.5 px-3 text-left">Chapter</th>
                      <th className="py-2.5 px-3 text-center">Difficulty</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Marks</th>
                      <th className="py-2.5 px-3 text-center">Time Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredQuestions.map((q) => (
                      <tr key={q.id || q.question_number} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">Q{q.question_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{q.subject}</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]" title={q.chapter}>
                          {q.chapter || 'Core Syllabus'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                            q.difficulty === 'Hard' ? 'bg-purple-50 text-purple-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            q.status === 'Correct' ? 'text-emerald-600' :
                            q.status === 'Incorrect' ? 'text-rose-600' :
                            'text-slate-400'
                          }`}>
                            {q.status === 'Correct' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {q.status === 'Incorrect' && <XCircle className="w-3.5 h-3.5" />}
                            {q.status === 'Unattempted' && <HelpCircle className="w-3.5 h-3.5" />}
                            <span>{q.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span className={q.marks > 0 ? 'text-emerald-600' : q.marks < 0 ? 'text-rose-600' : 'text-slate-400'}>
                            {q.marks > 0 ? `+${q.marks}` : q.marks}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                          {q.time_spent_seconds ? `${Math.floor(q.time_spent_seconds / 60)}m ${q.time_spent_seconds % 60}s` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                No questions match the current filter criteria or question-level data was not provided in this report.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-500 text-sm">
          No test selected. Upload a test or select one from the dropdown above.
        </div>
      )}
    </div>
  );
};

export default TestAnalysis;
