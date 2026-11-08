import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Target,
  Clock,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const ProfileSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const profile = user?.profile || {};

  const [formData, setFormData] = useState({
    target_year: 2026,
    target_attempt: 'January & April',
    target_percentile: 99.0,
    target_marks: 220,
    target_physics_marks: 75,
    target_chemistry_marks: 80,
    target_maths_marks: 65,
    daily_study_hours: 6.5,
    target_exam_date: '2026-01-24',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile && Object.keys(profile).length > 0) {
      setFormData({
        target_year: profile.target_year || 2026,
        target_attempt: profile.target_attempt || 'January & April',
        target_percentile: profile.target_percentile || 99.0,
        target_marks: profile.target_marks || 220,
        target_physics_marks: profile.target_physics_marks || 75,
        target_chemistry_marks: profile.target_chemistry_marks || 80,
        target_maths_marks: profile.target_maths_marks || 65,
        daily_study_hours: profile.daily_study_hours || 6.5,
        target_exam_date: profile.target_exam_date || '2026-01-24',
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['target_year', 'target_percentile', 'target_marks', 'target_physics_marks', 'target_chemistry_marks', 'target_maths_marks', 'daily_study_hours'].includes(name)
        ? Number(value)
        : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await updateUserProfile(formData);
      setSuccessMsg('Profile and target settings successfully updated!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Profile & Goal Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure your JEE target milestones, attempt preferences, and daily study allocations.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Personal Details (Read Only) */}
        <div className="pb-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Student Account Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Student Name</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800">
                <User className="w-4 h-4 text-slate-400" />
                <span>{user?.full_name || 'Aarav Sharma'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Registered Email</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email || 'demo@jeemain.ai'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* JEE Examination Target Settings */}
        <div className="pb-6 border-b border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Examination Target Parameters</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Year</label>
              <select
                name="target_year"
                value={formData.target_year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value={2026}>JEE Main 2026</option>
                <option value={2027}>JEE Main 2027</option>
                <option value={2028}>JEE Main 2028</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Attempt</label>
              <select
                name="target_attempt"
                value={formData.target_attempt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="January Attempt">Session 1 (January)</option>
                <option value="April Attempt">Session 2 (April)</option>
                <option value="January & April">Both Sessions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Exam Date</label>
              <input
                type="date"
                name="target_exam_date"
                value={formData.target_exam_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Score (out of 300)</label>
              <input
                type="number"
                min={80}
                max={300}
                name="target_marks"
                value={formData.target_marks}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Percentile Benchmark</label>
              <input
                type="number"
                step="0.05"
                min={70}
                max={100}
                name="target_percentile"
                value={formData.target_percentile}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Daily Study Hours</label>
              <input
                type="number"
                step="0.5"
                min={2}
                max={16}
                name="daily_study_hours"
                value={formData.daily_study_hours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Subject Target Sub-allocations */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Subject-Wise Marks Allocations</h3>
          <p className="text-xs text-slate-500">
            Sum of subject targets should align with your total target ({formData.target_marks} Marks):
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sky-700 mb-1">Physics Target</label>
              <input
                type="number"
                min={0}
                max={100}
                name="target_physics_marks"
                value={formData.target_physics_marks}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">Chemistry Target</label>
              <input
                type="number"
                min={0}
                max={100}
                name="target_chemistry_marks"
                value={formData.target_chemistry_marks}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-700 mb-1">Maths Target</label>
              <input
                type="number"
                min={0}
                max={100}
                name="target_maths_marks"
                value={formData.target_maths_marks}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save Profile & Settings'}</span>
        </button>
      </form>
    </div>
  );
};

export default ProfileSettings;
