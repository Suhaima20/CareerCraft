import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import { useDebounce } from '@/hooks/useHooks';
import { formatDateTime } from '@/utils/helpers';

const STATUS_OPTIONS = ['pending', 'reviewed', 'resolved'];
const STATUS_ICONS = { pending: Clock, reviewed: AlertCircle, resolved: CheckCircle };
const STATUS_COLORS = { pending: '#C99A2E', reviewed: '#403D88', resolved: '#3B7A57' };

export default function AdminFeedback() {
  const toast = useToast();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updating, setUpdating] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.listFeedback({ q: debouncedSearch, status: statusFilter, page, limit: 10 });
      setFeedback(res.data.feedback || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await adminAPI.updateFeedbackStatus(id, status);
      toast.success('Feedback status updated');
      setFeedback((prev) => prev.map((f) => f._id === id ? { ...f, status } : f));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  if (loading && feedback.length === 0) return <FullPageSpinner label="Loading feedback..." />;
  if (error) return <ErrorState message={error} onRetry={fetchFeedback} />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <MessageSquare size={24} style={{ color: 'var(--primary)' }} /> Feedback Management
        </h1>
        <p className="text-muted">Review and manage user feedback</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" className="input pl-10" placeholder="Search feedback..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {feedback.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback found" message="No feedback matches your search." />
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => {
            const StatusIcon = STATUS_ICONS[f.status] || Clock;
            const statusColor = STATUS_COLORS[f.status] || '#57595B';
            return (
              <div key={f._id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{f.name || 'Guest'}</span>
                      {f.email && <span className="text-xs text-muted">({f.email})</span>}
                    </div>
                    <p className="text-sm text-muted">{f.message}</p>
                    <p className="text-xs text-muted mt-2">{formatDateTime(f.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="badge flex items-center gap-1" style={{ background: `${statusColor}15`, color: statusColor }}>
                      <StatusIcon size={12} /> {f.status || 'pending'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-themed">
                  <span className="text-xs text-muted">Update status:</span>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(f._id, s)}
                      disabled={updating === f._id || f.status === s}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${f.status === s ? 'font-bold' : 'hover:bg-bg'}`}
                      style={f.status === s ? { color: STATUS_COLORS[s] } : { color: 'var(--text-muted)' }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary">Next</button>
        </div>
      )}
    </div>
  );
}
