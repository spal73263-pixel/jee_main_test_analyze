import React, { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  Calendar,
  AlertCircle,
  Sparkles,
  Award,
  Layers,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { predictionsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TargetPredictor = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, updateUserProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [targetMarksInput, setTargetMarksInput] = useState(220);
  const [targetPctInput, setTargetPctInput] = useState(99.0);
  const [targetDateInput, setTargetDateInput] = useState('2026-01-24');

  useEffect(() => {
    fetchTargetAnalysis();
  }, []);

  const fetchTargetAnalysis = async () => {
    setLoading(true);
    try {
      const res = await predictionsAPI.getTargetAnalysis();
      setData(res.data);
      setTargetMarksInput(res.data.target_marks);
      setTargetPctInput(res.data.target_percentile);
      setTargetDateInput(res.data.target_date);
    } catch (err) {
      console.error('Failed to load target predictor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTargets = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        target_marks: Number(targetMarksInput),
        target_percentile: Number(targetPctInput),
        target_exam_date: targetDateInput
      });
      setEditing(false);
      fetchTargetAnalysis();
    } catch (err) {
      alert('Failed to update targets: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const milestones = data?.progression_milestones || [];
  const progressPercent = data?.target_marks > 0
    ? Math.min(100, Math.round((data.current_average_marks / data.target_marks) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">JEE Main Target & Trajectory Tracker</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Milestone gap analysis, score growth pacing, and calibrated percentile benchmarks.
          </p>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors self-start sm:self-center"
        >
          {editing ? 'Close Target Editor' : 'Adjust Target Goals'}
        </button>
      </div>

      {/* Target Editor Drawer */}
      {editing && (
        <form onSubmit={handleSaveTargets} className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-sm space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-900">Configure Examination Milestones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Total Marks (out of 300)</label>
              <input
                type="number"
                min={80}
                max={300}
                value={targetMarksInput}
                onChange={(e) => setTargetMarksInput(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Percentile Benchmark</label>
              <input
                type="number"
                step="0.05"
                min={70}
                max={100}
                value={targetPctInput}
                onChange={(e) => setTargetPctInput(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Examination Date</label>
              <input
                type="date"
                value={targetDateInput}
                onChange={(e) => setTargetDateInput(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              Save Targets
            </button>
          </div>
        </form>
      )}

      {/* Target Progress Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">Goal Readiness</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white">{data?.current_average_marks}</span>
              <span className="text-sm text-slate-300 font-semibold">/ {data?.target_marks} Target Marks</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 mt-2">
              You are currently at <strong className="text-emerald-400 font-bold">{progressPercent}%</strong> of your target score threshold.
            </p>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-white/10 md:pl-6 space-y-1">
            <p className="text-xs text-slate-400 font-semibold">Score Gap</p>
            <p className="text-2xl font-extrabold text-amber-400">+{data?.marks_gap} Marks</p>
            <p className="text-[11px] text-slate-300">Required overall gain</p>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-white/10 md:pl-6 space-y-1">
            <p className="text-xs text-slate-400 font-semibold">Required Pace</p>
            <p className="text-2xl font-extrabold text-emerald-400">+{data?.required_marks_per_test} M / Test</p>
            <p className="text-[11px] text-slate-300">Across remaining mock tests</p>
          </div>
        </div>
      </div>

      {/* Subject-Wise Target Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(data?.subject_targets || {}).map(([sub, info]) => (
          <div key={sub} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-sm">{sub}</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Target: {info.target} M
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <p className="text-[11px] text-slate-400">Current Average</p>
                <p className="text-xl font-extrabold text-slate-800">{info.current_avg} M</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Subject Gap</p>
                <p className="text-lg font-bold text-rose-600">+{info.gap} M</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projected Trajectory Graph with Upper/Lower Uncertainty Bounds */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Projected Milestone Growth Trajectory</h2>
          <p className="text-xs text-slate-500">
            Simulated trajectory model showing upper and lower bounds (±8 Marks uncertainty) towards target exam date ({data?.days_remaining} days remaining).
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={milestones} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
              <YAxis domain={[0, 300]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="upper_bound_estimate" name="Upper Estimate" stroke="#cbd5e1" fillOpacity={0} strokeDasharray="2 2" />
              <Area type="monotone" dataKey="projected_marks" name="Projected Score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#projGrad)" dot={{ r: 4 }} />
              <Area type="monotone" dataKey="lower_bound_estimate" name="Lower Estimate" stroke="#cbd5e1" fillOpacity={0} strokeDasharray="2 2" />
              <Line type="monotone" dataKey="target_benchmark" name="Target Benchmark" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Statistical Calibration Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {data?.historical_calibration_note}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TargetPredictor;
