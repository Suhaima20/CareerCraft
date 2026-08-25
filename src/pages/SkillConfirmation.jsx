import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowLeft, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { resumeAPI, skillAPI, onboardingAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner, ButtonSpinner } from '@/components/Spinner';
import { ErrorState } from '@/components/States';

export default function SkillConfirmation() {
  const toast = useToast();
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [confirmed, setConfirmed] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchExtracted = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resumeAPI.getExtracted();
      const extracted = res.data.skills || [];
      setSkills(extracted);
      setConfirmed(new Set(extracted.map((s) => s._id || s.skill_id)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load extracted skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExtracted(); }, []);

  const toggleConfirm = (id) => {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await skillAPI.confirmExtractedSkills([...confirmed]);
      await onboardingAPI.updateStep('analysis');
      toast.success('Skills confirmed! Analyzing your career match...');
      navigate('/onboarding/analysis');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm skills');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading extracted skills..." />;
  if (error) return <ErrorState message={error} onRetry={fetchExtracted} />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 badge-primary mb-3">
          <Sparkles size={14} /> NLP Extraction Complete
        </div>
        <h1 className="text-3xl font-heading font-bold mb-2" style={{ color: 'var(--text)' }}>Confirm Your Skills</h1>
        <p className="text-muted">Our NLP engine identified these skills from your resume. Confirm the ones that are correct.</p>
      </div>

      {skills.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText size={48} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4" />
          <p className="text-muted mb-4">No skills were detected from your resume. This could mean the resume format wasn't fully parseable, or your skills aren't in our database yet.</p>
          <button onClick={() => navigate('/onboarding/manual-skills')} className="btn-primary">Enter Skills Manually Instead</button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {skills.map((skill) => {
              const id = skill._id || skill.skill_id;
              const isConfirmed = confirmed.has(id);
              return (
                <div key={id} className={`card p-4 flex items-center justify-between cursor-pointer transition-all ${isConfirmed ? 'ring-1' : ''}`} style={isConfirmed ? { borderColor: 'var(--primary)' } : {}} onClick={() => toggleConfirm(id)}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{skill.name}</p>
                    {skill.category && <p className="text-xs text-muted">{skill.category}</p>}
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: isConfirmed ? 'var(--primary)' : 'transparent', border: isConfirmed ? 'none' : '1px solid var(--border)' }}>
                    {isConfirmed && <Check size={16} className="text-white" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => navigate('/onboarding/resume-upload')} className="btn-ghost">
              <ArrowLeft size={18} /> Back
            </button>
            <button onClick={handleConfirm} disabled={submitting || confirmed.size === 0} className="btn-primary">
              {submitting ? <ButtonSpinner /> : <>Confirm & Analyze <ArrowRight size={18} /></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
