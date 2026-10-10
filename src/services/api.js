
import axios from 'axios';

// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// ATTACH JWT TOKEN
// ============================================================

api.interceptors.request.use(
  (config) => {
    const url = config.url || '';

    const isAdminRequest =
      url.startsWith('/admin');

    const token = isAdminRequest
      ? localStorage.getItem(
          'careercraft_admin_token'
        )
      : localStorage.getItem(
          'careercraft_token'
        );

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// HANDLE AUTH ERRORS
// ============================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      const path =
        window.location.pathname;

      const isAdminPage =
        path.startsWith('/admin');

      if (isAdminPage) {
        // ------------------------------------------------------
        // ADMIN SESSION
        // ------------------------------------------------------

        localStorage.removeItem(
          'careercraft_admin_token'
        );

        localStorage.removeItem(
          'careercraft_admin_user'
        );

        if (path !== '/admin/login') {
          window.location.href =
            '/admin/login';
        }
      } else {
        // ------------------------------------------------------
        // NORMAL USER SESSION
        // ------------------------------------------------------

        localStorage.removeItem(
          'careercraft_token'
        );

        localStorage.removeItem(
          'careercraft_user'
        );

        if (
          path !== '/login' &&
          path !== '/register'
        ) {
          window.location.href =
            '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// DEFAULT API
// ============================================================

export default api;

// ============================================================
// AUTH API
// ============================================================

export const authAPI = {
  register: (data) =>
    api.post(
      '/auth/register',
      data
    ),

  login: (data) =>
    api.post(
      '/auth/login',
      data
    ),

  adminLogin: (data) =>
    api.post(
      '/auth/admin/login',
      data
    ),

  getProfile: () =>
    api.get(
      '/users/me'
    ),

  updateProfile: (data) =>
    api.put(
      '/users/me',
      data
    ),
};

// ============================================================
// CAREER API - USER SIDE
// ============================================================

export const careerAPI = {
  list: (params) =>
    api.get(
      '/careers',
      {
        params,
      }
    ),

  get: (id) =>
    api.get(
      `/careers/${id}`
    ),

  selectCareer: (id) =>
    api.post(
      '/careers/select',
      {
        careerId: id,
      }
    ),

  getActiveCareer: () =>
    api.get(
      '/careers/active'
    ),

  switchCareer: (id) =>
    api.post(
      '/careers/switch',
      {
        careerId: id,
      }
    ),

  getRecommended: () =>
    api.get(
      '/careers/recommended'
    ),
};

// ============================================================
// SKILLS API
// ============================================================

export const skillAPI = {
  search: (q) =>
    api.get(
      '/skills',
      {
        params: {
          q,
        },
      }
    ),

  list: (params) =>
    api.get(
      '/skills',
      {
        params,
      }
    ),

  getUserSkills: () =>
    api.get(
      '/skills/user'
    ),

  addManualSkills: (skillIds) =>
    api.post(
      '/skills/manual',
      {
        skillIds,
      }
    ),

  confirmExtractedSkills: (skillIds) =>
    api.post(
      '/skills/confirm',
      {
        skillIds,
      }
    ),
};

// ============================================================
// RESUME API
// ============================================================

export const resumeAPI = {
  upload: (
    file,
    onUploadProgress
  ) => {
    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    return api.post(
      '/resume/upload',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
        timeout: 60000,
        onUploadProgress,
      }
    );
  },

  getExtracted: () =>
    api.get(
      '/resume/extracted'
    ),

  listMine: () =>
    api.get(
      '/resume/mine'
    ),
};

// ============================================================
// ANALYSIS API
// ============================================================

export const analysisAPI = {
  analyze: (careerId) =>
    api.post(
      '/analysis',
      {
        careerId,
      }
    ),

  getResult: (careerId) =>
    api.get(
      `/analysis/${careerId}`
    ),

  getHistory: () =>
    api.get(
      '/analysis'
    ),
};

// ============================================================
// ROADMAP API
// ============================================================

export const roadmapAPI = {
  get: (careerId) =>
    api.get(
      `/roadmap/${careerId}`
    ),

  toggleChapter: (
    careerId,
    chapterId,
    completed
  ) =>
    api.put(
      `/roadmap/${careerId}/progress`,
      {
        chapterId,
        completed,
      }
    ),

  getProgress: (careerId) =>
    api.get(
      `/roadmap/${careerId}/progress`
    ),

  getWatchProgress: (
    careerId,
    chapterId
  ) =>
    api.get(
      `/roadmap/${careerId}/chapter/${chapterId}/watch`
    ),

  saveWatchProgress: (
    careerId,
    chapterId,
    data
  ) =>
    api.put(
      `/roadmap/${careerId}/chapter/${chapterId}/watch`,
      data
    ),

  getChapterUnlockStatus: (
    careerId,
    chapterId
  ) =>
    api.get(
      `/roadmap/${careerId}/chapter/${chapterId}/unlock-status`
    ),

  getBrushUp: (careerId) =>
    api.get(
      `/roadmap/${careerId}/brush-up`
    ),

  toggleBrushUp: (
    careerId,
    chapterId,
    completed
  ) =>
    api.put(
      `/roadmap/${careerId}/brush-up`,
      {
        chapterId,
        completed,
      }
    ),
};

// ============================================================
// QUIZ API - USER SIDE
// ============================================================

export const quizAPI = {
  getQuiz: (chapterId) =>
    api.get(
      `/quiz/${chapterId}`
    ),

  submitQuiz: (
    chapterId,
    answers,
    attemptId = null
  ) =>
    api.post(
      `/quiz/${chapterId}/submit`,
      {
        answers,
        attemptId,
      }
    ),
};

// ============================================================
// ACHIEVEMENTS API
// ============================================================

export const achievementAPI = {
  list: () =>
    api.get(
      '/achievements'
    ),
};

// ============================================================
// NOTIFICATIONS API
// ============================================================

export const notificationAPI = {
  list: () =>
    api.get(
      '/notifications'
    ),

  markRead: (id) =>
    api.put(
      `/notifications/${id}/read`
    ),

  markAllRead: () =>
    api.put(
      '/notifications/read-all'
    ),
};

// ============================================================
// JOBS API
// ============================================================

export const jobAPI = {
  list: (params) =>
    api.get(
      '/jobs',
      {
        params,
      }
    ),

  get: (id) =>
    api.get(
      `/jobs/${id}`
    ),
};

// ============================================================
// MARKET INTELLIGENCE API
// ============================================================

export const marketAPI = {
  getOverview: () =>
    api.get(
      '/market/overview'
    ),

  getCareerMarket: (career) =>
    api.get(
      '/market/career',
      {
        params: {
          career,
        },
      }
    ),

  getStatus: () =>
    api.get(
      '/market/status'
    ),
};

// ============================================================
// RESUME BUILDER API
// ============================================================

export const resumeBuilderAPI = {
  generate: (data) =>
    api.post(
      '/resume-builder/generate',
      data,
      {
        responseType: 'blob',
        timeout: 60000,
      }
    ),

  save: (data) =>
    api.post(
      '/resume-builder/save',
      data
    ),

  load: () =>
    api.get(
      '/resume-builder/load'
    ),
};

// ============================================================
// FEEDBACK API - USER SIDE
// ============================================================

export const feedbackAPI = {
  submit: (data) =>
    api.post(
      '/feedback',
      data
    ),

  list: () =>
    api.get(
      '/feedback'
    ),

  get: (id) =>
    api.get(
      `/feedback/${id}`
    ),
};

// ============================================================
// ADMIN API
// ============================================================

export const adminAPI = {

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  getStats: () =>
    api.get('/admin/stats'),

  // ==========================================================
  // USERS
  // ==========================================================

  listUsers: (params) =>
    api.get('/admin/users', {
      params,
    }),

  getUser: (id) =>
    api.get(`/admin/users/${id}`),

  updateUser: (id, data) =>
    api.put(`/admin/users/${id}`, data),

  deleteUser: (id) =>
    api.delete(`/admin/users/${id}`),

  // ==========================================================
  // CAREERS
  // ==========================================================

  listCareers: (params) =>
    api.get('/admin/careers', {
      params,
    }),

  createCareer: (data) =>
    api.post('/admin/careers', data),

  updateCareer: (id, data) =>
    api.put(`/admin/careers/${id}`, data),

  deleteCareer: (id) =>
    api.delete(`/admin/careers/${id}`),

  // ==========================================================
  // SKILLS
  // ==========================================================

  listSkills: (params) =>
    api.get('/admin/skills', {
      params,
    }),

  createSkill: (data) =>
    api.post('/admin/skills', data),

  updateSkill: (id, data) =>
    api.put(`/admin/skills/${id}`, data),

  deleteSkill: (id) =>
    api.delete(`/admin/skills/${id}`),

  // ==========================================================
  // CHAPTERS
  // ==========================================================

  listChapters: (params) =>
    api.get('/admin/chapters', {
      params,
    }),

  createChapter: (data) =>
    api.post('/admin/chapters', data),

  updateChapter: (id, data) =>
    api.put(`/admin/chapters/${id}`, data),

  deleteChapter: (id) =>
    api.delete(`/admin/chapters/${id}`),

  // ==========================================================
  // CHAPTER QUIZZES - ADMIN
  // ==========================================================

  getChapterQuiz: (chapterId) =>
    api.get(`/admin/chapters/${chapterId}/quiz`),

  updateChapterQuiz: (chapterId, data) =>
    api.put(
      `/admin/chapters/${chapterId}/quiz`,
      data
    ),

  // ==========================================================
  // CAREER ↔ SKILLS MAPPING
  // ==========================================================
  //
  // IMPORTANT:
  //
  // The backend career_skill_mapping collection is keyed
  // using the career CODE / Career ID, not necessarily the
  // MongoDB document _id.
  //
  // These helpers therefore accept either:
  //
  //   adminAPI.getCareerSkills(career)
  //
  // or:
  //
  //   adminAPI.getCareerSkills(career._id)
  //
  // When a complete career object is supplied, we first try
  // the backend's career-code fields.
  //
  // ==========================================================

  getCareerMappingId: (career) => {
    if (!career) {
      return null;
    }

    // If a complete career object was supplied,
    // prefer the actual career/code identifier.
    if (typeof career === 'object') {
      return (
        career.career_id ||
        career.careerId ||
        career.code ||
        career.career_code ||
        career.careerCode ||
        career['Career ID'] ||
        career._id ||
        career.id ||
        null
      );
    }

    return career;
  },

  getCareerSkills: (career) => {
    const mappingId =
      adminAPI.getCareerMappingId(career);

    if (!mappingId) {
      return Promise.reject(
        new Error(
          'Career mapping ID is missing.'
        )
      );
    }

    return api.get(
      `/admin/mappings/career-skills/${encodeURIComponent(
        mappingId
      )}`
    );
  },

  setCareerSkills: (career, skillIds) => {
    const mappingId =
      adminAPI.getCareerMappingId(career);

    if (!mappingId) {
      return Promise.reject(
        new Error(
          'Career mapping ID is missing.'
        )
      );
    }

    return api.put(
      `/admin/mappings/career-skills/${encodeURIComponent(
        mappingId
      )}`,
      {
        skillIds,
      }
    );
  },

  // ==========================================================
  // SKILL ↔ CHAPTER MAPPING
  // ==========================================================

  getSkillChapters: (skillId) => {
    if (!skillId) {
      return Promise.reject(
        new Error(
          'Skill ID is missing.'
        )
      );
    }

    return api.get(
      `/admin/mappings/skill-chapters/${encodeURIComponent(
        skillId
      )}`
    );
  },

  setSkillChapters: (
    skillId,
    chapterIds
  ) => {
    if (!skillId) {
      return Promise.reject(
        new Error(
          'Skill ID is missing.'
        )
      );
    }

    return api.put(
      `/admin/mappings/skill-chapters/${encodeURIComponent(
        skillId
      )}`,
      {
        chapterIds,
      }
    );
  },

  // ==========================================================
  // RESUMES
  // ==========================================================

  listResumes: (params) =>
    api.get('/admin/resumes', {
      params,
    }),

  getResume: (id) =>
    api.get(`/admin/resumes/${id}`),

  // ==========================================================
  // FEEDBACK
  // ==========================================================

  listFeedback: (params) =>
    api.get('/admin/feedback', {
      params,
    }),

  updateFeedbackStatus: (
    id,
    status
  ) =>
    api.put(
      `/admin/feedback/${id}`,
      {
        status,
      }
    ),

  replyToFeedback: (
    id,
    adminReply
  ) =>
    api.put(
      `/admin/feedback/${id}`,
      {
        adminReply,
      }
    ),

  // ==========================================================
  // EXPORT USERS
  // ==========================================================

  exportUsers: () =>
    api.get(
      '/admin/export/users',
      {
        responseType: 'blob',
      }
    ),

  // ==========================================================
  // EXPORT FEEDBACK
  // ==========================================================

  exportFeedback: () =>
    api.get(
      '/admin/export/feedback',
      {
        responseType: 'blob',
      }
    ),

  // ==========================================================
  // EXCEL IMPORT
  // ==========================================================

  importExcel: (file) => {
    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    return api.post(
      '/admin/import',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
        timeout: 120000,
      }
    );
  },

  // ==========================================================
  // AUDIT LOGS
  // ==========================================================

  listAuditLogs: (params) =>
    api.get(
      '/admin/audit-logs',
      {
        params,
      }
    ),
};

// ============================================================
// ONBOARDING API
// ============================================================

export const onboardingAPI = {
  getStatus: () =>
    api.get(
      '/users/onboarding'
    ),

  updateStep: (step) =>
    api.put(
      '/users/onboarding',
      {
        step,
      }
    ),
};

// ============================================================
// STUDY REMINDERS API
// ============================================================

export const studyReminderAPI = {
  list: () =>
    api.get(
      '/study-reminders'
    ),

  get: (id) =>
    api.get(
      `/study-reminders/${id}`
    ),

  create: (data) =>
    api.post(
      '/study-reminders',
      data
    ),

  update: (
    id,
    data
  ) =>
    api.put(
      `/study-reminders/${id}`,
      data
    ),

  delete: (id) =>
    api.delete(
      `/study-reminders/${id}`
    ),

  toggle: (id) =>
    api.put(
      `/study-reminders/${id}/toggle`
    ),

  snooze: (id) =>
    api.put(
      `/study-reminders/${id}/snooze`
    ),
};
