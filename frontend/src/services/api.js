import axios from 'axios';
import {
  localAuthAPI,
  localDashboardAPI,
  localTestsAPI,
  localUploadsAPI,
  localSubjectsAPI,
  localPredictionsAPI,
  localPlannerAPI,
  localHscRevisionAPI,
  parseCsvTextInBrowser,
} from './localStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  login: (data) => localAuthAPI.login(data),
  register: (data) => localAuthAPI.register(data),
  getMe: () => localAuthAPI.getMe(),
  updateProfile: (data) => localAuthAPI.updateProfile(data),
  forgotPassword: (data) => localAuthAPI.forgotPassword(data),
  resetPassword: (data) => localAuthAPI.resetPassword(data),
};

export const dashboardAPI = {
  getOverview: () => localDashboardAPI.getOverview(),
  getWeakTopics: () => localDashboardAPI.getWeakTopics(),
  getReminders: () => localDashboardAPI.getReminders(),
  addReminder: (data) => localDashboardAPI.addReminder(data),
  deleteReminder: (id) => localDashboardAPI.deleteReminder(id),
  toggleReminder: (id) => localDashboardAPI.toggleReminder(id),
};

export const testsAPI = {
  getTests: (params) => localTestsAPI.getTests(params),
  getTestDetail: (id) => localTestsAPI.getTestDetail(id),
  deleteTest: (id) => localTestsAPI.deleteTest(id),
  getTimeAnalytics: (id) => localTestsAPI.getTimeAnalytics(id),
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
  confirmTest: (data) => localUploadsAPI.confirmTest(data),
};

export const subjectsAPI = {
  getBreakdown: (params) => localSubjectsAPI.getBreakdown(params),
};

export const predictionsAPI = {
  getTargetAnalysis: () => localPredictionsAPI.getTargetAnalysis(),
  compareTests: (data) => localPredictionsAPI.compareTests(data),
};

export const plannerAPI = {
  getPlan: () => localPlannerAPI.getPlan(),
  regeneratePlan: () => localPlannerAPI.regeneratePlan(),
  toggleTask: (taskId) => localPlannerAPI.toggleTask(taskId),
  addTask: (data) => localPlannerAPI.addTask(data),
  deleteTask: (taskId) => localPlannerAPI.deleteTask(taskId),
  getScheduledTests: () => localPlannerAPI.getScheduledTests(),
  scheduleTest: (data) => localPlannerAPI.scheduleTest(data),
  deleteScheduledTest: (testId) => localPlannerAPI.deleteScheduledTest(testId),
  toggleScheduledTest: (testId) => localPlannerAPI.toggleScheduledTest(testId),
};

export const hscRevisionAPI = {
  getChapters: (params) => localHscRevisionAPI.getChapters(params),
  addChapter: (data) => localHscRevisionAPI.addChapter(data),
  incrementRevision: (id) => localHscRevisionAPI.incrementRevision(id),
  deleteChapter: (id) => localHscRevisionAPI.deleteChapter(id),
};

export default api;
