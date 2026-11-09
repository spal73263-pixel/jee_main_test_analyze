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
  CheckCircle2,
  PlusCircle,
  Trash2,
  Tag,
  Circle,
  HelpCircle,
  Layers,
  GraduationCap
} from 'lucide-react';
import { dashboardAPI } from '../services/api';

const WeakTopics = () => {
  const [data, setData] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weak');

  // Form states for adding custom weak topic reminder
  const [showForm, setShowForm] = useState(true);
  const [subject, setSubject] = useState('Physics');
  const [chapterName, setChapterName] = useState('');
  const [marksLost, setMarksLost] = useState('');
  const [examType, setExamType] = useState('JEE Main');
  const [notes, setNotes] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [weakRes, remRes] = await Promise.all([
        dashboardAPI.getWeakTopics(),
        dashboardAPI.getReminders()
      ]);
      setData(weakRes.data);
      setReminders(remRes.data);
    } catch (err) {
      console.error('Failed to fetch weak topics or reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!chapterName.trim()) {
      alert('Please enter a chapter name.');
      return;
    }

    setSavingReminder(true);
    try {
      const payload = {
        subject,
        chapter_name: chapterName.trim(),
        marks_lost: marksLost ? parseFloat(marksLost) : 0.0,
        exam_type: examType,
        notes: notes.trim() || null
      };

      const res = await dashboardAPI.addReminder(payload);
      setReminders(prev => [res.data, ...prev]);

      // Reset form
      setChapterName('');
      setMarksLost('');
      setNotes('');
    } catch (err) {
      alert('Failed to save reminder: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingReminder(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await dashboardAPI.deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const handleToggleReminder = async (id) => {
    try {
      const res = await dashboardAPI.toggleReminder(id);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_resolved: res.data.is_resolved } : r));
    } catch (err) {
      console.error('Failed to toggle reminder status:', err);
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
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Weak Topics & Marks Reminders</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Add custom subject, chapter, and marks lost reminders to maintain vigilance before your next <strong className="text-indigo-600">JEE Main</strong>, <strong className="text-purple-600">JEE Advanced</strong>, or <strong className="text-emerald-600">Class 12th Board Exam</strong>.
        </p>
      </div>

      {/* 📌 SECTION 1: ADD WEAK TOPIC & MARKS REMINDER FORM */}
      <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Add Weak Topic & Marks Reminder</h2>
              <p className="text-xs text-slate-500">Log a specific topic and marks lost to remind yourself for upcoming revision</p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {showForm ? 'Hide Form' : 'Show Form'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science 1 (CS 1)">Computer Science 1 (CS 1)</option>
                  <option value="Computer Science 2 (CS 2)">Computer Science 2 (CS 2)</option>
                  <option value="English">English</option>
                </select>
              </div>

              {/* Chapter Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chapter / Specific Concept Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rotational Motion (Rolling Dynamics) or Electrostatics"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Marks Lost / Target Marks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marks Conceded / Lost</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. -8 or 10"
                  value={marksLost}
                  onChange={(e) => setMarksLost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Exam Context */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Context</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Advanced">JEE Advanced</option>
                  <option value="Board Exam Class 12th">Board Exam Class 12th</option>
                </select>
              </div>

              {/* Notes / Action Reminder */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Notes & Revision Cue</label>
                <input
                  type="text"
                  placeholder="e.g. Re-solve 2022-2024 PYQs and review moment of inertia theorems"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingReminder}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{savingReminder ? 'Adding...' : 'Save Reminder'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* 📌 SECTION 2: MY WEAK TOPIC & MARKS REMINDER NOTEBOOK */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>📌 My Weak Topic & Marks Reminders</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                {reminders.filter(r => !r.is_resolved).length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-500">Tracked weaknesses with subject, chapter name, and marks lost</p>
          </div>
        </div>

        {reminders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  rem.is_resolved
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200/90 shadow-xs hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      rem.subject === 'Physics' ? 'bg-sky-50 text-sky-700' :
                      rem.subject === 'Chemistry' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {rem.subject}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                      {rem.exam_type}
                    </span>
                  </div>

                  <h4 className={`text-sm font-extrabold ${rem.is_resolved ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {rem.chapter_name}
                  </h4>

                  {/* Marks Lost Highlight */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Marks Impact:</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-rose-100/80 text-rose-800">
                      {rem.marks_lost <= 0 ? `${rem.marks_lost} Marks` : `-${rem.marks_lost} Marks`}
                    </span>
                  </div>

                  {rem.notes && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {rem.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleReminder(rem.id)}
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      rem.is_resolved ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rem.is_resolved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Mastered</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-400" />
                        <span>Mark Resolved</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    title="Remove reminder"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            No weak topic reminders logged yet. Use the form above to add your first reminder!
          </div>
        )}
      </div>

      {/* 📌 SECTION 3: AUTOMATIC MOCK TEST DIAGNOSTICS */}
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
            <h3 className="text-sm font-bold text-rose-900">Chapters with Recurring Mistakes & Negative Marking</h3>
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

      {/* Threshold Classification Tabs */}
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
                <button
                  onClick={() => {
                    setSubject(c.subject);
                    setChapterName(c.chapter_name);
                    setMarksLost(c.incorrect * 1.0);
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Reminder</span>
                </button>
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
