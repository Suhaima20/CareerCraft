
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

import {
  Compass,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  Users,
  Briefcase,
  MessageSquare,
  FileDown,
  FileText,
  LogOut,
  Shield,
  ClipboardList,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // ADMIN NAVIGATION
  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/admin/users',
      label: 'User Management',
      icon: Users,
    },
    {
      to: '/admin/careers',
      label: 'Career Management',
      icon: Briefcase,
    },
    {
      to: '/admin/resumes',
      label: 'Resume Management',
      icon: FileText,
    },
    {
      to: '/admin/feedback',
      label: 'Feedback Management',
      icon: MessageSquare,
    },
    {
      to: '/admin/exports',
      label: 'Data Import & Export',
      icon: FileDown,
    },
    {
      to: '/admin/audit-logs',
      label: 'Audit Logs',
      icon: ClipboardList,
    },
  ];

  // ACTIVE NAVIGATION
  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="min-h-screen flex">

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:sticky
          top-0 left-0
          h-screen
          w-64
          bg-darkbg-card
          border-r border-themed
          z-40
          transition-transform duration-300
          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >

        {/* BRAND */}
        <div className="flex items-center justify-between p-4 border-b border-themed">
          <Link
            to="/admin"
            className="flex items-center gap-2 font-heading font-bold"
            style={{ color: 'var(--primary)' }}
          >
            <Shield size={22} />
            <span>Admin Panel</span>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden btn-ghost p-1"
            aria-label="Close admin menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav
          className="p-3 space-y-1 overflow-y-auto scrollbar-thin"
          style={{ maxHeight: 'calc(100vh - 160px)' }}
          aria-label="Admin navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`
                  flex items-center gap-3
                  px-3 py-2.5
                  rounded-lg
                  text-sm font-medium
                  transition-colors
                  ${
                    active
                      ? 'text-white'
                      : 'text-muted hover:bg-bg'
                  }
                `}
                style={
                  active
                    ? { background: 'var(--primary)' }
                    : {}
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ADMIN PROFILE AND LOGOUT */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-themed">

          <div className="flex items-center gap-3 px-2 py-2">
            <span
              className="
                w-8 h-8
                rounded-full
                flex items-center justify-center
                text-xs font-bold
                text-white
              "
              style={{ background: 'var(--primary)' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </span>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text)' }}
              >
                {user?.name || 'Administrator'}
              </p>

              <p className="text-xs text-muted">
                Administrator
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="
              w-full
              flex items-center gap-2
              px-3 py-2
              mt-1
              rounded-lg
              text-sm
              text-red-600
              hover:bg-red-50
              dark:hover:bg-red-950
            "
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="
            fixed inset-0
            bg-black/50
            z-30
            lg:hidden
          "
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <header
          className="
            sticky top-0
            z-20
            backdrop-blur-md
            bg-bg/80
            border-b border-themed
          "
        >
          <div
            className="
              flex items-center justify-between
              px-4 sm:px-6
              h-16
            "
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden btn-ghost p-2"
                aria-label="Open admin menu"
              >
                <Menu size={20} />
              </button>

              <Link
                to="/"
                className="btn-ghost p-2"
                aria-label="Home"
              >
                <Compass size={18} />
              </Link>
            </div>

            <button
              type="button"
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
        </header>

        {/* PAGE CONTENT */}
        <main
          className="
            flex-1
            p-4
            sm:p-6
            lg:p-8
            max-w-7xl
            w-full
            mx-auto
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
