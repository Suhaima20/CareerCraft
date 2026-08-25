import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('careercraft_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('careercraft_token');
      localStorage.removeItem('careercraft_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && !window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Auth API ----
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
};

// ---- Career API ----
export const careerAPI = {
  list: (params) => api.get('/careers', { params }),
  get: (id) => api.get(`/careers/${id}`),
  selectCareer: (id) => api.post('/careers/select', { careerId: id }),
  getActiveCareer: () => api.get('/careers/active'),
  switchCareer: (id) => api.post('/careers/switch', { careerId: id }),
  getRecommended: () => api.get('/careers/recommended'),
};

// ---- Skills API ----
export const skillAPI = {
  search: (q) => api.get('/skills', { params: { q } }),
  list: (params) => api.get('/skills', { params }),
  getUserSkills: () => api.get('/skills/user'),
  addManualSkills: (skillIds) => api.post('/skills/manual', { skillIds }),
  confirmExtractedSkills: (skillIds) => api.post('/skills/confirm', { skillIds }),
};

// ---- Resume API ----
export const resumeAPI = {
  upload: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress,
    });
  },
  getExtracted: () => api.get('/resume/extracted'),
  listMine: () => api.get('/resume/mine'),
};

// ---- Analysis API ----
export const analysisAPI = {
  analyze: (careerId) => api.post('/analysis', { careerId }),
  getResult: (careerId) => api.get(`/analysis/${careerId}`),
  getHistory: () => api.get('/analysis'),
};

// ---- Roadmap API ----
export const roadmapAPI = {
  get: (careerId) => api.get(`/roadmap/${careerId}`),
  toggleChapter: (careerId, chapterId, completed) =>
    api.put(`/roadmap/${careerId}/progress`, { chapterId, completed }),
  getProgress: (careerId) => api.get(`/roadmap/${careerId}/progress`),
  getBrushUp: (careerId) => api.get(`/roadmap/${careerId}/brush-up`),
  toggleBrushUp: (careerId, chapterId, completed) =>
    api.put(`/roadmap/${careerId}/brush-up`, { chapterId, completed }),
};

// ---- Achievements API ----
export const achievementAPI = {
  list: () => api.get('/achievements'),
};

// ---- Notifications API ----
export const notificationAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ---- Jobs API ----
export const jobAPI = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
};

// ---- Market Intelligence API ----
export const marketAPI = {
  getStatus: () => api.get('/market/status'),
  getTrends: () => api.get('/market/trends'),
  getPowerBI: () => api.get('/market/powerbi'),
};

// ---- Resume Builder API ----
export const resumeBuilderAPI = {
  generate: (data) => api.post('/resume-builder/generate', data, { responseType: 'blob', timeout: 60000 }),
  save: (data) => api.post('/resume-builder/save', data),
  load: () => api.get('/resume-builder/load'),
};

// ---- Feedback API ----
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
  list: () => api.get('/feedback'),
};

// ---- Admin API ----
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/stats'),
  // Users
  listUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  // Careers
  listCareers: (params) => api.get('/admin/careers', { params }),
  createCareer: (data) => api.post('/admin/careers', data),
  updateCareer: (id, data) => api.put(`/admin/careers/${id}`, data),
  deleteCareer: (id) => api.delete(`/admin/careers/${id}`),
  // Skills
  listSkills: (params) => api.get('/admin/skills', { params }),
  createSkill: (data) => api.post('/admin/skills', data),
  updateSkill: (id, data) => api.put(`/admin/skills/${id}`, data),
  deleteSkill: (id) => api.delete(`/admin/skills/${id}`),
  // Chapters
  listChapters: (params) => api.get('/admin/chapters', { params }),
  createChapter: (data) => api.post('/admin/chapters', data),
  updateChapter: (id, data) => api.put(`/admin/chapters/${id}`, data),
  deleteChapter: (id) => api.delete(`/admin/chapters/${id}`),
  // Mappings
  getCareerSkills: (careerId) => api.get(`/admin/mappings/career-skills/${careerId}`),
  setCareerSkills: (careerId, skillIds) => api.put(`/admin/mappings/career-skills/${careerId}`, { skillIds }),
  getSkillChapters: (skillId) => api.get(`/admin/mappings/skill-chapters/${skillId}`),
  setSkillChapters: (skillId, chapterIds) => api.put(`/admin/mappings/skill-chapters/${skillId}`, { chapterIds }),
  // Resumes
  listResumes: (params) => api.get('/admin/resumes', { params }),
  getResume: (id) => api.get(`/admin/resumes/${id}`),
  // Feedback
  listFeedback: (params) => api.get('/admin/feedback', { params }),
  updateFeedbackStatus: (id, status) => api.put(`/admin/feedback/${id}`, { status }),
  // Trending
  listTrending: () => api.get('/admin/trending'),
  addTrending: (data) => api.post('/admin/trending', data),
  removeTrending: (id) => api.delete(`/admin/trending/${id}`),
  // Export
  exportUsers: () => api.get('/admin/export/users', { responseType: 'blob' }),
  exportFeedback: () => api.get('/admin/export/feedback', { responseType: 'blob' }),
  // Import
  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  // Audit logs
  listAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// ---- Onboarding status ----
export const onboardingAPI = {
  getStatus: () => api.get('/users/onboarding'),
  updateStep: (step) => api.put('/users/onboarding', { step }),
};
