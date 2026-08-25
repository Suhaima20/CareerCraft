import { Target, Brain, GraduationCap, Users, Compass, Sparkles } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <h1 className="text-4xl font-heading font-bold mb-4" style={{ color: 'var(--text)' }}>About CareerCraft</h1>
      <p className="text-lg text-muted mb-8">Smart Skill Gap Analysis and Career Recommendation System</p>

      <div className="card p-8 mb-6">
        <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text)' }}>Why CareerCraft Exists</h2>
        <p className="text-muted mb-4">
          The gap between what you know and what your dream career requires is often invisible. Students, freshers, and career switchers struggle to identify which skills they already have, which ones they're missing, and how to bridge that gap. CareerCraft was built to make that gap visible — and actionable.
        </p>
        <p className="text-muted">
          Instead of generic advice, CareerCraft uses Natural Language Processing to analyze your resume, extract real skills, and compare them against a curated career skill database. The result is a precise, personalized learning roadmap.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {[
          { icon: Target, title: 'Our Purpose', desc: 'To provide data-driven career intelligence that helps people make informed decisions about their learning and career path.' },
          { icon: Brain, title: 'NLP Approach', desc: 'We use spaCy NLP for resume processing and deterministic rule-based skill matching — no LLM hallucination, no fabricated data.' },
          { icon: GraduationCap, title: 'For Learners', desc: 'Students and freshers get a clear roadmap from where they are to where they want to be, with persistent progress tracking.' },
          { icon: Users, title: 'For Career Switchers', desc: 'Professionals changing paths can see which of their existing skills transfer and what they still need to learn.' },
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(64,61,136,0.1)' }}>
              <item.icon size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{item.title}</h3>
            <p className="text-sm text-muted">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Our Vision</h2>
        </div>
        <p className="text-muted">
          A world where career decisions are guided by data, not guesswork. Where every learner can see their exact skill position, their gap, and their path forward — and track real progress toward their dream career.
        </p>
      </div>
    </div>
  );
}
