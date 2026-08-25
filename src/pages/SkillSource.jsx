import { useNavigate } from 'react-router-dom';
import { FileText, Edit3, ArrowRight, ArrowLeft } from 'lucide-react';
import { onboardingAPI } from '@/services/api';

export default function SkillSource() {
  const navigate = useNavigate();

  const handleChoice = async (path) => {
    try {
      await onboardingAPI.updateStep(path === 'resume' ? 'resume-upload' : 'manual-skills');
    } catch { /* non-critical */ }
    navigate(`/onboarding/${path === 'resume' ? 'resume-upload' : 'manual-skills'}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 badge-primary mb-3">Step 2 of 4</div>
        <h1 className="text-3xl font-heading font-bold mb-2" style={{ color: 'var(--text)' }}>How Should We Identify Your Skills?</h1>
        <p className="text-muted">Choose how you'd like to tell us what you already know.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => handleChoice('resume')} className="card p-8 text-left hover:shadow-lift transition-all group">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(64,61,136,0.1)' }}>
            <FileText size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Upload Resume</h3>
          <p className="text-sm text-muted mb-4">Upload a PDF resume. Our NLP engine will extract and identify your skills automatically using spaCy.</p>
          <span className="link flex items-center gap-1 text-sm">Continue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
        </button>

        <button onClick={() => handleChoice('manual')} className="card p-8 text-left hover:shadow-lift transition-all group">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(64,61,136,0.1)' }}>
            <Edit3 size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Enter Skills Manually</h3>
          <p className="text-sm text-muted mb-4">Search and select your skills from our curated database. Only recognized skills count toward your profile.</p>
          <span className="link flex items-center gap-1 text-sm">Continue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
        </button>
      </div>

      <div className="flex justify-start mt-8">
        <button onClick={() => navigate('/onboarding/career')} className="btn-ghost">
          <ArrowLeft size={18} /> Back
        </button>
      </div>
    </div>
  );
}
