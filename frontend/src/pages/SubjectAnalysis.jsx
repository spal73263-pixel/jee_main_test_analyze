import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  Award,
  AlertCircle,
  TrendingUp,
  Clock,
  Layers
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { subjectsAPI, dashboardAPI } from '../services/api';

const SUBJECT_TABS = [
  { id: 'Physics', name: 'Physics', icon: Atom, color: 'text-sky-600', bg: 'bg-sky-50' },
  { id: 'Chemistry', name: 'Chemistry', icon: FlaskConical, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'Mathematics', name: 'Mathematics', icon: Calculator, color: 'text-amber-600', bg: 'bg-amber-50' },
];

const SubjectAnalysis = () => {
  const [activeSubject, setActiveSubject] = useState('Physics');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectData(activeSubject);
  }, [activeSubject]);

  const fetchSubjectData = async (sub) => {
    setLoading(true);
    try {
      const res = await subjectsAPI.getBreakdown({ subject: sub });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch subject breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  const chapters = data?.chapters || [];
  const units = data?.units || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Subject Deep Dive Analysis</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed syllabus unit breakdowns, accuracy distribution, and chapter-wise performance across mock tests.
        </p>
      </div>

      {/* Subject Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {SUBJECT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubject === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubject(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Unit Level Radar / Bar Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">{activeSubject} Unit Accuracy Breakdown</h2>
              <p className="text-xs text-slate-500 mb-4">Accuracy percentage across major syllabus unit clusters</p>

              <div className="h-72 w-full">
                {units.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={units} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                      <YAxis type="category" dataKey="unit_name" tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                      <Bar dataKey="accuracy" name="Accuracy %" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    No unit data available for this subject
                  </div>
                )}
              </div>
            </div>

            {/* Syllabus Unit Summary Cards */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Unit Weightage & Mastery</h3>
                <p className="text-xs text-slate-500 mb-4">Target focus zones</p>

                <div className="space-y-3">
                  {units.map((u) => (
                    <div key={u.unit_name} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">{u.unit_name}</span>
                        <span className={`font-extrabold ${u.accuracy >= 75 ? 'text-emerald-600' : u.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {u.accuracy}% Acc
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${u.accuracy >= 75 ? 'bg-emerald-500' : u.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, u.accuracy)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{u.correct} Correct of {u.attempted} Attempted</span>
                        <span>{u.marks} Marks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-indigo-50 text-indigo-900 text-xs font-medium">
                Tip: Maintain {activeSubject} accuracy above 80% before speeding up attempt volume.
              </div>
            </div>
          </div>

          {/* Chapter Table for this Subject */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">{activeSubject} Chapter Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Categorized into Strong, Average, and Weak performance tiers</p>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Chapter Name</th>
                    <th className="py-2.5 px-3 text-left">Unit Classification</th>
                    <th className="py-2.5 px-3 text-center">Attempted</th>
                    <th className="py-2.5 px-3 text-center">Correct</th>
                    <th className="py-2.5 px-3 text-center">Incorrect</th>
                    <th className="py-2.5 px-3 text-center">Accuracy</th>
                    <th className="py-2.5 px-3 text-center">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {chapters.map((ch) => (
                    <tr key={ch.chapter_name} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ch.chapter_name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">{ch.unit_category}</td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">{ch.attempted}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{ch.correct}</td>
                      <td className="py-2.5 px-3 text-center text-rose-700 font-bold">{ch.incorrect}</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-slate-800">{ch.accuracy}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ch.classification === 'Strong' ? 'bg-emerald-50 text-emerald-700' :
                          ch.classification === 'Weak' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {ch.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SubjectAnalysis;
