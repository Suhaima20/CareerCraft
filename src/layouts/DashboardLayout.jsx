
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Compass,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  FileText,
  Bell,
  LogOut,
  Home,
  GraduationCap,
  Award,
  Clock3,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { getInitials } from '../utils/helpers';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/roadmap', label: 'My Roadmap', icon: GraduationCap },
    { to: '/achievements', label: 'Achievements', icon: Award },
    { to: '/jobs', label: 'Jobs', icon: Briefcase },
    { to: '/market', label: 'Market Intelligence', icon: BarChart3 },
    { to: '/resume-builder', label: 'Resume Builder', icon: FileText },
    { to: '/study-reminders', label: 'Study Reminders', icon: Clock3 },
  ];

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex">

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-surface border-r border-themed z-40 transition-transform duration-300 ${
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-themed">

          <Link
            to="/"
            className="flex items-center gap-2 font-heading font-bold"
            style={{ color: 'var(--primary)' }}
          >
            <Compass size={22} />
            <span>CareerCraft</span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden btn-ghost p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className="p-3 space-y-1 overflow-y-auto scrollbar-thin"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? 'text-white'
                  : 'text-muted hover:bg-bg'
              }`}
              style={
                isActive(item.to)
                  ? { background: 'var(--primary)' }
                  : {}
              }
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-themed">

          <div className="flex items-center gap-3 px-2 py-2">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--primary)' }}
            >
              {getInitials(user?.name)}
            </span>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text)' }}
              >
                {user?.name}
              </p>

              <p className="text-xs text-muted truncate">
                {user?.profession}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="sticky top-0 z-20 backdrop-blur-md bg-bg/80 border-b border-themed">

          <div className="flex items-center justify-between px-4 sm:px-6 h-16">

            <div className="flex items-center gap-3">

              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden btn-ghost p-2"
              >
                <Menu size={20} />
              </button>

              <Link
                to="/"
                className="btn-ghost p-2"
                aria-label="Home"
              >
                <Home size={18} />
              </Link>
            </div>

            <div className="flex items-center gap-2">

              <Link
                to="/notifications"
                className="btn-ghost p-2 relative"
                aria-label="Notifications"
              >
                <Bell size={18} />

                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <button
                onClick={toggleTheme}
                className="btn-ghost p-2"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon size={18} />
                ) : (
                  <Sun size={18} />
                )}
              </button>

            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
