import { Link } from 'react-router-dom';
import { ArrowRight, Compass, FileText, Target, TrendingUp, GraduationCap, Award, BarChart3, Briefcase, Brain, CheckCircle2, Sparkles, BookOpen, Rocket, LineChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 badge-primary mb-6 animate-slide-up">
            <Sparkles size={14} />
            AI-Assisted Career Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-6 animate-slide-up" style={{ color: 'var(--text)' }}>
            Navigate Your Career with <span style={{ color: 'var(--primary)' }}>Intelligence</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-8 animate-slide-up">
            Smart Skill Gap Analysis and Career Recommendation System. Discover your skills, close your gaps, and build a roadmap to your dream career.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up">
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-primary text-base px-6 py-3">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/about" className="btn-secondary text-base px-6 py-3">
              Explore CareerCraft
            </Link>
            <Link to="/resume-builder" className="btn-outline text-base px-6 py-3">
              Build Your Resume
            </Link>
          </div>
        </div>
      </section>

      {/* Why CareerCraft */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">Why CareerCraft Exists</h2>
            <p className="text-muted max-w-2xl mx-auto">
              Career paths are rarely straight. Most students and professionals don't know what skills they're missing — or even what skills they already have. CareerCraft uses NLP to analyze your resume, identify your skill gaps, and build a personalized learning roadmap.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'NLP-Powered Analysis', desc: 'spaCy NLP extracts and identifies skills from your resume — no LLM, no guessing.' },
              { icon: Target, title: 'Precision Skill Gap', desc: 'Deterministic matching against a curated skill database. Real numbers, not fabricated.' },
              { icon: GraduationCap, title: 'Personalized Roadmap', desc: "A learning path built from only the skills you're missing. Track progress that persists." },
            ].map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-lift transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(64,61,136,0.1)' }}>
                  <f.icon size={24} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Story Journey */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">How CareerCraft Works</h2>
            <p className="text-muted max-w-2xl mx-auto">Your journey from dream to destination, step by step.</p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-themed hidden md:block" style={{ transform: 'translateX(-50%)' }} />
            <div className="space-y-8">
              {[
                { icon: Rocket, title: 'Pick Your Dream Career', desc: 'Choose from data-driven career paths like Data Science, Data Analyst, Data Engineer, and Machine Learning Engineer.' },
                { icon: FileText, title: 'Upload Resume or Enter Skills', desc: 'Upload a PDF resume for NLP extraction, or select skills manually from our curated database.' },
                { icon: Brain, title: 'NLP Skill Extraction', desc: 'spaCy processes your resume to identify and normalize skills against our dataset.' },
                { icon: Target, title: 'Skill Gap Analysis', desc: "See your match percentage, known skills, and exactly what's missing." },
                { icon: TrendingUp, title: 'Career Match & Recommendation', desc: 'Get alternative career suggestions based on your actual skill profile.' },
                { icon: BookOpen, title: 'Personalized Roadmap', desc: 'A learning path containing only your missing skills, with chapters and resources.' },
                { icon: CheckCircle2, title: 'Track Progress', desc: 'Complete chapters, track streaks, and watch your progress persist across sessions.' },
                { icon: Award, title: 'Earn Achievements', desc: 'Unlock milestones as you progress through your learning journey.' },
                { icon: FileText, title: 'ATS Resume Builder', desc: 'Build an ATS-friendly resume. Available to guests and registered users.' },
                { icon: Briefcase, title: 'Relevant Jobs', desc: 'See external job opportunities relevant to your career path.' },
                { icon: BarChart3, title: 'Market Intelligence', desc: 'Explore trending careers and skills with Power BI integration.' },
              ].map((step, i) => (
                <div key={step.title} className={`flex flex-col md:flex-row items-center gap-6 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className={`card p-6 ${i % 2 === 1 ? 'md:text-right' : ''}`}>
                      <div className="flex items-center gap-3 mb-2" style={{ justifyContent: i % 2 === 1 ? 'flex-end' : 'flex-start' }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(64,61,136,0.1)' }}>
                          <step.icon size={20} style={{ color: 'var(--primary)' }} />
                        </div>
                        <span className="badge-primary">{i + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>{step.title}</h3>
                      <p className="text-sm text-muted">{step.desc}</p>
                    </div>
                  </div>
                  <div className="hidden md:block w-0" />
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-title mb-4">Ready to Start Your Journey?</h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Join CareerCraft and build a clear path to your dream career with data-driven skill analysis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-primary text-base px-6 py-3">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/resume-builder" className="btn-outline text-base px-6 py-3">
              Build Your Resume
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
