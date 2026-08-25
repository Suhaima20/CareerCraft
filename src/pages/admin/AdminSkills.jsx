import { useState, useEffect } from 'react';
import { Search, GraduationCap, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import Modal from '@/components/Modal';
import { useDebounce } from '@/hooks/useHooks';

export default function AdminSkills() {
  const toast = useToast();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', active: true });
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.listSkills({ q: debouncedSearch });
      setSkills(res.data.skills || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSkills(); }, [debouncedSearch]);

  const openAdd = () => { setEditing(null); setForm({ name: '', category: '', description: '', active: true }); setShowModal(true); };
  const openEdit = (skill) => { setEditing(skill); setForm({ name: skill.name, category: skill.category || '', description: skill.description || '', active: skill.active !== false }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Skill name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateSkill(editing._id, form);
        toast.success('Skill updated');
      } else {
        await adminAPI.createSkill(form);
        toast.success('Skill created');
      }
      setShowModal(false);
      fetchSkills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this skill? This will affect related mappings.')) return;
    try {
      await adminAPI.deleteSkill(id);
      toast.success('Skill deleted');
      fetchSkills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete skill');
    }
  };

  if (loading && skills.length === 0) return <FullPageSpinner label="Loading skills..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSkills} />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <GraduationCap size={24} style={{ color: 'var(--primary)' }} /> Skill Management
        </h1>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Skill</button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {skills.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No skills found" message="Add a skill or import your dataset." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s._id} className="border-t border-themed">
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.category || '-'}</td>
                    <td className="px-4 py-3">{s.active === false ? <span className="badge-error">Inactive</span> : <span className="badge-success">Active</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(s)} className="btn-ghost p-1.5"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(s._id)} className="btn-ghost p-1.5 text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Skill' : 'Add Skill'}>
        <div className="space-y-4">
          <div>
            <label className="label">Skill Name</label>
            <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Python" />
          </div>
          <div>
            <label className="label">Category</label>
            <input type="text" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Programming" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
