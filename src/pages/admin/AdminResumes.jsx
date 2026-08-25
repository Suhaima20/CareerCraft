import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Eye, Calendar, User } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import Modal from '@/components/Modal';
import { useDebounce } from '@/hooks/useHooks';
import { formatDate } from '@/utils/helpers';

export default function AdminResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.listResumes({ q: debouncedSearch, page, limit: 10 });
      setResumes(res.data.resumes || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load resumes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const viewResume = async (id) => {
    try {
      const res = await adminAPI.getResume(id);
      setSelectedResume(res.data.resume);
      setShowModal(true);
    } catch (err) {
      setError('Failed to load resume details');
    }
  };

  if (loading && resumes.length === 0) return <FullPageSpinner label="Loading resumes..." />;
  if (error) return <ErrorState message={error} onRetry={fetchResumes} />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <FileText size={24} style={{ color: 'var(--primary)' }} /> Resume Management
        </h1>
        <p className="text-muted">View resume metadata. Resume files are never publicly exposed.</p>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search by user or filename..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {resumes.length === 0 ? (
        <EmptyState icon={FileText} title="No resumes found" message="No resume uploads match your search." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Filename</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Size</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Uploaded</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r._id} className="border-t border-themed">
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{r.userName || r.userId?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-muted">{r.originalFilename || r.filename || '-'}</td>
                    <td className="px-4 py-3 text-muted">{r.fileSize ? `${(r.fileSize / 1024).toFixed(1)} KB` : '-'}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(r.uploadedAt || r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => viewResume(r._id)} className="btn-ghost p-1.5"><Eye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary">Next</button>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Resume Details" size="lg">
        {selectedResume && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
              <User size={18} className="text-muted" />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedResume.userName || selectedResume.userId?.name || 'Unknown'}</span>
            </div>
            <Detail label="Filename" value={selectedResume.originalFilename || selectedResume.filename} />
            <Detail label="File Size" value={selectedResume.fileSize ? `${(selectedResume.fileSize / 1024).toFixed(1)} KB` : '-'} />
            <Detail label="MIME Type" value={selectedResume.mimeType || '-'} />
            <Detail label="Uploaded" value={formatDate(selectedResume.uploadedAt || selectedResume.createdAt)} />
            {selectedResume.extractedSkills && selectedResume.extractedSkills.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <p className="text-sm text-muted mb-2">Extracted Skills</p>
                <div className="flex flex-wrap gap-2">
                  {selectedResume.extractedSkills.map((s, i) => (
                    <span key={i} className="badge-primary">{s.name || s}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted">Resume file content is stored securely and is not publicly accessible.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
      <span className="text-sm text-muted sm:w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value || '-'}</span>
    </div>
  );
}
