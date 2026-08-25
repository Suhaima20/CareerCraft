import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap, Award, TrendingUp, FileText, Bell, Flame, Target, ArrowRight, BarChart3, CheckCircle2, XCircle, RefreshCw, BookOpen } from 'lucide-react';
import { analysisAPI, careerAPI, roadmapAPI, achievementAPI, jobAPI, marketAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const careerId = user?.activeCareerId;

  const fetchDashboard = useCallback(async () => {
    if (!careerId) {
      navigate('/onboarding/career');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [analysisRes, roadmapRes, achieveRes, jobsRes, marketRes] = await Promise.allSettled([
        analysisAPI.getResult(careerId),
        roadmapAPI.get(careerId),
        achievementAPI.list(),
        jobAPI.list({ limit: 3 }),
        marketAPI.getStatus(),
      ]);
      if (analysisRes.status === 'fulfilled') setAnalysis(analysisRes.value.data);
      if (roadmapRes.status === 'fulfilled') setRoadmap(roadmapRes.value.data);
      if (achieveRes.status === 'fulfilled') setAchievements(achieveRes.value.data.achievements || []);
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data.jobs || []);
      if (marketRes.status === 'fulfilled') setMarketStatus(marketRes.value.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [careerId, navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <FullPageSpinner label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const knownSkills = analysis?.knownSkills || [];
  const missingSkills = analysis?.missingSkills || [];
  const matchPercent = analysis?.matchPercentage || 0;
  const progress = roadmap?.progress || 0;
  const completedChapters = roadmap?.completedChapters || 0;
  const totalChapters = roadmap?.totalChapters || 0;

  const skillData = [
    { name: 'Known', value: knownSkills.length, color: '#3B7A57' },
    { name: 'Missing', value: missingSkills.length, color: '#B5444B' },
  ].filter((d) => d.value > 0);

  const progressData = [
    { name: 'Completed', value: completedChapters, color: 'var(--primary)' },
    { name: 'Remaining', value: Math.max(0, totalChapters - completedChapters), color: 'var(--border)' },
  ].filter((d) => d.value > 0);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text)' }}>
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted">Here's your career progress overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-warning flex items-center gap-1">
            <Flame size={14} /> {user?.streak || 0} day streak
          </span>
        </div>
      </div>

      {/* Active Career Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(64,61,136,0.1)' }}>
              <Briefcase size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="text-sm text-muted">Active Career</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{analysis?.careerName || user?.activeCareerName || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{matchPercent}%</p>
              <p className="text-xs text-muted">Match</p>
            </div>
            <button onClick={() => navigate('/onboarding/career')} className="btn-outline">
              <RefreshCw size={16} /> Switch Career
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle2, label: 'Known Skills', value: knownSkills.length, color: '#3B7A57' },
          { icon: XCircle, label: 'Missing Skills', value: missingSkills.length, color: '#B5444B' },
          { icon: BookOpen, label: 'Chapters Done', value: `${completedChapters}/${totalChapters}`, color: 'var(--primary)' },
          { icon: Award, label: 'Achievements', value: unlockedAchievements.length, color: 'var(--secondary)' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={18} style={{ color: stat.color }} />
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <BarChart3 size={20} style={{ color: 'var(--primary)' }} /> Skill Distribution
          </h3>
          {skillData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={skillData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {skillData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted text-sm text-center py-8">No skill data yet</p>}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} /> Learning Progress
          </h3>
          {progressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={progressData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {progressData.map((entry, i) => <Cell key={i} fill={entry.color === 'var(--primary)' ? '#403D88' : '#E8D1C5'} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted text-sm text-center py-8">No progress data yet</p>}
          <p className="text-xs text-muted mt-2 text-center">{progress}% complete</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/roadmap" className="card p-5 hover:shadow-lift transition-shadow group">
          <div className="flex items-center gap-3">
            <GraduationCap size={24} style={{ color: 'var(--primary)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text)' }}>My Roadmap</p>
              <p className="text-xs text-muted">Continue learning</p>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-muted" />
          </div>
        </Link>

        <Link to="/achievements" className="card p-5 hover:shadow-lift transition-shadow group">
          <div className="flex items-center gap-3">
            <Award size={24} style={{ color: 'var(--secondary)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text)' }}>Achievements</p>
              <p className="text-xs text-muted">{unlockedAchievements.length} unlocked</p>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-muted" />
          </div>
        </Link>

        <Link to="/resume-builder" className="card p-5 hover:shadow-lift transition-shadow group">
          <div className="flex items-center gap-3">
            <FileText size={24} style={{ color: 'var(--accent)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text)' }}>Resume Builder</p>
              <p className="text-xs text-muted">Build ATS-friendly resume</p>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-muted" />
          </div>
        </Link>
      </div>

      {/* Market Intelligence */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(64,61,136,0.1)' }}>
              <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--text)' }}>Market Intelligence</p>
              <p className="text-sm text-muted">
                {marketStatus?.available
                  ? `Current Trending: ${marketStatus?.trendingJob || 'Data Analyst'}`
                  : 'Live market intelligence is currently unavailable.'}
              </p>
            </div>
          </div>
          <Link to="/market" className="btn-outline">View Market Insights</Link>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Briefcase size={20} style={{ color: 'var(--primary)' }} /> Relevant Jobs
          </h3>
          <Link to="/jobs" className="link text-sm">View All</Link>
        </div>
        {jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <a key={job._id} href={job.externalUrl} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-bg transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{job.title}</p>
                    <p className="text-xs text-muted">{job.company} · {job.location}</p>
                  </div>
                  <ArrowRight size={16} className="text-muted" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState icon={Briefcase} title="No jobs available" message="External job data is currently unavailable. Check back later." />
        )}
      </div>
    </div>
  );
}
