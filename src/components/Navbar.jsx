import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Compass, Menu, X, Sun, Moon, Bell, LogOut, User, LayoutDashboard, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useClickOutside } from '../hooks/useHooks';
import { getInitials } from '../utils/helpers';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useClickOutside(() => setProfileOpen(false));
  const notifRef = useClickOutside(() => setNotifOpen(false));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/resume-builder', label: 'Resume Builder' },
    { to: '/feedback', label: 'Feedback' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-bg/80 border-b border-themed">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg" style={{ color: 'var(--primary)' }}>
            <Compass size={24} />
            <span>CareerCraft</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.to) ? 'text-primary' : 'text-muted hover:text-primary'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost p-2 rounded-lg" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {isAuthenticated ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button onClick={() => setNotifOpen(!notifOpen)} className="btn-ghost p-2 rounded-lg relative" aria-label="Notifications">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
                </div>

                <div className="relative" ref={profileRef}>
                  <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 p-1 pr-2 rounded-lg btn-ghost">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
                      {getInitials(user?.name)}
                    </span>
                    <span className="hidden sm:block text-sm">{user?.name?.split(' ')[0]}</span>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 card p-2 animate-scale-in">
                      <div className="px-3 py-2 border-b border-themed">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.name}</p>
                        <p className="text-xs text-muted">{user?.email}</p>
                      </div>
                      <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-bg">
                        <LayoutDashboard size={16} /> Dashboard
                      </Link>
                      <Link to="/resume-builder" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-bg">
                        <FileText size={16} /> Resume Builder
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-ghost">Login</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden btn-ghost p-2 rounded-lg">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-themed animate-slide-up">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-muted hover:bg-surface">
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="flex gap-2 px-3 mt-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1">Login</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1">Get Started</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

function NotificationDropdown({ onClose }) {
  const { notifications, markAllRead, markRead } = useNotifications();
  return (
    <div className="absolute right-0 mt-2 w-80 card p-3 animate-scale-in max-h-96 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notifications</p>
        <button onClick={markAllRead} className="text-xs link">Mark all read</button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">No notifications</p>
      ) : (
        notifications.slice(0, 10).map((n) => (
          <div key={n._id} className={`px-3 py-2 rounded-lg mb-1 ${!n.read ? 'bg-bg' : ''}`}>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{n.message}</p>
            {!n.read && (
              <button onClick={() => markRead(n._id)} className="text-xs link mt-1">Mark read</button>
            )}
          </div>
        ))
      )}
      <button onClick={onClose} className="w-full text-center text-xs text-muted mt-2">Close</button>
    </div>
  );
}
