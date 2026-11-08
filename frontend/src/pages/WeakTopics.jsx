import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Award,
  TrendingDown,
  Sparkles,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { dashboardAPI } from '../services/api';

const WeakTopics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weak');

  useEffect(() => {
    fetchWeakAnalysis();
  }, []);

  const fetchWeakAnalysis = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getWeakTopics();
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch weak topics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const weak = data?.weak_topics || [];
  const average = data?.average_topics || [];
  const strong = data?.strong_topics || [];
  const repeated = data?.repeated_mistakes || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Weak Topic & Mistake Diagnostic</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Threshold-based classification (Weak: &lt;50%, Average: 50–79%, Strong: 80–100%) and negative marking root causes.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Strongest Subject</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base sm:text-lg font-extrabold text-emerald-600">{data?.strongest_subject || 'N/A'}</span>
            <Award className="w-5 h-5 text-emerald-500 shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Weakest Subject</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base sm:text-lg font-extrabold text-rose-600">{data?.weakest_subject || 'N/A'}</span>
            <TrendingDown className="w-5 h-5 text-rose-500 shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Strongest Chapter</p>
          <p className="text-sm font-bold text-slate-900 truncate mt-1" title={data?.strongest_chapter}>
            {data?.strongest_chapter || 'N/A'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Critical Focus Chapter</p>
          <p className="text-sm font-bold text-rose-600 truncate mt-1" title={data?.weakest_chapter}>
            {data?.weakest_chapter || 'N/A'}
          </p>
        </div>
      </div>

      {/* Repeated Mistakes Card */}
      {repeated.length > 0 && (
        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-900">Chapters with Recurring Mistakes & Negative Marking</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {repeated.map((m) => (
              <div key={m.chapter} className="p-3.5 rounded-xl bg-white border border-rose-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{m.chapter} ({m.subject})</span>
                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                    {m.incorrect_count} Errors • {m.accuracy}% Acc
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{m.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classification Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTab('weak')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'weak' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Weak Topics (&lt;50% Acc) ({weak.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('average')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'average' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Average Topics (50–79% Acc) ({average.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('strong')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'strong' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Strong Topics (≥80% Acc) ({strong.length})</span>
          </button>
        </div>

        {/* List of Chapters for the selected Tab */}
        <div className="space-y-3 pt-2">
          {(activeTab === 'weak' ? weak : activeTab === 'average' ? average : strong).map((c) => (
            <div
              key={`${c.subject}-${c.chapter_name}`}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {c.subject}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{c.unit_category}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{c.chapter_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.attempted} attempted • <span className="text-emerald-600 font-semibold">{c.correct} correct</span> • <span className="text-rose-600 font-semibold">{c.incorrect} incorrect</span>
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400">Accuracy</p>
                  <p className={`text-lg font-extrabold ${
                    c.accuracy >= 80 ? 'text-emerald-600' :
                    c.accuracy >= 50 ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>
                    {c.accuracy}%
                  </p>
                </div>
                <a
                  href="/study-planner"
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <span>Plan Revision</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}

          {(activeTab === 'weak' ? weak : activeTab === 'average' ? average : strong).length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No chapters in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeakTopics;
