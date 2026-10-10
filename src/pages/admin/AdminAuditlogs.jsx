import { useState, useEffect } from 'react';
import { Shield, Clock, Search, RefreshCw, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/components/Toast';
import { ButtonSpinner, FullPageSpinner } from '@/components/Spinner';

export default function AdminAuditLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setRefreshing(true);

      const res = await api.get(`/admin/audit-logs?page=${pageNum}&limit=15`);
      setLogs(res.data?.logs || []);
      setPage(res.data?.page || 1);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      toast.error('Failed to load administrative audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const filteredLogs = logs.filter((log) => {
    const action = (log.action || '').toLowerCase();
    const adminId = (log.adminId || '').toLowerCase();
    const query = search.toLowerCase();
    return action.includes(query) || adminId.includes(query);
  });

  if (loading) return <FullPageSpinner label="Loading audit logs..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Shield size={24} className="text-primary" /> Admin Audit Logs
          </h1>
          <p className="text-xs text-muted mt-1">
            Track administrative operations, system updates, and security events.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(1)}
          disabled={refreshing}
          className="btn-outline text-xs px-3 py-2 flex items-center gap-2"
        >
          {refreshing ? <ButtonSpinner /> : <RefreshCw size={14} />} Refresh Logs
        </button>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <Search size={16} className="text-muted" />
        <input
          type="text"
          className="input border-none text-xs w-full focus:ring-0"
          placeholder="Filter logs by action name or admin ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-themed bg-primary/5 font-semibold text-muted">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Admin ID</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-themed">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                    No administrative audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-primary/5 transition">
                    <td className="p-3 font-mono text-muted whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-primary">{log.action || 'system_event'}</td>
                    <td className="p-3 font-mono text-muted">{log.adminId || 'System / Auto'}</td>
                    <td className="p-3 font-mono text-xs max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : '{}'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 border-t border-themed flex items-center justify-between text-xs text-muted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-outline text-xs px-2 py-1"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-outline text-xs px-2 py-1"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}