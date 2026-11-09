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
  Plus,
  Trash2,
  Bell,
  BellRing,
  AlertTriangle,
  Check,
  Layers,
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { plannerAPI } from '../services/api';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Computer Science 1 (CS 1)',
  'Computer Science 2 (CS 2)',
  'English'
];
const EXAM_TYPES = ['JEE Main', 'JEE Advanced', 'Board Exam Class 12th'];

const StudyPlanner = () => {
  // Navigation / active sub-view
  const [activeTab, setActiveTab] = useState('weekly_study'); // 'weekly_study' | 'mock_tests'
  const [selectedDayFilter, setSelectedDayFilter] = useState('All');

  // Study Plan State
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Custom Study Task Form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskSubject, setTaskSubject] = useState('Physics');
  const [taskChapter, setTaskChapter] = useState('');
  const [taskHours, setTaskHours] = useState('2');
  const [taskDay, setTaskDay] = useState('Monday');
  const [taskQuestions, setTaskQuestions] = useState('20');
  const [taskNotes, setTaskNotes] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Scheduled Tests State
  const [scheduledTests, setScheduledTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [testExamType, setTestExamType] = useState('JEE Main');
  const [testDate, setTestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [testTime, setTestTime] = useState('09:00 AM');
  const [testDuration, setTestDuration] = useState('180');
  const [testSyllabus, setTestSyllabus] = useState('');
  const [addingTest, setAddingTest] = useState(false);

  // Browser Notification State
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [notificationAlertSent, setNotificationAlertSent] = useState(false);

  useEffect(() => {
    fetchPlan();
    fetchScheduledTests();
  }, []);

  // Request browser notifications
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported on this browser.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('🔔 JEE Test Alerts Enabled!', {
          body: 'You will receive timely reminders for scheduled JEE Main, Advanced & Board mock tests.',
          icon: '/favicon.ico'
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // Trigger immediate test notification demo
  const triggerTestNotification = (test) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🚨 Mock Test Reminder: ${test.test_title}`, {
        body: `${test.exam_type} test is scheduled for ${test.scheduled_date} at ${test.scheduled_time} (${test.duration_minutes} mins). Topics: ${test.syllabus_chapters || 'Full Syllabus'}`,
        icon: '/favicon.ico'
      });
    } else {
      requestNotificationPermission();
    }
  };

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

  const fetchScheduledTests = async () => {
    setLoadingTests(true);
    try {
      const res = await plannerAPI.getScheduledTests();
      setScheduledTests(res.data || []);
      checkUpcomingTestsNotification(res.data || []);
    } catch (err) {
      console.error('Failed to load scheduled tests:', err);
    } finally {
      setLoadingTests(false);
    }
  };

  // Check if any test is due in the next 24-48 hours and trigger browser notification
  const checkUpcomingTestsNotification = (tests) => {
    if (notificationAlertSent || !('Notification' in window) || Notification.permission !== 'granted') return;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const urgentTest = tests.find(t => !t.is_completed && (t.scheduled_date === today || t.scheduled_date === tomorrow));
    if (urgentTest) {
      new Notification(`🚨 Upcoming Mock Test: ${urgentTest.test_title}`, {
        body: `${urgentTest.exam_type} is scheduled for ${urgentTest.scheduled_date === today ? 'TODAY' : 'TOMORROW'} at ${urgentTest.scheduled_time}! Prepare your station.`,
        icon: '/favicon.ico'
      });
      setNotificationAlertSent(true);
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

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this study session from your weekly plan?')) return;
    try {
      await plannerAPI.deleteTask(taskId);
      setPlan(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task: ' + err.message);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskChapter.trim()) {
      alert('Please enter a chapter name.');
      return;
    }
    const hrs = parseFloat(taskHours) || 1.0;
    setAddingTask(true);
    try {
      const payload = {
        day_of_week: taskDay,
        subject: taskSubject,
        chapter: taskChapter.trim(),
        duration_hours: hrs,
        practice_questions: parseInt(taskQuestions) || 20,
        task_description: taskNotes.trim() || `Focus session: ${taskChapter.trim()} (${hrs} hrs) + ${taskQuestions} PYQs`,
        revision_topics: `Review core formulas and previous year errors in ${taskChapter.trim()}`
      };
      const res = await plannerAPI.addTask(payload);
      setPlan(prev => ({
        ...prev,
        tasks: [...(prev?.tasks || []), res.data]
      }));
      setTaskChapter('');
      setTaskNotes('');
      setShowTaskForm(false);
    } catch (err) {
      console.error('Failed to add custom study task:', err);
      alert('Failed to add study task: ' + err.message);
    } finally {
      setAddingTask(false);
    }
  };

  const handleScheduleTest = async (e) => {
    e.preventDefault();
    if (!testTitle.trim()) {
      alert('Please enter a title for the mock test.');
      return;
    }
    setAddingTest(true);
    try {
      const payload = {
        test_title: testTitle.trim(),
        exam_type: testExamType,
        scheduled_date: testDate,
        scheduled_time: testTime,
        duration_minutes: parseInt(testDuration) || 180,
        syllabus_chapters: testSyllabus.trim() || 'Full Syllabus'
      };
      const res = await plannerAPI.scheduleTest(payload);
      setScheduledTests(prev => [...prev, res.data]);
      setTestTitle('');
      setTestSyllabus('');
      setShowTestForm(false);

      // Trigger instant confirmation notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`✅ Test Scheduled: ${res.data.test_title}`, {
          body: `Added to your reminder schedule for ${res.data.scheduled_date} at ${res.data.scheduled_time}.`,
          icon: '/favicon.ico'
        });
      }
    } catch (err) {
      console.error('Failed to schedule test:', err);
      alert('Failed to schedule test: ' + err.message);
    } finally {
      setAddingTest(false);
    }
  };

  const handleToggleTest = async (testId) => {
    try {
      const res = await plannerAPI.toggleScheduledTest(testId);
      setScheduledTests(prev => prev.map(t => t.id === testId ? res.data : t));
    } catch (err) {
      console.error('Failed to toggle test:', err);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Delete this scheduled test reminder?')) return;
    try {
      await plannerAPI.deleteScheduledTest(testId);
      setScheduledTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      console.error('Failed to delete scheduled test:', err);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await plannerAPI.regeneratePlan();
      setPlan(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || ('Failed to regenerate plan: ' + err.message));
    } finally {
      setRegenerating(false);
    }
  };

  // Helper date status
  const getTestDateBadge = (dateStr, isCompleted) => {
    if (isCompleted) {
      return { text: 'COMPLETED', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (dateStr === today) {
      return { text: 'TODAY 🚨', bg: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold animate-pulse' };
    }
    if (dateStr === tomorrow) {
      return { text: 'TOMORROW ⚡', bg: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    }
    if (dateStr < today) {
      return { text: 'OVERDUE', bg: 'bg-slate-100 text-slate-600 border-slate-300' };
    }
    return { text: `ON ${dateStr}`, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium' };
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

  // Calculate planned hours breakdown
  const totalMinutesPlanned = tasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const totalHoursPlanned = (totalMinutesPlanned / 60).toFixed(1);

  const physicsMins = tasks.filter(t => t.subject === 'Physics').reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const chemMins = tasks.filter(t => t.subject === 'Chemistry').reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const mathMins = tasks.filter(t => t.subject === 'Mathematics').reduce((acc, t) => acc + (t.duration_minutes || 0), 0);

  // Filter tasks by day if selected
  const filteredTasks = selectedDayFilter === 'All'
    ? tasks
    : tasks.filter(t => t.day_of_week === selectedDayFilter);

  // Check urgent tests
  const todayStr = new Date().toISOString().split('T')[0];
  const urgentTests = scheduledTests.filter(t => !t.is_completed && t.scheduled_date <= todayStr);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Weekly Study & Test Planner</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              JEE Main • Advanced • Boards
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Plan your weekly subject hours, chapter targets, and mock test reminders with live browser notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={requestNotificationPermission}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Enable desktop notifications for upcoming mock tests"
            >
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
              <span>Enable Test Alerts</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Alerts Enabled</span>
            </div>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Regenerating...' : 'AI Auto-Plan'}</span>
          </button>
        </div>
      </div>

      {/* Urgent Mock Test Alert Banner (if any test is due today or overdue) */}
      {urgentTests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                You have {urgentTests.length} Mock Test{urgentTests.length > 1 ? 's' : ''} Scheduled Today or Pending!
              </h4>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-amber-800">
                {urgentTests.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-md border border-amber-300 font-medium">
                    <strong>{t.test_title}</strong> ({t.exam_type}) at {t.scheduled_time}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('mock_tests')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors"
          >
            View Tests
          </button>
        </div>
      )}

      {/* Weekly Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" /> Total Study Hours
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalHoursPlanned} <span className="text-xs font-medium text-slate-500">hrs</span></div>
          <p className="text-[11px] text-slate-400 mt-0.5">{tasks.length} planned sessions</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-sky-500" /> Physics
          </div>
          <div className="text-2xl font-black text-sky-700 mt-1">{(physicsMins / 60).toFixed(1)} <span className="text-xs font-medium text-slate-500">hrs</span></div>
          <p className="text-[11px] text-slate-400 mt-0.5">{tasks.filter(t => t.subject === 'Physics').length} chapters scheduled</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Chemistry
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{(chemMins / 60).toFixed(1)} <span className="text-xs font-medium text-slate-500">hrs</span></div>
          <p className="text-[11px] text-slate-400 mt-0.5">{tasks.filter(t => t.subject === 'Chemistry').length} chapters scheduled</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" /> Mathematics
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{(mathMins / 60).toFixed(1)} <span className="text-xs font-medium text-slate-500">hrs</span></div>
          <p className="text-[11px] text-slate-400 mt-0.5">{tasks.filter(t => t.subject === 'Mathematics').length} chapters scheduled</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-indigo-500" /> Mock Tests
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{scheduledTests.length} <span className="text-xs font-medium text-slate-500">scheduled</span></div>
          <p className="text-[11px] text-slate-400 mt-0.5">{scheduledTests.filter(t => t.is_completed).length} completed</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('weekly_study')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'weekly_study'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Weekly Study Schedule (Subject & Chapter Hours)</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'weekly_study' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('mock_tests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'mock_tests'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Scheduled Mock Tests & Reminders</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'mock_tests' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {scheduledTests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: WEEKLY STUDY SCHEDULE */}
      {activeTab === 'weekly_study' && (
        <div className="space-y-6">
          {/* Action Bar & Day Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Day Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Day:
              </span>
              <button
                onClick={() => setSelectedDayFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDayFilter === 'All'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Week
              </button>
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDayFilter(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedDayFilter === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Add Session Button */}
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors self-start md:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showTaskForm ? 'Close Form' : '+ Add Study Session'}</span>
            </button>
          </div>

          {/* Add Study Task Form */}
          {showTaskForm && (
            <form onSubmit={handleAddTask} className="bg-slate-50/90 border-2 border-indigo-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Plan Subject Study Session (Hours & Chapter)</span>
                </h3>
                <span className="text-xs text-slate-500">Customized to your daily target</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Day of Week</label>
                  <select
                    value={taskDay}
                    onChange={(e) => setTaskDay(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <select
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="General Revision">General Revision / Full Syllabus</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chapter Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rotational Motion, Thermodynamics, Indefinite Integration"
                    value={taskChapter}
                    onChange={(e) => setTaskChapter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Hours)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      required
                      value={taskHours}
                      onChange={(e) => setTaskHours(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">Hours</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Practice PYQs Target</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={taskQuestions}
                    onChange={(e) => setTaskQuestions(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Focus Notes / Subtopics (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Formulas review, moment of inertia theorems, 2024 PYQs"
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTask}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {addingTask ? 'Saving Task...' : 'Add Session to Plan'}
                </button>
              </div>
            </form>
          )}

          {/* Weekly Task Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-10 text-center border border-dashed border-slate-300">
                <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800">No study sessions found for {selectedDayFilter}</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click "+ Add Study Session" above to assign subject hours and chapters, or use "AI Auto-Plan" to generate a recovery plan.
                </p>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  + Add Session Now
                </button>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const hours = ((task.duration_minutes || 60) / 60).toFixed(1);
                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      task.is_completed
                        ? 'bg-slate-50/80 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {task.day_of_week}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            task.subject === 'Physics' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            task.subject === 'Chemistry' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            task.subject === 'Mathematics' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {task.subject}
                          </span>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Chapter Title */}
                      <h4 className={`text-base font-extrabold mt-1 ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.chapter}
                      </h4>

                      {/* Description / Notes */}
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {task.task_description}
                      </p>

                      {/* Duration & Questions Badges */}
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          {hours} {hours === '1.0' ? 'Hour' : 'Hours'}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Target className="w-3.5 h-3.5 text-slate-500" />
                          {task.practice_questions} PYQs
                        </span>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        task.is_completed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
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
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULED MOCK TESTS & NOTIFICATIONS */}
      {activeTab === 'mock_tests' && (
        <div className="space-y-6">
          {/* Header & Schedule Test Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <span>Scheduled Mock Tests & Exam Reminders</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep track of upcoming full-length & part-syllabus mock tests. Notifications will alert you before test time.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => setShowTestForm(!showTestForm)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{showTestForm ? 'Close Form' : '+ Schedule Mock Test'}</span>
              </button>
            </div>
          </div>

          {/* Schedule Test Form */}
          {showTestForm && (
            <form onSubmit={handleScheduleTest} className="bg-slate-50/90 border-2 border-indigo-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Set Mock Test Reminder Alert</span>
                </h4>
                <span className="text-xs text-indigo-600 font-bold">Auto-alerts enabled</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Test Title / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Allen Score-3 Full Mock, Mathongo Part Test 4, CBSE Physics Pre-Board"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Exam Type</label>
                  <select
                    value={testExamType}
                    onChange={(e) => setTestExamType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                  >
                    {EXAM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:00 AM or 02:30 PM"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="30"
                    max="360"
                    value={testDuration}
                    onChange={(e) => setTestDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Syllabus / Chapters Covered</label>
                  <input
                    type="text"
                    placeholder="e.g. Full Syllabus, or Mechanics + Organic + Calculus"
                    value={testSyllabus}
                    onChange={(e) => setTestSyllabus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTest}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {addingTest ? 'Scheduling...' : 'Set Test Reminder'}
                </button>
              </div>
            </form>
          )}

          {/* Test Reminders List */}
          {scheduledTests.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-300">
              <Bell className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-800">No mock tests scheduled yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Schedule your upcoming JEE Main, JEE Advanced, or Class 12th Board mock tests here to stay on track and get timely reminders.
              </p>
              <button
                onClick={() => setShowTestForm(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                + Schedule First Mock Test
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledTests.map((t) => {
                const badge = getTestDateBadge(t.scheduled_date, t.is_completed);
                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      t.is_completed
                        ? 'bg-slate-50/70 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      {/* Top Bar with Date & Exam Type */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.text}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            t.exam_type === 'JEE Advanced' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            t.exam_type === 'Board Exam Class 12th' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {t.exam_type}
                          </span>
                          <button
                            onClick={() => handleDeleteTest(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Test Title */}
                      <h4 className={`text-base font-extrabold ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {t.test_title}
                      </h4>

                      {/* Date & Time Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2.5">
                        <span className="flex items-center gap-1 font-semibold">
                          <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                          {t.scheduled_date}
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          {t.scheduled_time} ({t.duration_minutes} Mins)
                        </span>
                      </div>

                      {/* Syllabus Chapters */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">Syllabus: </span>
                        <span className="text-slate-600">{t.syllabus_chapters || 'Full Syllabus'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => triggerTestNotification(t)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Send preview notification alert"
                      >
                        <Bell className="w-3 h-3 text-slate-500" />
                        <span>Test Alert</span>
                      </button>

                      <button
                        onClick={() => handleToggleTest(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          t.is_completed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                        }`}
                      >
                        {t.is_completed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Marked as Given</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5" />
                            <span>Mark as Given</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
