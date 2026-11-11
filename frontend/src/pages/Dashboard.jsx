import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart2,
  UploadCloud,
  ChevronRight,
  AlertTriangle,
  Calendar,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { dashboardAPI, hscRevisionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../utils/useAutoRefresh';

const PIE_COLORS = ['#10b981', '#f43f5e', '#cbd5e1'];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [hscCount, setHscCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, cloudStatus, syncVersion } = useAuth();
  const navigate = useNavigate();

  const fetchDashboard = React.useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [res, hscRes] = await Promise.all([
        dashboardAPI.getOverview(),
        hscRevisionAPI.getChapters().catch(() => ({ data: [] })),
      ]);
      setData(res.data);
      setHscCount(Array.isArray(hscRes.data) ? hscRes.data.length : 0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard({ silent: syncVersion > 0 });
  }, [fetchDashboard, syncVersion]);

  useAutoRefresh(() => fetchDashboard({ silent: true }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasTests = data && data.total_tests > 0;

  const pieData = data?.question_status_breakdown ? [
    { name: 'Correct', value: data.question_status_breakdown.Correct || 0 },
    { name: 'Incorrect', value: data.question_status_breakdown.Incorrect || 0 },
    { name: 'Unattempted', value: data.question_status_breakdown.Unattempted || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      {cloudStatus?.loaded && cloudStatus?.requires_cloud_config && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Cloud Sync Database Required for Cross-Phone Sharing</p>
            <p className="text-amber-800 mt-0.5">
              Connect <strong>Upstash Redis</strong>, <strong>Neon Postgres</strong>, or <strong>Vercel Blob</strong> in{' '}
              <strong>Vercel Dashboard &rarr; Storage</strong> (or add <code className="font-mono bg-amber-100 px-1 rounded">MONGODB_URI</code>), then Redeploy so Om Pal&apos;s updates appear on parents&apos; phones.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>JEE Main Aspirant Diagnostic Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || 'Student'}!
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Track your JEE mock tests, accuracy trends, weak chapters, and HSC Class 12 revision progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload New Test</span>
            </button>
            <button
              onClick={() => navigate('/hsc-revision')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-sm transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>HSC Revision</span>
            </button>
            <button
              onClick={() => navigate('/study-planner')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Study Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Tests */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">1. Tests Attempted</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{data?.total_tests || 0}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Logged</span>
          </div>
        </div>

        {/* Card 2: Highest Marks */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">2. Highest Marks</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-600">{data?.highest_marks || 0}</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Card 3: Average Accuracy */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">3. Average Accuracy</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-600">{data?.average_accuracy || 0}%</span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              {data?.average_accuracy >= 75 ? 'Optimal' : 'Needs Focus'}
            </span>
          </div>
        </div>

        {/* Card 4: Average Percentile */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">4. Avg Percentile</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-violet-600">
              {data?.average_percentile ? `${data.average_percentile}%ile` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400">Official Only</span>
          </div>
        </div>

        {/* Card 5: Latest Test Score */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-slate-500">5. Latest Test Score</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{data?.latest_test_score || 0}</span>
            <span className="text-xs text-indigo-600 truncate max-w-[90px]" title={data?.latest_test_name || ''}>
              {data?.latest_test_name?.slice(0, 12) || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Marks Progression Line Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Marks Progression Across Mock Tests</h2>
              <p className="text-xs text-slate-500">Physics, Chemistry, and Mathematics trajectories</p>
            </div>
            <button
              onClick={() => navigate('/compare')}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Compare Tests</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72 w-full">
            {hasTests ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.marks_history || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="test_name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[0, 300]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="total_marks" name="Total Marks" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="physics" name="Physics" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="chemistry" name="Chemistry" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="mathematics" name="Maths" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <BarChart2 className="w-8 h-8 mb-2 opacity-50" />
                <span>Upload your first test to render marks progression</span>
              </div>
            )}
          </div>
        </div>

        {/* Correct vs Incorrect vs Unattempted Donut Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-slate-900 mb-1">Attempt Quality Breakdown</h2>
          <p className="text-xs text-slate-500 mb-3">Question status distribution across logged tests</p>

          <div className="h-56 w-full flex items-center justify-center">
            {hasTests ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">No attempt data</div>
            )}
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <p className="text-[10px] font-semibold text-emerald-700">Correct</p>
              <p className="text-sm font-bold text-emerald-800">{data?.question_status_breakdown?.Correct || 0}</p>
            </div>
            <div className="p-2 bg-rose-50 rounded-xl">
              <p className="text-[10px] font-semibold text-rose-700">Incorrect</p>
              <p className="text-sm font-bold text-rose-800">{data?.question_status_breakdown?.Incorrect || 0}</p>
            </div>
            <div className="p-2 bg-slate-100 rounded-xl">
              <p className="text-[10px] font-semibold text-slate-600">Left</p>
              <p className="text-sm font-bold text-slate-800">{data?.question_status_breakdown?.Unattempted || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Subject Performance Comparison & Accuracy Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-Wise Comparison Bar Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Subject-Wise Marks Comparison</h2>
              <p className="text-xs text-slate-500">Subject score and negative marking loss</p>
            </div>
            <button
              onClick={() => navigate('/test-analysis')}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Test Analysis</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subject_comparison || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="average_marks" name="Subject Marks" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total_negative_marks" name="Negative Marks Lost" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy Progression Area Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Accuracy & Attempt Rate Progression</h2>
              <p className="text-xs text-slate-500">Efficiency and question selection trend</p>
            </div>
            <button
              onClick={() => navigate('/test-analysis')}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Test Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.accuracy_history || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="test_name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#10b981" fillOpacity={1} fill="url(#accGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="attempt_rate" name="Attempt Rate %" stroke="#6366f1" fillOpacity={1} fill="url(#attGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Banners: Weak Topics, HSC Revision & Study Planner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {data?.weak_topics_count || 0} Weak Chapters Identified
              </h3>
              <p className="text-xs text-amber-700">Topics below 50% accuracy requiring revision</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/weak-topics')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0"
          >
            Review Topics
          </button>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                HSC Revision ({hscCount} {hscCount === 1 ? 'Chapter' : 'Chapters'})
              </h3>
              <p className="text-xs text-emerald-700">Track Physics, Maths, English, Chem & CS</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/hsc-revision')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0"
          >
            Open Revision
          </button>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900">7-Day Study Planner</h3>
              <p className="text-xs text-indigo-700">Weekly schedule mapped to focus chapters</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/study-planner')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0"
          >
            Open Planner
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
