import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { NotificationProvider } from './context/NotificationContext';

import {
  ProtectedRoute,
  AdminProtectedRoute,
  GuestRoute,
} from './components/ProtectedRoute';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

import Landing from './pages/Landing';
import About from './pages/About';
import Feedback from './pages/Feedback';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import Register from './pages/Register';

import CareerSelection from './pages/CareerSelection';
import SkillSource from './pages/SkillSource';
import ResumeUpload from './pages/ResumeUpload';
import ManualSkills from './pages/ManualSkills';
import SkillConfirmation from './pages/SkillConfirmation';
import Analysis from './pages/Analysis';
import CareerRecommendation from './pages/CareerRecommendation';
import Roadmap from './pages/Roadmap';

import Dashboard from './pages/Dashboard';
import Achievements from './pages/Achievements';
import Jobs from './pages/Jobs';
import Market from './pages/Market';
import Notifications from './pages/Notifications';
import ResumeBuilder from './pages/ResumeBuilder';
import StudyReminders from './pages/StudyReminders';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCareers from './pages/admin/AdminCareers';
import AdminSkills from './pages/admin/AdminSkills';
import AdminChapters from './pages/admin/AdminChapters';
import AdminMappings from './pages/admin/AdminMappings';
import AdminResumes from './pages/admin/AdminResumes';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminExports from './pages/admin/AdminExports';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import QuizManagement from './pages/admin/QuizManagement';

import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>

                {/* =====================================================
                    PUBLIC ROUTES
                ===================================================== */}
                <Route element={<PublicLayout />}>

                  <Route
                    path="/"
                    element={<Landing />}
                  />

                  <Route
                    path="/about"
                    element={<About />}
                  />

                  <Route
                    path="/jobs"
                    element={<Jobs />}
                  />

                  <Route
                    path="/market"
                    element={<Market />}
                  />

                  <Route
                    path="/feedback"
                    element={<Feedback />}
                  />

                  <Route
                    path="/terms"
                    element={<Terms />}
                  />

                  <Route
                    path="/privacy"
                    element={<Privacy />}
                  />

                  <Route
                    path="/resume-builder"
                    element={<ResumeBuilder />}
                  />

                  {/* =================================================
                      GUEST AUTH
                  ================================================= */}
                  <Route
                    path="/login"
                    element={
                      <GuestRoute>
                        <Login />
                      </GuestRoute>
                    }
                  />

                  <Route
                    path="/register"
                    element={
                      <GuestRoute>
                        <Register />
                      </GuestRoute>
                    }
                  />

                  {/* =================================================
                      ADMIN LOGIN
                  ================================================= */}
                  <Route
                    path="/admin/login"
                    element={<AdminLogin />}
                  />

                </Route>


                {/* =====================================================
                    ONBOARDING ROUTES
                    LOGIN REQUIRED
                ===================================================== */}
                <Route
                  element={
                    <ProtectedRoute>
                      <PublicLayout />
                    </ProtectedRoute>
                  }
                >

                  <Route
                    path="/onboarding/career"
                    element={<CareerSelection />}
                  />

                  <Route
                    path="/onboarding/skill-source"
                    element={<SkillSource />}
                  />

                  <Route
                    path="/onboarding/resume-upload"
                    element={<ResumeUpload />}
                  />

                  <Route
                    path="/onboarding/manual-skills"
                    element={<ManualSkills />}
                  />

                  <Route
                    path="/onboarding/skill-confirmation"
                    element={<SkillConfirmation />}
                  />

                  <Route
                    path="/onboarding/analysis"
                    element={<Analysis />}
                  />

                  <Route
                    path="/onboarding/recommendation"
                    element={<CareerRecommendation />}
                  />

                  <Route
                    path="/onboarding/roadmap"
                    element={<Roadmap />}
                  />

                </Route>


                {/* =====================================================
                    DASHBOARD / PERSONAL ROUTES
                    LOGIN REQUIRED
                ===================================================== */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >

                  <Route
                    path="/dashboard"
                    element={<Dashboard />}
                  />

                  <Route
                    path="/roadmap"
                    element={<Roadmap />}
                  />

                  <Route
                    path="/achievements"
                    element={<Achievements />}
                  />

                  <Route
                    path="/notifications"
                    element={<Notifications />}
                  />

                  <Route
                    path="/study-reminders"
                    element={<StudyReminders />}
                  />

                </Route>


                {/* =====================================================
                    ADMIN ROUTES
                    ADMIN LOGIN REQUIRED
                ===================================================== */}
                <Route
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout />
                    </AdminProtectedRoute>
                  }
                >

                  <Route
                    path="/admin"
                    element={<AdminDashboard />}
                  />

                  <Route
                    path="/admin/users"
                    element={<AdminUsers />}
                  />

                  <Route
                    path="/admin/careers"
                    element={<AdminCareers />}
                  />

                  <Route
                    path="/admin/skills"
                    element={<AdminSkills />}
                  />

                  <Route
                    path="/admin/chapters"
                    element={<AdminChapters />}
                  />

                  <Route
                    path="/admin/mappings"
                    element={<AdminMappings />}
                  />

                  {
                  /* =================================================
                      QUIZ MANAGEMENT
                  ================================================= */}
                  <Route
                    path="/admin/quizzes"
                    element={<QuizManagement />}
                  />

                  <Route
                    path="/admin/resumes"
                    element={<AdminResumes />}
                  />

                  <Route
                    path="/admin/feedback"
                    element={<AdminFeedback />}
                  />

                  <Route
                    path="/admin/exports"
                    element={<AdminExports />}
                  />

                  <Route
                    path="/admin/audit-logs"
                    element={<AdminAuditLogs />}
                  />

                </Route>


                {/* =====================================================
                    404
                ===================================================== */}
                <Route
                  path="*"
                  element={
                    <PublicLayout>
                      <NotFound />
                    </PublicLayout>
                  }
                />

              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}