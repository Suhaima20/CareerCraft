import { useState, useEffect } from 'react';
import { Users, Briefcase, GraduationCap, BookOpen, FileText, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState } from '@/components/States';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <FullPageSpinner label="Loading admin dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} />;

  const cards = [
    { icon: Users, label: 'Total Users', value: stats?.totalUsers || 0, color: 'var(--primary)' },
    { icon: Activity, label: 'Active Users', value: stats?.activeUsers || 0, color: '#3B7A57' },
    { icon: Briefcase, label: 'Careers', value: stats?.totalCareers || 0, color: 'var(--secondary)' },
    { icon: GraduationCap, label: 'Skills', value: stats?.totalSkills || 0, color: 'var(--accent)' },
    { icon: BookOpen, label: 'Chapters', value: stats?.totalChapters || 0, color: 'var(--primary)' },
    { icon: FileText, label: 'Resume Uploads', value: stats?.totalResumes || 0, color: '#C99A2E' },
    { icon: MessageSquare, label: 'Feedback', value: stats?.totalFeedback || 0, color: '#B5444B' },
    { icon: TrendingUp, label: 'Trending Items', value: stats?.totalTrending || 0, color: 'var(--secondary)' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text)' }}>Admin Dashboard</h1>
        <p className="text-muted">Platform overview and statistics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${card.color}15` }}>
              <card.icon size={20} style={{ color: card.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{card.value}</p>
            <p className="text-xs text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <div className="card p-5 mt-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Recent Users</h3>
          <div className="space-y-2">
            {stats.recentUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
                <span className="text-xs text-muted">{new Date(u.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
