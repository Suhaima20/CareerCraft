import { useState, useEffect } from 'react';
import { Search, Briefcase, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import Modal from '@/components/Modal';
import { useDebounce } from '@/hooks/useHooks';

export default function AdminCareers() {
  const toast = useToast();
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', active: true });
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const fetchCareers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.listCareers({ q: debouncedSearch });
      setCareers(res.data.careers || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load careers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCareers(); }, [debouncedSearch]);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', active: true }); setShowModal(true); };
  const openEdit = (career) => { setEditing(career); setForm({ name: career.name, description: career.description || '', active: career.active !== false }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Career name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateCareer(editing._id, form);
        toast.success('Career updated');
      } else {
        await adminAPI.createCareer(form);
        toast.success('Career created');
      }
      setShowModal(false);
      fetchCareers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save career');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this career? This cannot be undone.')) return;
    try {
      await adminAPI.deleteCareer(id);
      toast.success('Career deleted');
      fetchCareers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete career');
    }
  };

  if (loading && careers.length === 0) return <FullPageSpinner label="Loading careers..." />;
  if (error) return <ErrorState message={error} onRetry={fetchCareers} />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Briefcase size={24} style={{ color: 'var(--primary)' }} /> Career Management
        </h1>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Career</button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search careers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {careers.length === 0 ? (
        <EmptyState icon={Briefcase} title="No careers found" message="Add a career to get started." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {careers.map((career) => (
            <div key={career._id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{career.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(career)} className="btn-ghost p-1.5"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(career._id)} className="btn-ghost p-1.5 text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-muted line-clamp-2">{career.description || 'No description'}</p>
              {career.active === false && <span className="badge-error mt-2">Inactive</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Career' : 'Add Career'}>
        <div className="space-y-4">
          <div>
            <label className="label">Career Name</label>
            <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Data Science" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Career description..." />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>Active</span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary"><X size={16} /> Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary"><Save size={16} /> Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
