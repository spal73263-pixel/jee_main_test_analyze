import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Eye,
  Trash2,
  GitCompare,
  Printer,
  Download,
  AlertCircle,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { testsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../utils/useAutoRefresh';

const TestHistory = () => {
  const { syncVersion } = useAuth();
  const [tests, setTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTests = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedType !== 'All') params.test_type = selectedType;
      const res = await testsAPI.getTests(params);
      setTests(res.data);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchTerm, selectedType]);

  useEffect(() => {
    fetchTests({ silent: syncVersion > 0 });
  }, [fetchTests, syncVersion]);

  useAutoRefresh(() => fetchTests({ silent: true }));

  const handleDelete = async (testId, testName) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${testName}'?`)) {
      return;
    }
    try {
      await testsAPI.deleteTest(testId);
      setTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mock Test History & Archive</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete chronological record of all uploaded and verified JEE Main mock examinations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center no-print">
          <button
            onClick={() => navigate('/compare')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Tests</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test by name or code..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="All">All Types</option>
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
            <option value="Board Exam Class 12th">Board Exam Class 12th</option>
            <option value="Mock Test">Mock Test</option>
          </select>
        </div>
      </div>

      {/* Main Tests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Test Name</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3 text-center">Physics</th>
                  <th className="py-3 px-3 text-center">Chemistry</th>
                  <th className="py-3 px-3 text-center">Maths</th>
                  <th className="py-3 px-3 text-center">Total Score</th>
                  <th className="py-3 px-3 text-center">Accuracy</th>
                  <th className="py-3 px-3 text-center">Percentile</th>
                  <th className="py-3 px-4 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tests.map((t) => {
                  const subs = t.subject_marks || {};
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{t.test_name}</span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {t.shift}
                          </span>
                        </div>
                        {t.test_id_code && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            ID: {t.test_id_code}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-600 font-medium">{t.test_date}</td>
                      <td className="py-3.5 px-3 text-center font-bold text-sky-600">
                        {subs.Physics !== undefined ? subs.Physics : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                        {subs.Chemistry !== undefined ? subs.Chemistry : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-amber-600">
                        {subs.Mathematics !== undefined ? subs.Mathematics : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-extrabold text-indigo-700 text-sm">
                        {t.marks_obtained} <span className="text-[10px] font-normal text-slate-400">/ {t.max_marks || 300}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {t.overall_accuracy}%
                      </td>
                      <td className="py-3.5 px-3 text-center font-semibold text-violet-700">
                        {t.official_percentile ? `${t.official_percentile}%ile` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/test-analysis?test_id=${t.id}`)}
                            title="Open Analysis"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.test_name)}
                            title="Delete Test"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs">
            No mock tests match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default TestHistory;
