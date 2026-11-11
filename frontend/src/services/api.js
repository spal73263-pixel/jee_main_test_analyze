import axios from 'axios';
import { parseCsvTextInBrowser } from '../utils/csvFallback';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = window.localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const healthAPI = {
  check: () => api.get('/health'),
};

export const authAPI = {
  login: (data) => api.post('/users/login', data),
  register: (data) => api.post('/users/register', data),
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  forgotPassword: (data) => api.post('/users/forgot-password', data),
  resetPassword: (data) => api.post('/users/reset-password', data),
};

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getWeakTopics: () => api.get('/dashboard/weak-topics'),
  getReminders: () => api.get('/dashboard/reminders'),
  addReminder: (data) => api.post('/dashboard/reminders', data),
  deleteReminder: (id) => api.delete(`/dashboard/reminders/${encodeURIComponent(id)}`),
  toggleReminder: (id) => api.patch(`/dashboard/reminders/${encodeURIComponent(id)}/toggle`),
};

export const testsAPI = {
  getTests: (params) => api.get('/tests', { params }),
  getTestDetail: (id) => api.get(`/tests/${encodeURIComponent(id)}`),
  deleteTest: (id) => api.delete(`/tests/${encodeURIComponent(id)}`),
  getTimeAnalytics: (id) => api.get(`/tests/${encodeURIComponent(id)}/time-analytics`),
};

export const uploadsAPI = {
  processFile: async (formData) => {
    const file = formData instanceof FormData ? formData.get('file') : null;
    const filename = file?.name || 'Uploaded_Test';
    const lowerName = filename.toLowerCase();

    try {
      return await api.post('/uploads/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (backendErr) {
      if (backendErr?.response?.status === 400) {
        throw backendErr;
      }

      if (file && lowerName.endsWith('.csv') && typeof file.text === 'function') {
        const csvText = await file.text();
        return { data: parseCsvTextInBrowser(csvText, filename) };
      }

      const baseName = filename
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();

      return {
        data: {
          test_name: baseName || 'Uploaded Mock Test',
          test_date: new Date().toISOString().split('T')[0],
          test_type: 'Mock Test',
          shift: 'Shift 1',
          duration_minutes: 180,
          total_questions: 75,
          max_marks: 300.0,
          marks_obtained: 0.0,
          official_percentile: null,
          official_rank: null,
          subjects: [
            { subject: 'Physics', total_questions: 25, attempted: 0, correct: 0, incorrect: 0, unattempted: 25, positive_marks: 0, negative_marks: 0, total_marks: 0, accuracy: 0, percentage: 0, time_spent_seconds: 0 },
            { subject: 'Chemistry', total_questions: 25, attempted: 0, correct: 0, incorrect: 0, unattempted: 25, positive_marks: 0, negative_marks: 0, total_marks: 0, accuracy: 0, percentage: 0, time_spent_seconds: 0 },
            { subject: 'Mathematics', total_questions: 25, attempted: 0, correct: 0, incorrect: 0, unattempted: 25, positive_marks: 0, negative_marks: 0, total_marks: 0, accuracy: 0, percentage: 0, time_spent_seconds: 0 },
          ],
          questions: [],
          extraction_source: 'Manual Verification Fallback',
          confidence_level: 'partial',
          warnings: [
            backendErr?.response?.data?.detail ||
              'Automatic file parser was unavailable; review and enter subject marks below before saving.',
          ],
          missing_fields: ['Verify subject marks manually'],
          validation_status: 'needs_review',
        },
      };
    }
  },
  confirmTest: (data) => api.post('/uploads/confirm', data),
};

export const subjectsAPI = {
  getBreakdown: (params) => api.get('/subjects/breakdown', { params }),
};

export const predictionsAPI = {
  getTargetAnalysis: () => api.get('/predictions/target-analysis'),
  compareTests: (data) => api.post('/predictions/compare', data),
};

export const plannerAPI = {
  getPlan: () => api.get('/planner/plan'),
  regeneratePlan: () => api.post('/planner/regenerate'),
  toggleTask: (taskId) => api.patch(`/planner/tasks/${encodeURIComponent(taskId)}/toggle`),
  addTask: (data) => api.post('/planner/tasks', data),
  deleteTask: (taskId) => api.delete(`/planner/tasks/${encodeURIComponent(taskId)}`),
  getScheduledTests: () => api.get('/planner/scheduled-tests'),
  scheduleTest: (data) => api.post('/planner/scheduled-tests', data),
  deleteScheduledTest: (testId) =>
    api.delete(`/planner/scheduled-tests/${encodeURIComponent(testId)}`),
  toggleScheduledTest: (testId) =>
    api.patch(`/planner/scheduled-tests/${encodeURIComponent(testId)}/toggle`),
};

export const hscRevisionAPI = {
  getChapters: (params) => api.get('/hsc-revision', { params }),
  addChapter: (data) => api.post('/hsc-revision', data),
  incrementRevision: (id) =>
    api.patch(`/hsc-revision/${encodeURIComponent(id)}/increment`),
  deleteChapter: (id) => api.delete(`/hsc-revision/${encodeURIComponent(id)}`),
};

export default api;
