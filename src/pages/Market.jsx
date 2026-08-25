import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertCircle, ExternalLink } from 'lucide-react';
import { marketAPI } from '@/services/api';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';

export default function Market() {
  const [status, setStatus] = useState(null);
  const [trends, setTrends] = useState(null);
  const [powerBI, setPowerBI] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarket = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, trendsRes, powerRes] = await Promise.allSettled([
        marketAPI.getStatus(),
        marketAPI.getTrends(),
        marketAPI.getPowerBI(),
      ]);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data);
      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value.data);
      if (powerRes.status === 'fulfilled') setPowerBI(powerRes.value.data);
    } catch {
      setError('Failed to load market intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMarket(); }, []);

  if (loading) return <FullPageSpinner label="Loading market intelligence..." />;
  if (error) return <ErrorState message={error} onRetry={fetchMarket} />;

  const powerBIConfigured = powerBI?.embedUrl && powerBI?.reportId;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={24} style={{ color: 'var(--primary)' }} />
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text)' }}>Market Intelligence</h1>
        </div>
        <p className="text-muted">Explore trending careers, in-demand skills, and market trends.</p>
      </div>

      {/* Status banner */}
      {!status?.available && (
        <div className="card p-6 mb-6 flex items-start gap-3">
          <AlertCircle size={24} className="text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-medium" style={{ color: 'var(--text)' }}>Live market intelligence is currently unavailable.</p>
            <p className="text-sm text-muted mt-1">This feature requires Power BI configuration and/or a market data provider. Please check back later or contact the administrator.</p>
          </div>
        </div>
      )}

      {/* Trending Careers (admin-curated) */}
      {trends?.trendingCareers && trends.trendingCareers.length > 0 ? (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} /> Trending Careers
          </h3>
          <p className="text-xs text-muted mb-4">Curated by CareerCraft administrators</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.trendingCareers.map((career) => (
              <div key={career._id} className="p-4 rounded-lg" style={{ background: 'var(--bg)' }}>
                <p className="font-medium" style={{ color: 'var(--text)' }}>{career.name}</p>
                {career.description && <p className="text-xs text-muted mt-1">{career.description}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Trending Skills (admin-curated) */}
      {trends?.trendingSkills && trends.trendingSkills.length > 0 ? (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={20} style={{ color: 'var(--secondary)' }} /> Trending Skills
          </h3>
          <p className="text-xs text-muted mb-4">Curated by CareerCraft administrators</p>
          <div className="flex flex-wrap gap-2">
            {trends.trendingSkills.map((skill) => (
              <span key={skill._id} className="badge-primary">{skill.name}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Power BI */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <BarChart3 size={20} style={{ color: 'var(--primary)' }} /> Power BI Dashboard
        </h3>
        {powerBIConfigured ? (
          <div className="w-full" style={{ minHeight: '500px' }}>
            <iframe
              title="Power BI Report"
              src={powerBI.embedUrl}
              style={{ width: '100%', height: '500px', border: 'none', borderRadius: '0.5rem' }}
              allowFullScreen
            />
          </div>
        ) : (
          <EmptyState icon={BarChart3} title="Power BI not configured" message="Power BI integration requires configuration. Set POWERBI_EMBED_URL, POWERBI_REPORT_ID, and POWERBI_WORKSPACE_ID in the backend environment to enable live dashboards." />
        )}
      </div>
    </div>
  );
}
