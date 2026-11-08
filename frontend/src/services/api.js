import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle unauthorized redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/users/login', data),
  register: (data) => api.post('/users/register', data),
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  forgotPassword: (data) => api.post('/users/forgot-password', data),
  resetPassword: (data) => api.post('/users/reset-password', data),
};

export const dashboardAPI = {
  getOverview: () => api.get('/analysis/dashboard'),
  getWeakTopics: () => api.get('/analysis/weak-topics'),
};

export const testsAPI = {
  getTests: (params) => api.get('/tests', { params }),
  getTestDetail: (id) => api.get(`/tests/${id}`),
  deleteTest: (id) => api.delete(`/tests/${id}`),
  getTimeAnalytics: (id) => api.get(`/tests/${id}/time`),
};

export const uploadsAPI = {
  processFile: (formData) => api.post('/uploads/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
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
  getPlan: () => api.get('/study-planner'),
  regeneratePlan: () => api.post('/study-planner/generate'),
  toggleTask: (taskId) => api.put(`/study-planner/tasks/${taskId}/toggle`),
};

export default api;
