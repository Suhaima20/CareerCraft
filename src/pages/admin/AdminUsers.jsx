import { useState, useEffect } from 'react';
import { Search, Users, Eye, Trash2, X } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import Modal from '@/components/Modal';
import { useDebounce } from '@/hooks/useHooks';
import { formatDate } from '@/utils/helpers';

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.listUsers({ q: debouncedSearch, page, limit: 10 });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [debouncedSearch, page]);

  const viewUser = async (id) => {
    try {
      const res = await adminAPI.getUser(id);
      setSelectedUser(res.data.user);
      setShowModal(true);
    } catch (err) {
      toast.error('Failed to load user details');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteUser(id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  if (loading && users.length === 0) return <FullPageSpinner label="Loading users..." />;
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Users size={24} style={{ color: 'var(--primary)' }} /> User Management
        </h1>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" message="No users match your search." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Profession</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Joined</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-themed">
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{u.name}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3 text-muted">{u.profession || '-'}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => viewUser(u._id)} className="btn-ghost p-1.5"><Eye size={16} /></button>
                      <button onClick={() => handleDelete(u._id)} disabled={deleting === u._id} className="btn-ghost p-1.5 text-red-600"><Trash2 size={16} /></button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-3">
            <Detail label="Name" value={selectedUser.name} />
            <Detail label="Email" value={selectedUser.email} />
            <Detail label="Age" value={selectedUser.age} />
            <Detail label="Phone" value={selectedUser.phone} />
            <Detail label="Profession" value={selectedUser.profession} />
            <Detail label="Active Career" value={selectedUser.activeCareerName || 'Not set'} />
            <Detail label="Known Skills" value={(selectedUser.skills || []).map(s => s.name || s).join(', ') || 'None'} />
            <Detail label="Joined" value={formatDate(selectedUser.createdAt)} />
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
