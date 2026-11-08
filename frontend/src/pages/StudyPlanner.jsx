import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  BookOpen,
  RotateCcw,
  Target,
  ArrowRight
} from 'lucide-react';
import { plannerAPI } from '../services/api';

const StudyPlanner = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await plannerAPI.getPlan();
      setPlan(res.data);
    } catch (err) {
      console.error('Failed to load study plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await plannerAPI.toggleTask(taskId);
      setPlan(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, is_completed: res.data.is_completed } : t)
      }));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await plannerAPI.regeneratePlan();
      setPlan(res.data);
    } catch (err) {
      alert('Failed to regenerate plan: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tasks = plan?.tasks || [];
  const completedCount = tasks.filter(t => t.is_completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">7-Day Targeted Study Planner</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dynamic recovery roadmap prioritizing chapters with highest negative marking and lowest accuracy.
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-center disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          <span>{regenerating ? 'Updating Roadmap...' : 'Regenerate from Latest Test'}</span>
        </button>
      </div>

      {/* Progress & Overview Pill */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
            {plan?.title || 'Weekly Revision Plan'}
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">Weekly Task Completion Rate</h3>
          <p className="text-xs text-slate-500">
            {completedCount} of {tasks.length} core study sessions marked complete
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-36 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xl font-extrabold text-indigo-700">{progressPercent}%</span>
        </div>
      </div>

      {/* 7 Daily Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              task.is_completed
                ? 'bg-slate-50/80 border-slate-200 opacity-80'
                : 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {task.day_of_week}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  task.subject === 'Physics' ? 'bg-sky-50 text-sky-700' :
                  task.subject === 'Chemistry' ? 'bg-emerald-50 text-emerald-700' :
                  task.subject === 'Mathematics' ? 'bg-amber-50 text-amber-700' :
                  'bg-indigo-50 text-indigo-700'
                }`}>
                  {task.subject}
                </span>
              </div>

              <h4 className={`text-sm font-bold mt-1 ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                {task.chapter}
              </h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {task.task_description}
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {task.duration_minutes} Mins
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  {task.practice_questions} PYQs
                </span>
              </div>
            </div>

            <button
              onClick={() => handleToggleTask(task.id)}
              className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                task.is_completed
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {task.is_completed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Session Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyPlanner;
