import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { testsAPI } from '../services/api';

const TIME_COLORS = ['#10b981', '#f43f5e', '#cbd5e1'];

const TimeManagement = () => {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [timeData, setTimeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTestId) {
      fetchTimeAnalytics(selectedTestId);
    }
  }, [selectedTestId]);

  const fetchTests = async () => {
    try {
      const res = await testsAPI.getTests();
      setTests(res.data);
      if (res.data.length > 0) {
        setSelectedTestId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeAnalytics = async (id) => {
    setLoading(true);
    try {
      const res = await testsAPI.getTimeAnalytics(id);
      setTimeData(res.data);
    } catch (err) {
      console.error('Failed to fetch time analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const subTimes = timeData?.subject_times || {};
  const subChartData = [
    { subject: 'Physics', minutes: Math.round((subTimes.Physics || 3600) / 60) },
    { subject: 'Chemistry', minutes: Math.round((subTimes.Chemistry || 3000) / 60) },
    { subject: 'Mathematics', minutes: Math.round((subTimes.Mathematics || 4200) / 60) },
  ];

  const qualityTimeData = [
    { name: 'Time on Correct', value: Math.round((timeData?.time_spent_correct_seconds || 0) / 60) },
    { name: 'Time on Incorrect', value: Math.round((timeData?.time_spent_incorrect_seconds || 0) / 60) },
    { name: 'Time on Unattempted', value: Math.round((timeData?.time_spent_unattempted_seconds || 0) / 60) },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Time Management Intelligence</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Speed-accuracy curves, subject pacing, and high-drain question detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Select Test:</label>
          <select
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
          >
            {tests.map(t => (
              <option key={t.id} value={t.id}>
                {t.test_name} ({t.test_date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Timing Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Exam Duration</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{timeData?.total_duration_minutes || 180}</span>
            <span className="text-xs text-slate-400 font-medium">Minutes</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Avg Time Per Attempt</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-600">
              {timeData?.avg_time_per_attempted_seconds ? `${timeData.avg_time_per_attempted_seconds}s` : '135s'}
            </span>
            <span className="text-[10px] text-slate-400">~2.2 mins</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Slow Questions (&gt;3.5m)</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600">
              {timeData?.excessive_time_questions_count || 0}
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">Caution</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Time on Wrong Ans</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-600">
              {Math.round((timeData?.time_spent_incorrect_seconds || 0) / 60)}
            </span>
            <span className="text-xs text-rose-500 font-medium">Mins Lost</span>
          </div>
        </div>
      </div>

      {/* Timing Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Pace Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Subject Pacing Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Minutes allocated across subjects (Recommended: 45m Chem, 55m Phy, 75m Maths)</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                <YAxis unit="m" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="minutes" name="Time Spent (Mins)" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productive vs Unproductive Time */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-slate-900 mb-1">Time Utilization Quality</h2>
          <p className="text-xs text-slate-500 mb-3">Time invested in successful answers vs negative mistakes</p>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qualityTimeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {qualityTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TIME_COLORS[index % TIME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-slate-500 text-center mt-auto pt-2 border-t border-slate-100">
            {timeData?.time_spent_incorrect_seconds > 0
              ? `You invested ${Math.round(timeData.time_spent_incorrect_seconds / 60)} minutes into questions that ultimately conceded negative marks.`
              : 'Clean time management logged with minimal error drain.'}
          </p>
        </div>
      </div>

      {/* Questions Taking Excessive Time Table */}
      {timeData?.excessive_time_questions && timeData.excessive_time_questions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Questions Taking Excessive Time (&gt;210 seconds)</h3>
          </div>
          <p className="text-xs text-slate-500">
            These questions required disproportionate time and are prime candidates for skipping during Round 1 of the exam:
          </p>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-center">Question</th>
                  <th className="py-2.5 px-3 text-left">Subject</th>
                  <th className="py-2.5 px-3 text-left">Chapter</th>
                  <th className="py-2.5 px-3 text-center">Difficulty</th>
                  <th className="py-2.5 px-3 text-center">Outcome</th>
                  <th className="py-2.5 px-3 text-right">Time Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {timeData.excessive_time_questions.map((q) => (
                  <tr key={q.question_number} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">Q{q.question_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{q.subject}</td>
                    <td className="py-2.5 px-3 text-slate-600">{q.chapter}</td>
                    <td className="py-2.5 px-3 text-center text-purple-700 font-semibold">{q.difficulty}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-bold ${q.status === 'Correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-amber-600">
                      {Math.floor(q.time_spent / 60)}m {q.time_spent % 60}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Practical Pacing Recommendations */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-bold text-indigo-950">Recommended Mock Test Pacing Strategy</h4>
        </div>
        <ul className="text-xs text-indigo-900 space-y-1.5 pl-5 list-disc">
          <li><strong>Round 1 (Minutes 0 - 60):</strong> Solve only direct formula-based questions in Chemistry & Physics (&lt;90 seconds each). Do not touch lengthy calculation problems.</li>
          <li><strong>Round 2 (Minutes 60 - 130):</strong> Solve standard numericals and moderate Mathematics questions. Cap each question strictly at 3 minutes.</li>
          <li><strong>Round 3 (Minutes 130 - 180):</strong> Revisit marked-for-review questions. Avoid wild guesses where you cannot eliminate at least 2 options.</li>
        </ul>
      </div>
    </div>
  );
};

export default TimeManagement;
