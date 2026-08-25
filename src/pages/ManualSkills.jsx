import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Check, X, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { skillAPI, onboardingAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { useDebounce } from '@/hooks/useHooks';
import { FullPageSpinner, ButtonSpinner } from '@/components/Spinner';
import { ErrorState } from '@/components/States';

export default function ManualSkills() {
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const searchSkills = async () => {
    if (!debouncedSearch.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await skillAPI.search(debouncedSearch);
      setResults(res.data.skills || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { searchSkills(); }, [debouncedSearch]);

  const toggleSkill = (skill) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s._id === skill._id);
      return exists ? prev.filter((s) => s._id !== skill._id) : [...prev, skill];
    });
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      toast.warning('Please select at least one skill.');
      return;
    }
    setSubmitting(true);
    try {
      await skillAPI.addManualSkills(selected.map((s) => s._id));
      await onboardingAPI.updateStep('analysis');
      toast.success('Skills saved! Analyzing your career match...');
      navigate('/onboarding/analysis');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save skills');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 badge-primary mb-3">Step 2 of 4</div>
        <h1 className="text-3xl font-heading font-bold mb-2" style={{ color: 'var(--text)' }}>Enter Your Skills</h1>
        <p className="text-muted">Search and select skills from our curated database. Only recognized skills count.</p>
      </div>

      {selected.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Selected Skills ({selected.length})</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((skill) => (
              <span key={skill._id} className="badge-primary flex items-center gap-1">
                {skill.name}
                <button onClick={() => toggleSkill(skill)} className="hover:opacity-70"><X size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search skills (e.g., Python, SQL, Statistics...)" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      </div>

      {loading && <div className="text-center py-4"><ButtonSpinner /></div>}
      {error && <ErrorState message={error} onRetry={searchSkills} compact />}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-2 mb-6">
          {results
            .filter((r) => !selected.find((s) => s._id === r._id))
            .map((skill) => (
              <button key={skill._id} onClick={() => toggleSkill(skill)} className="card w-full p-3 flex items-center justify-between hover:shadow-soft transition-shadow">
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{skill.name}</p>
                  {skill.category && <p className="text-xs text-muted">{skill.category}</p>}
                </div>
                <Plus size={18} style={{ color: 'var(--primary)' }} />
              </button>
            ))}
        </div>
      )}

      {!loading && !error && debouncedSearch && results.length === 0 && (
        <p className="text-center text-muted py-4">No skills found. Try a different search term.</p>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={() => navigate('/onboarding/skill-source')} className="btn-ghost">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={handleSubmit} disabled={submitting || selected.length === 0} className="btn-primary">
          {submitting ? <ButtonSpinner /> : <>Confirm Skills <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}
