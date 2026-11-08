import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { subjectsAPI } from '../services/api';

const ChapterAnalysis = () => {
  const [subject, setSubject] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, [subject]);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const params = subject !== 'All' ? { subject } : {};
      const res = await subjectsAPI.getBreakdown(params);
      setChapters(res.data.chapters || []);
    } catch (err) {
      console.error('Failed to fetch chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = chapters.filter(c => {
    if (searchTerm && !c.chapter_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">JEE Main Chapter Syllabus Mastery</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed chapter-by-chapter accuracy and question volume tracked against the official NTA JEE Main syllabus.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chapters (e.g. Calculus, Optics)..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {['All', 'Physics', 'Chemistry', 'Mathematics'].map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  subject === s ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ch) => (
            <div
              key={`${ch.subject}-${ch.chapter_name}`}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    ch.subject === 'Physics' ? 'bg-sky-50 text-sky-700' :
                    ch.subject === 'Chemistry' ? 'bg-emerald-50 text-emerald-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {ch.subject} • {ch.unit_category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ch.classification === 'Strong' ? 'bg-emerald-100 text-emerald-800' :
                    ch.classification === 'Weak' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {ch.classification}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1">{ch.chapter_name}</h3>
                <p className="text-[11px] text-slate-500 mb-3">
                  {ch.total_questions} Questions Seen • {ch.attempted} Attempted
                </p>

                {/* Accuracy Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className={`h-2 rounded-full ${
                      ch.accuracy >= 80 ? 'bg-emerald-500' :
                      ch.accuracy >= 50 ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, ch.accuracy)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 mt-3">
                <span className="font-semibold text-slate-700">Accuracy: {ch.accuracy}%</span>
                <span className="text-[11px] text-slate-500">
                  <strong className="text-emerald-600">{ch.correct} Right</strong> / <strong className="text-rose-600">{ch.incorrect} Wrong</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChapterAnalysis;
