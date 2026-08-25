import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Compass, Menu, X, Sun, Moon, LayoutDashboard, Users, Briefcase, GraduationCap, BookOpen, GitBranch, TrendingUp, MessageSquare, FileDown, FileText, LogOut, Shield } from 'lucide-react';
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

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/careers', label: 'Careers', icon: Briefcase },
    { to: '/admin/skills', label: 'Skills', icon: GraduationCap },
    { to: '/admin/chapters', label: 'Chapters', icon: BookOpen },
    { to: '/admin/mappings', label: 'Mappings', icon: GitBranch },
    { to: '/admin/trending', label: 'Trending', icon: TrendingUp },
    { to: '/admin/resumes', label: 'Resumes', icon: FileText },
    { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
    { to: '/admin/exports', label: 'Exports', icon: FileDown },
  ];

  const isActive = (path) => path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-darkbg-card border-r border-themed z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 border-b border-themed">
          <Link to="/admin" className="flex items-center gap-2 font-heading font-bold" style={{ color: 'var(--primary)' }}>
            <Shield size={22} />
            <span>Admin Panel</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden btn-ghost p-1">
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.to) ? 'text-white' : 'text-muted hover:bg-bg'}`}
              style={isActive(item.to) ? { background: 'var(--primary)' } : {}}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-themed">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
              <p className="text-xs text-muted">Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-md bg-bg/80 border-b border-themed">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
                <Menu size={20} />
              </button>
              <Link to="/" className="btn-ghost p-2" aria-label="Home"><Compass size={18} /></Link>
            </div>
            <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
