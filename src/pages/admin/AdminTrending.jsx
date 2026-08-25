import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Plus, Trash2, Briefcase, GraduationCap, Star } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner, ButtonSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import Modal from '@/components/Modal';

export default function AdminTrending() {
  const toast = useToast();
  const [trending, setTrending] = useState([]);
  const [careers, setCareers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'career', itemId: '', label: '' });
  const [saving, setSaving] = useState(false);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, careersRes, skillsRes] = await Promise.all([
        adminAPI.listTrending(),
        adminAPI.listCareers({}),
        adminAPI.listSkills({}),
      ]);
      setTrending(trendRes.data.trending || []);
      setCareers(careersRes.data.careers || []);
      setSkills(skillsRes.data.skills || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load trending content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrending(); }, [fetchTrending]);

  const handleAdd = async () => {
    if (!form.itemId) { toast.error('Please select an item'); return; }
    setSaving(true);
    try {
      await adminAPI.addTrending({ type: form.type, itemId: form.itemId, label: form.label });
      toast.success('Trending item added');
      setShowModal(false);
      setForm({ type: 'career', itemId: '', label: '' });
      fetchTrending();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add trending item');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this trending item?')) return;
    try {
      await adminAPI.removeTrending(id);
      toast.success('Trending item removed');
      fetchTrending();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove trending item');
    }
  };

  const openAdd = () => {
    setForm({ type: 'career', itemId: '', label: '' });
    setShowModal(true);
  };

  if (loading) return <FullPageSpinner label="Loading trending content..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTrending} />;

  const careerTrends = trending.filter((t) => t.type === 'career');
  const skillTrends = trending.filter((t) => t.type === 'skill');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <TrendingUp size={24} style={{ color: 'var(--primary)' }} /> Trending Content
        </h1>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Trending</button>
      </div>

      <div className="card p-4 mb-4 flex items-start gap-3">
        <Star size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted">
          Admin-curated trends are manually selected by administrators. They are clearly distinguished from automatically calculated live market trends shown on the Market Intelligence page. Never mix the two.
        </p>
      </div>

      {trending.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No trending content" message="Add trending careers or skills to feature on the Market Intelligence page." />
      ) : (
        <div className="space-y-6">
          {careerTrends.length > 0 && (
            <div className="card p-5">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Briefcase size={20} style={{ color: 'var(--primary)' }} /> Trending Careers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {careerTrends.map((t) => (
                  <div key={t._id} className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--bg)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.label || t.itemName || 'Unknown'}</p>
                      <span className="badge-primary mt-1">Career</span>
                    </div>
                    <button onClick={() => handleRemove(t._id)} className="btn-ghost p-1.5 text-red-600"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {skillTrends.length > 0 && (
            <div className="card p-5">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <GraduationCap size={20} style={{ color: 'var(--secondary)' }} /> Trending Skills
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {skillTrends.map((t) => (
                  <div key={t._id} className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--bg)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.label || t.itemName || 'Unknown'}</p>
                      <span className="badge-primary mt-1">Skill</span>
                    </div>
                    <button onClick={() => handleRemove(t._id)} className="btn-ghost p-1.5 text-red-600"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Trending Item">
        <div className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, itemId: '' })}>
              <option value="career">Career</option>
              <option value="skill">Skill</option>
            </select>
          </div>
          <div>
            <label className="label">{form.type === 'career' ? 'Career' : 'Skill'}</label>
            <select className="input" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              <option value="">Select a {form.type}...</option>
              {(form.type === 'career' ? careers : skills).map((item) => (
                <option key={item._id} value={item._id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Display Label (optional)</label>
            <input type="text" className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Custom display label..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary">
              {saving ? <ButtonSpinner /> : <><Plus size={16} /> Add</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
