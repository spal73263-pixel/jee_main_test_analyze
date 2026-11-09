import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  UploadCloud
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { testsAPI, predictionsAPI } from '../services/api';

const TestComparison = () => {
  const navigate = useNavigate();
  const [allTests, setAllTests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await testsAPI.getTests();
      setAllTests(res.data);
      if (res.data.length >= 2) {
        // Select first 2 or 3 tests by default
        const initIds = res.data.slice(-3).map(t => t.id);
        setSelectedIds(initIds);
        compareSelected(initIds);
      }
    } catch (err) {
      console.error('Failed to load tests:', err);
    }
  };

  const compareSelected = async (ids) => {
    if (ids.length < 2) return;
    setLoading(true);
    try {
      const res = await predictionsAPI.compareTests({ test_ids: ids });
      setComparison(res.data);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTest = (id) => {
    let next;
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 2) {
        alert('Please keep at least 2 tests selected for comparison.');
        return;
      }
      next = selectedIds.filter(x => x !== id);
    } else {
      next = [...selectedIds, id];
    }
    setSelectedIds(next);
    compareSelected(next);
  };

  const deltas = comparison?.deltas || {};
  const metrics = comparison?.metrics_comparison || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Multi-Test Comparison Engine</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Select two or more tests to evaluate metric progression, growth vectors, and primary subject contributors.
        </p>
      </div>

      {/* Test Multi-Selector Checkboxes */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Select Tests to Compare ({selectedIds.length} Selected)
        </p>
        {allTests.length < 2 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-500">
              You currently have {allTests.length} test{allTests.length === 1 ? '' : 's'} logged. Add at least 2 tests to compare scores side-by-side.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Enter Test Results</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allTests.map(t => {
              const isSelected = selectedIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => handleToggleTest(t.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                    isSelected ? 'border-white bg-white/20' : 'border-slate-400'
                  }`}>
                    {isSelected && <span className="text-[10px] leading-none">✓</span>}
                  </div>
                  <span>{t.test_name}</span>
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    ({t.marks_obtained} M)
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comparison ? (
        <>
          {/* Delta Highlight Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300">
                Progression from {deltas.first_test_name} to {deltas.last_test_name}
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-3xl sm:text-4xl font-extrabold ${
                  deltas.total_marks >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {deltas.total_marks >= 0 ? `+${deltas.total_marks}` : deltas.total_marks} Marks
                </span>
                <span className="text-sm text-slate-300">
                  (Accuracy: {deltas.overall_accuracy >= 0 ? `+${deltas.overall_accuracy}` : deltas.overall_accuracy}%)
                </span>
              </div>
            </div>

            {/* Primary Contributor Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 max-w-sm">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Primary Growth Contributor</span>
              </div>
              <p className="text-base font-extrabold text-white">
                {comparison.primary_contributor}: {deltas.subject_deltas?.[comparison.primary_contributor] >= 0 ? `+${deltas.subject_deltas?.[comparison.primary_contributor]}` : deltas.subject_deltas?.[comparison.primary_contributor]} Marks
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                This subject drove the largest positive score transformation across the selected tests.
              </p>
            </div>
          </div>

          {/* Comparison Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject-Wise Marks Comparison across Tests */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">Subject Marks Breakdown Across Tests</h3>
              <p className="text-xs text-slate-500 mb-4">Physics, Chemistry, and Mathematics score deltas</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="test_name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="physics_marks" name="Physics" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="chemistry_marks" name="Chemistry" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maths_marks" name="Maths" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Total Marks & Accuracy Progression Curve */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">Score & Accuracy Growth Curve</h3>
              <p className="text-xs text-slate-500 mb-4">Tracking total marks against question selection accuracy</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="test_name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis yAxisId="left" domain={[0, 300]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="total_marks" name="Total Score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Side-by-Side Metrics Matrix</h3>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Metric</th>
                    {metrics.map(m => (
                      <th key={m.test_id} className="py-2.5 px-3 text-center">
                        {m.test_name} ({m.test_date})
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center text-indigo-700 bg-indigo-50/50">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Total Marks (out of 300)</td>
                    {metrics.map(m => (
                      <td key={m.test_id} className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {m.total_marks}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-extrabold text-indigo-700 bg-indigo-50/30">
                      {deltas.total_marks >= 0 ? `+${deltas.total_marks}` : deltas.total_marks}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">Physics Marks</td>
                    {metrics.map(m => (
                      <td key={m.test_id} className="py-2.5 px-3 text-center text-slate-700">
                        {m.physics_marks}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-bold text-sky-700 bg-indigo-50/30">
                      {deltas.subject_deltas?.Physics >= 0 ? `+${deltas.subject_deltas?.Physics}` : deltas.subject_deltas?.Physics}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">Chemistry Marks</td>
                    {metrics.map(m => (
                      <td key={m.test_id} className="py-2.5 px-3 text-center text-slate-700">
                        {m.chemistry_marks}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-indigo-50/30">
                      {deltas.subject_deltas?.Chemistry >= 0 ? `+${deltas.subject_deltas?.Chemistry}` : deltas.subject_deltas?.Chemistry}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">Mathematics Marks</td>
                    {metrics.map(m => (
                      <td key={m.test_id} className="py-2.5 px-3 text-center text-slate-700">
                        {m.maths_marks}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-indigo-50/30">
                      {deltas.subject_deltas?.Mathematics >= 0 ? `+${deltas.subject_deltas?.Mathematics}` : deltas.subject_deltas?.Mathematics}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">Overall Accuracy</td>
                    {metrics.map(m => (
                      <td key={m.test_id} className="py-2.5 px-3 text-center text-slate-700">
                        {m.accuracy}%
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-indigo-50/30">
                      {deltas.overall_accuracy >= 0 ? `+${deltas.overall_accuracy}%` : `${deltas.overall_accuracy}%`}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">Percentile (Official)</td>
                    {metrics.map(m => (
                      <td key={m.test_id} className="py-2.5 px-3 text-center text-violet-700 font-semibold">
                        {m.percentile ? `${m.percentile}%ile` : 'N/A'}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center text-slate-400 bg-indigo-50/30">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default TestComparison;
