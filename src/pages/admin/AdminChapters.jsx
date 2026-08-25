import { useState, useEffect } from 'react';
import { Search, BookOpen, Plus, Edit, Trash2, Save, X, Youtube, Clock } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import Modal from '@/components/Modal';
import { useDebounce } from '@/hooks/useHooks';

export default function AdminChapters() {
  const toast = useToast();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', youtubeUrl: '', duration: '', order: 0, active: true });
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const fetchChapters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.listChapters({ q: debouncedSearch });
      setChapters(res.data.chapters || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChapters(); }, [debouncedSearch]);

  const openAdd = () => { setEditing(null); setForm({ title: '', description: '', youtubeUrl: '', duration: '', order: 0, active: true }); setShowModal(true); };
  const openEdit = (ch) => { setEditing(ch); setForm({ title: ch.title, description: ch.description || '', youtubeUrl: ch.youtubeUrl || '', duration: ch.duration || '', order: ch.order || 0, active: ch.active !== false }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Chapter title is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateChapter(editing._id, form);
        toast.success('Chapter updated');
      } else {
        await adminAPI.createChapter(form);
        toast.success('Chapter created');
      }
      setShowModal(false);
      fetchChapters();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this chapter?')) return;
    try {
      await adminAPI.deleteChapter(id);
      toast.success('Chapter deleted');
      fetchChapters();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete chapter');
    }
  };

  if (loading && chapters.length === 0) return <FullPageSpinner label="Loading chapters..." />;
  if (error) return <ErrorState message={error} onRetry={fetchChapters} />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <BookOpen size={24} style={{ color: 'var(--primary)' }} /> Chapter Management
        </h1>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Chapter</button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search chapters..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {chapters.length === 0 ? (
        <EmptyState icon={BookOpen} title="No chapters found" message="Add a chapter or import your dataset." />
      ) : (
        <div className="space-y-3">
          {chapters.map((ch) => (
            <div key={ch._id} className="card p-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ch.title}</h3>
                  {ch.active === false && <span className="badge-error">Inactive</span>}
                </div>
                {ch.description && <p className="text-xs text-muted">{ch.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {ch.youtubeUrl && <a href={ch.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs link"><Youtube size={12} /> Video</a>}
                  {ch.duration && <span className="flex items-center gap-1 text-xs text-muted"><Clock size={12} /> {ch.duration}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(ch)} className="btn-ghost p-1.5"><Edit size={16} /></button>
                <button onClick={() => handleDelete(ch._id)} className="btn-ghost p-1.5 text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Chapter' : 'Add Chapter'}>
        <div className="space-y-4">
          <div>
            <label className="label">Chapter Title</label>
            <input type="text" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Introduction to Python" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">YouTube URL</label>
            <input type="url" className="input" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration</label>
              <input type="text" className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g., 30 min" />
            </div>
            <div>
              <label className="label">Order</label>
              <input type="number" className="input" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
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
