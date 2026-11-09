import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  PlusCircle,
  Trash2,
  Search,
  RotateCcw,
  BookOpen,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { hscRevisionAPI } from '../services/api';

const HSC_SUBJECTS = [
  {
    id: 'Physics',
    label: 'Physics',
    placeholder: 'e.g. Rotational Dynamics, Mechanical Properties of Fluids, Electrostatics',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    cardActiveClass: 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20',
    countColor: 'text-sky-700',
  },
  {
    id: 'Maths',
    label: 'Maths',
    placeholder: 'e.g. Matrices, Differentiation, Definite Integration, Vectors',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    cardActiveClass: 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20',
    countColor: 'text-amber-700',
  },
  {
    id: 'English',
    label: 'English',
    placeholder: "e.g. An Astrologer's Day, Song of the Open Road, Novel Section",
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    cardActiveClass: 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20',
    countColor: 'text-rose-700',
  },
  {
    id: 'Chemistry',
    label: 'Chemistry',
    placeholder: 'e.g. Solid State, Solutions, Chemical Thermodynamics, Aldehydes',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardActiveClass: 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20',
    countColor: 'text-emerald-700',
  },
  {
    id: 'CS',
    label: 'CS',
    placeholder: 'e.g. CS 1: Operating Systems & C++, CS 2: 8085 Microprocessor',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardActiveClass: 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20',
    countColor: 'text-indigo-700',
  },
];

const HSCRevision = () => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Chapter Form state
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  const [chapterName, setChapterName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // List Filter state
  const [filterSubject, setFilterSubject] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await hscRevisionAPI.getChapters();
      setChapters(res.data || []);
    } catch (err) {
      console.error('Failed to load HSC revisions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!chapterName.trim()) {
      setFormError('Please enter the chapter name whose revision you completed.');
      return;
    }

    setSaving(true);
    try {
      const res = await hscRevisionAPI.addChapter({
        subject: selectedSubject,
        chapter_name: chapterName.trim(),
        notes: notes.trim(),
      });
      setChapters((prev) => [res.data, ...prev]);
      setChapterName('');
      setNotes('');
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to save chapter.');
    } finally {
      setSaving(false);
    }
  };

  const handleIncrementRevision = async (id) => {
    try {
      const res = await hscRevisionAPI.incrementRevision(id);
      setChapters((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch (err) {
      console.error('Failed to increment revision:', err);
    }
  };

  const handleDeleteChapter = async (id) => {
    try {
      await hscRevisionAPI.deleteChapter(id);
      setChapters((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete chapter:', err);
    }
  };

  const getSubjectMeta = (subName) =>
    HSC_SUBJECTS.find((s) => s.id === subName) || HSC_SUBJECTS[0];

  const subjectCounts = HSC_SUBJECTS.reduce((acc, s) => {
    acc[s.id] = chapters.filter((c) => c.subject === s.id).length;
    return acc;
  }, {});

  const filteredChapters = chapters.filter((c) => {
    if (filterSubject !== 'All' && c.subject !== filterSubject) return false;
    if (searchTerm.trim()) {
      const needle = searchTerm.trim().toLowerCase();
      return (
        String(c.chapter_name || '').toLowerCase().includes(needle) ||
        String(c.notes || '').toLowerCase().includes(needle) ||
        String(c.subject || '').toLowerCase().includes(needle)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeSubjectMeta = getSubjectMeta(selectedSubject);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span>HSC Revision Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Add chapters you have completed revising across Physics, Maths, English, Chemistry, and CS.
          </p>
        </div>

        <div className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{chapters.length} Completed {chapters.length === 1 ? 'Chapter' : 'Chapters'}</span>
        </div>
      </div>

      {/* 5 Subject Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {HSC_SUBJECTS.map((sub) => {
          const isFiltered = filterSubject === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                setFilterSubject(isFiltered ? 'All' : sub.id);
                setSelectedSubject(sub.id);
              }}
              className={`text-left rounded-2xl p-4 border transition-all bg-white shadow-xs hover:border-slate-300 ${
                isFiltered ? sub.cardActiveClass : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${sub.badgeClass}`}>
                  {sub.label}
                </span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${sub.countColor}`}>
                  {subjectCounts[sub.id] || 0}
                </span>
                <span className="text-[11px] font-medium text-slate-500">revised</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Completed HSC Revision Chapter Form */}
      <form
        onSubmit={handleAddChapter}
        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <span>Add Completed Chapter Revision</span>
          </h2>
          <span className="text-[11px] font-medium text-slate-400">Saved on this web page</span>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Subject Quick Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            1. Select HSC Subject
          </label>
          <div className="flex flex-wrap gap-2">
            {HSC_SUBJECTS.map((sub) => {
              const active = selectedSubject === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubject(sub.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chapter Name & Notes Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Completed Chapter Name ({selectedSubject})
            </label>
            <input
              type="text"
              required
              placeholder={activeSubjectMeta.placeholder}
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-indigo-600"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Revision Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Solved textbook exercises & past HSC questions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-indigo-600"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Adding...' : 'Mark Revised'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Completed Chapters List Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Subject Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterSubject('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterSubject === 'All'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({chapters.length})
            </button>
            {HSC_SUBJECTS.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setFilterSubject(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterSubject === sub.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sub.label} ({subjectCounts[sub.id] || 0})
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search revised chapters..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Chapters Cards Grid */}
        {filteredChapters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredChapters.map((item) => {
              const meta = getSubjectMeta(item.subject);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}`}>
                        {item.subject}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Revised {item.revision_count || 1}x
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900">
                      {item.chapter_name}
                    </h3>

                    {item.notes && (
                      <p className="text-xs text-slate-600 mt-1.5 bg-white p-2.5 rounded-xl border border-slate-100">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/70">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.completed_date}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleIncrementRevision(item.id)}
                        title="Log another completed revision round"
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>+1 Revise</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(item.id)}
                        title="Remove chapter"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl">
            <GraduationCap className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {chapters.length === 0
                ? 'No HSC chapters logged yet'
                : 'No revised chapters match your filter'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Select Physics, Maths, English, Chemistry, or CS above and enter a chapter whose revision you have completed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HSCRevision;
