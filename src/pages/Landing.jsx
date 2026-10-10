import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  GraduationCap,
  LineChart,
  MapPin,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const startPath = isAuthenticated ? '/dashboard' : '/register';

  return (
    <div className="animate-fade-in overflow-hidden">

      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative min-h-[680px] flex items-center overflow-hidden">

        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'var(--primary)' }}
        />

        <div
          className="absolute -bottom-40 -left-40 w-[450px] h-[450px] rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'var(--primary)' }}
        />

        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 lg:py-28">

          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-20 items-center">

            {/* =====================================================
                HERO TEXT
            ===================================================== */}
            <div>

              <div className="inline-flex items-center gap-2 badge-primary mb-6 animate-slide-up">
                <Sparkles size={14} />
                Career Intelligence Platform
              </div>

              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight mb-7 animate-slide-up"
                style={{ color: 'var(--text)' }}
              >
                Turn your skills into{' '}
                <span style={{ color: 'var(--primary)' }}>
                  a career path.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted max-w-2xl leading-relaxed mb-9 animate-slide-up">
                Discover what you already know, identify the skills you're
                missing, and build a personalized roadmap toward the career
                you want.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 animate-slide-up">

                <Link
                  to={startPath}
                  className="btn-primary text-base px-7 py-3.5"
                >
                  {isAuthenticated
                    ? 'Go to Dashboard'
                    : 'Start Your Journey'}
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/about"
                  className="btn-secondary text-base px-7 py-3.5"
                >
                  Explore CareerCraft
                </Link>

              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 text-sm text-muted">

                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    style={{ color: 'var(--primary)' }}
                  />
                  Resume skill analysis
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    style={{ color: 'var(--primary)' }}
                  />
                  Personalized roadmap
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    style={{ color: 'var(--primary)' }}
                  />
                  Live opportunities
                </div>

              </div>
            </div>


            {/* =====================================================
                HERO VISUAL
            ===================================================== */}
            <div className="relative hidden md:block">

              <div
                className="relative rounded-3xl p-5 sm:p-7 border shadow-lift"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >

                <div className="flex items-center justify-between mb-6">

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                      Career intelligence
                    </p>

                    <h3
                      className="text-xl font-heading font-semibold mt-1"
                      style={{ color: 'var(--text)' }}
                    >
                      Example Career Snapshot
                    </h3>
                  </div>

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(64,61,136,0.10)',
                      color: 'var(--primary)',
                    }}
                  >
                    <LineChart size={20} />
                  </div>

                </div>


                {/* =================================================
                    MATCH SCORE
                ================================================= */}
                <div
                  className="rounded-2xl p-5 mb-4"
                  style={{
                    background: 'rgba(64,61,136,0.06)',
                    border: '1px solid rgba(64,61,136,0.10)',
                  }}
                >

                  <div className="flex items-center justify-between mb-3">

                    <div>
                      <p className="text-sm text-muted">
                        Career match
                      </p>

                      <p
                        className="text-3xl font-heading font-bold mt-1"
                        style={{ color: 'var(--text)' }}
                      >
                        78%
                      </p>
                    </div>

                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'conic-gradient(var(--primary) 78%, rgba(64,61,136,0.10) 0)',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: 'var(--surface)',
                          color: 'var(--primary)',
                        }}
                      >
                        78
                      </div>
                    </div>

                  </div>

                  <div className="h-2 rounded-full overflow-hidden bg-themed">

                    <div
                      className="h-full rounded-full"
                      style={{
                        width: '78%',
                        background: 'var(--primary)',
                      }}
                    />

                  </div>

                </div>


                {/* =================================================
                    SNAPSHOT CARDS
                ================================================= */}
                <div className="grid grid-cols-2 gap-3 mb-4">

                  {[
                    {
                      label: 'Known Skills',
                      value: '18',
                      icon: CheckCircle2,
                    },
                    {
                      label: 'Skill Gaps',
                      value: '5',
                      icon: Target,
                    },
                    {
                      label: 'Roadmap',
                      value: '64%',
                      icon: GraduationCap,
                    },
                    {
                      label: 'Opportunities',
                      value: '124+',
                      icon: Briefcase,
                    },
                  ].map((item) => (

                    <div
                      key={item.label}
                      className="rounded-xl p-4 border"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >

                      <div className="flex items-center justify-between mb-2">

                        <span className="text-xs text-muted">
                          {item.label}
                        </span>

                        <item.icon
                          size={15}
                          style={{ color: 'var(--primary)' }}
                        />

                      </div>

                      <p
                        className="text-xl font-heading font-bold"
                        style={{ color: 'var(--text)' }}
                      >
                        {item.value}
                      </p>

                    </div>

                  ))}

                </div>


                {/* =================================================
                    ROADMAP PREVIEW
                ================================================= */}
                <div
                  className="rounded-xl p-4 border"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >

                  <div className="flex items-center justify-between mb-3">

                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      Current roadmap
                    </span>

                    <span className="text-xs text-muted">
                      5 skills
                    </span>

                  </div>

                  <div className="space-y-3">

                    {[
                      ['SQL', true],
                      ['Statistics', true],
                      ['Power BI', false],
                    ].map(([skill, done]) => (

                      <div
                        key={skill}
                        className="flex items-center gap-3 text-sm"
                      >

                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            background: done
                              ? 'var(--primary)'
                              : 'rgba(64,61,136,0.08)',
                            color: done
                              ? 'white'
                              : 'var(--primary)',
                          }}
                        >
                          {done && <CheckCircle2 size={13} />}
                        </div>

                        <span
                          style={{
                            color: done
                              ? 'var(--text)'
                              : 'var(--text-muted)',
                          }}
                        >
                          {skill}
                        </span>

                        {!done && (
                          <span className="ml-auto text-xs text-muted">
                            Next
                          </span>
                        )}

                      </div>

                    ))}

                  </div>

                </div>

                <p className="text-[10px] text-muted mt-3 text-right">
                  Example interface preview
                </p>

              </div>


              {/* =================================================
                  FLOATING SKILL GAP CARD
              ================================================= */}
              <div
                className="absolute -left-8 top-20 hidden xl:flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-lg"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.10)',
                    color: 'var(--primary)',
                  }}
                >
                  <Target size={16} />
                </div>

                <div>

                  <p className="text-xs text-muted">
                    Skill gap
                  </p>

                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    Clearly identified
                  </p>

                </div>

              </div>


              {/* =================================================
                  FLOATING ROADMAP CARD
              ================================================= */}
              <div
                className="absolute -right-7 bottom-14 hidden xl:flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-lg"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.10)',
                    color: 'var(--primary)',
                  }}
                >
                  <Rocket size={16} />
                </div>

                <div>

                  <p className="text-xs text-muted">
                    Next step
                  </p>

                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    Keep learning
                  </p>

                </div>

              </div>

            </div>

          </div>
        </div>
      </section>


      {/* =========================================================
          CAREER INTELLIGENCE FLOW
      ========================================================= */}
      <section className="py-20 sm:py-24 bg-surface">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-14">

            <span className="badge-primary mb-4 inline-flex">
              <Zap size={14} />
              From profile to possibility
            </span>

            <h2 className="section-title mb-4">
              One clear path from where you are
              <br className="hidden sm:block" />
              to where you want to go.
            </h2>

            <p className="text-muted">
              CareerCraft turns your current skills into an actionable career
              plan — without overwhelming you with unnecessary steps.
            </p>

          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {[
              {
                icon: FileText,
                number: '01',
                title: 'Your Profile',
                desc: 'Upload your resume or enter your skills.',
              },
              {
                icon: Brain,
                number: '02',
                title: 'Your Skills',
                desc: 'Skills are identified and matched to the database.',
              },
              {
                icon: Target,
                number: '03',
                title: 'Your Gaps',
                desc: 'See what your target career requires.',
              },
              {
                icon: GraduationCap,
                number: '04',
                title: 'Your Roadmap',
                desc: 'Focus your learning on missing skills.',
              },
              {
                icon: Briefcase,
                number: '05',
                title: 'Your Opportunities',
                desc: 'Explore jobs and market intelligence.',
              },
            ].map((step, index) => (

              <div
                key={step.number}
                className="relative group"
              >

                <div className="card p-5 h-full transition-all duration-300 group-hover:-translate-y-1">

                  <div className="flex items-center justify-between mb-5">

                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'rgba(64,61,136,0.10)',
                        color: 'var(--primary)',
                      }}
                    >
                      <step.icon size={21} />
                    </div>

                    <span className="text-xs font-semibold text-muted">
                      {step.number}
                    </span>

                  </div>

                  <h3
                    className="font-semibold mb-2"
                    style={{ color: 'var(--text)' }}
                  >
                    {step.title}
                  </h3>

                  <p className="text-sm text-muted leading-relaxed">
                    {step.desc}
                  </p>

                </div>

                {index < 4 && (
                  <ChevronRight
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10"
                    size={18}
                    style={{
                      color: 'var(--primary)',
                      opacity: 0.45,
                    }}
                  />
                )}

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* =========================================================
          SKILL GAP SECTION
      ========================================================= */}
      <section className="py-20 sm:py-24">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Visual */}
            <div
              className="rounded-3xl border p-6 sm:p-8"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >

              <div className="flex items-center justify-between mb-7">

                <div>

                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Skill analysis
                  </p>

                  <h3
                    className="text-2xl font-heading font-semibold mt-1"
                    style={{ color: 'var(--text)' }}
                  >
                    Data Analyst
                  </h3>

                </div>

                <Target
                  size={24}
                  style={{ color: 'var(--primary)' }}
                />

              </div>


              <div className="space-y-5">

                {[
                  {
                    name: 'Python',
                    value: 92,
                    state: 'Strong',
                  },
                  {
                    name: 'Excel',
                    value: 88,
                    state: 'Strong',
                  },
                  {
                    name: 'SQL',
                    value: 68,
                    state: 'Developing',
                  },
                  {
                    name: 'Power BI',
                    value: 42,
                    state: 'Gap',
                  },
                  {
                    name: 'Statistics',
                    value: 35,
                    state: 'Gap',
                  },
                ].map((skill) => (

                  <div key={skill.name}>

                    <div className="flex items-center justify-between mb-2">

                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text)' }}
                      >
                        {skill.name}
                      </span>

                      <span className="text-xs text-muted">
                        {skill.state}
                      </span>

                    </div>

                    <div className="h-2.5 rounded-full bg-themed overflow-hidden">

                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${skill.value}%`,
                          background: 'var(--primary)',
                          opacity:
                            skill.state === 'Gap'
                              ? 0.45
                              : 0.85,
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>


              <div
                className="mt-7 rounded-xl p-4 flex items-center gap-3"
                style={{
                  background: 'rgba(64,61,136,0.06)',
                }}
              >

                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.10)',
                    color: 'var(--primary)',
                  }}
                >
                  <TrendingUp size={17} />
                </div>

                <div>

                  <p className="text-xs text-muted">
                    Example career match
                  </p>

                  <p
                    className="font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    78% — 5 skills to develop
                  </p>

                </div>

              </div>

            </div>


            {/* Text */}
            <div>

              <span className="badge-primary mb-4 inline-flex">
                <Target size={14} />
                Know your gap
              </span>

              <h2 className="section-title mb-5">
                Stop guessing what to learn next.
              </h2>

              <p className="text-muted text-lg leading-relaxed mb-7">
                CareerCraft compares your existing skills with the
                requirements of your selected career and shows the difference
                clearly.
              </p>

              <div className="space-y-4">

                {[
                  'Identify skills already present in your profile',
                  'See the exact skills missing for your target career',
                  'Understand your current match percentage',
                  'Explore alternative career paths based on your skills',
                ].map((item) => (

                  <div
                    key={item}
                    className="flex items-start gap-3"
                  >

                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0"
                      style={{ color: 'var(--primary)' }}
                    />

                    <span
                      className="text-sm sm:text-base"
                      style={{ color: 'var(--text)' }}
                    >
                      {item}
                    </span>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =========================================================
          ROADMAP SECTION
      ========================================================= */}
      <section className="py-20 sm:py-24 bg-surface">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-14 items-center">

            <div className="order-2 lg:order-1">

              <span className="badge-primary mb-4 inline-flex">
                <GraduationCap size={14} />
                Learn with purpose
              </span>

              <h2 className="section-title mb-5">
                Your roadmap should focus on the gaps — not repeat what you
                already know.
              </h2>

              <p className="text-muted text-lg leading-relaxed mb-7">
                CareerCraft generates a learning roadmap from your missing
                skills. Complete chapters, track your progress, and continue
                from where you left off.
              </p>

              <div className="flex flex-wrap gap-3">

                <div className="badge-primary">
                  <CheckCircle2 size={14} />
                  Persistent progress
                </div>

                <div className="badge-primary">
                  <Trophy size={14} />
                  Achievements
                </div>

                <div className="badge-primary">
                  <TrendingUp size={14} />
                  Learning streaks
                </div>

              </div>

            </div>


            {/* Roadmap visual */}
            <div
              className="order-1 lg:order-2 rounded-3xl border p-6 sm:p-8"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >

              <div className="flex items-center justify-between mb-7">

                <div>

                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Personalized roadmap
                  </p>

                  <h3
                    className="text-xl font-heading font-semibold mt-1"
                    style={{ color: 'var(--text)' }}
                  >
                    Data Analyst Path
                  </h3>

                </div>

                <div className="text-right">

                  <p
                    className="text-2xl font-heading font-bold"
                    style={{ color: 'var(--primary)' }}
                  >
                    64%
                  </p>

                  <p className="text-xs text-muted">
                    complete
                  </p>

                </div>

              </div>


              <div className="space-y-4">

                {[
                  {
                    title: 'SQL Fundamentals',
                    desc: 'Queries, joins & aggregation',
                    done: true,
                  },
                  {
                    title: 'Data Visualization',
                    desc: 'Charts, dashboards & storytelling',
                    done: true,
                  },
                  {
                    title: 'Power BI',
                    desc: 'Reports, models & dashboards',
                    done: false,
                  },
                  {
                    title: 'Statistics',
                    desc: 'Descriptive & inferential analysis',
                    done: false,
                  },
                ].map((item, index) => (

                  <div
                    key={item.title}
                    className="flex gap-4 items-start"
                  >

                    <div className="flex flex-col items-center">

                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: item.done
                            ? 'var(--primary)'
                            : 'rgba(64,61,136,0.08)',
                          color: item.done
                            ? 'white'
                            : 'var(--primary)',
                        }}
                      >

                        {item.done ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <span className="text-xs font-bold">
                            {index + 1}
                          </span>
                        )}

                      </div>

                      {index < 3 && (
                        <div
                          className="w-px h-7 mt-1"
                          style={{
                            background: 'var(--border)',
                          }}
                        />
                      )}

                    </div>


                    <div className="pt-1">

                      <p
                        className="font-semibold text-sm"
                        style={{ color: 'var(--text)' }}
                      >
                        {item.title}
                      </p>

                      <p className="text-xs text-muted mt-1">
                        {item.desc}
                      </p>

                    </div>

                  </div>

                ))}

              </div>


              <div className="mt-7">

                <div className="flex justify-between text-xs text-muted mb-2">
                  <span>Roadmap progress</span>
                  <span>64%</span>
                </div>

                <div className="h-2 rounded-full bg-themed overflow-hidden">

                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '64%',
                      background: 'var(--primary)',
                    }}
                  />

                </div>

              </div>

              <p className="text-[10px] text-muted mt-3 text-right">
                Example roadmap preview
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =========================================================
          OPPORTUNITIES / MARKET
      ========================================================= */}
      <section className="py-20 sm:py-24">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-14">

            <span className="badge-primary mb-4 inline-flex">
              <LineChart size={14} />
              Beyond the roadmap
            </span>

            <h2 className="section-title mb-4">
              Understand the market.
              <br />
              Find the opportunity.
            </h2>

            <p className="text-muted">
              Explore current IT job listings and market insights based on
              CareerCraft's collected job data.
            </p>

          </div>


          <div className="grid md:grid-cols-3 gap-5">

            {/* =====================================================
                JOBS
            ===================================================== */}
            <Link
              to="/jobs"
              className="card p-6 group hover:-translate-y-1 transition-all"
            >

              <div className="flex items-start justify-between mb-8">

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.10)',
                    color: 'var(--primary)',
                  }}
                >
                  <Briefcase size={23} />
                </div>

                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--primary)' }}
                />

              </div>

              <h3
                className="text-xl font-heading font-semibold mb-2"
                style={{ color: 'var(--text)' }}
              >
                Job Opportunities
              </h3>

              <p className="text-sm text-muted leading-relaxed mb-5">
                Browse current IT and engineering job listings and explore
                opportunities relevant to your career interests.
              </p>

              <div className="flex items-center gap-2 text-xs text-muted">
                <MapPin size={14} />
                India-focused listings
              </div>

            </Link>


            {/* =====================================================
                MARKET
            ===================================================== */}
            <Link
              to="/market"
              className="card p-6 group hover:-translate-y-1 transition-all"
            >

              <div className="flex items-start justify-between mb-8">

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.10)',
                    color: 'var(--primary)',
                  }}
                >
                  <BarChart3 size={23} />
                </div>

                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--primary)' }}
                />

              </div>

              <h3
                className="text-xl font-heading font-semibold mb-2"
                style={{ color: 'var(--text)' }}
              >
                Market Intelligence
              </h3>

              <p className="text-sm text-muted leading-relaxed mb-5">
                Explore roles, skills, locations and companies appearing in
                CareerCraft's collected job listings.
              </p>

              <div className="flex items-center gap-2 text-xs text-muted">
                <TrendingUp size={14} />
                Live job-data insights
              </div>

            </Link>


            {/* =====================================================
                RESUME BUILDER
            ===================================================== */}
            <Link
              to="/resume-builder"
              className="card p-6 group hover:-translate-y-1 transition-all"
            >

              <div className="flex items-start justify-between mb-8">

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.10)',
                    color: 'var(--primary)',
                  }}
                >
                  <FileText size={23} />
                </div>

                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--primary)' }}
                />

              </div>

              <h3
                className="text-xl font-heading font-semibold mb-2"
                style={{ color: 'var(--text)' }}
              >
                ATS Resume Builder
              </h3>

              <p className="text-sm text-muted leading-relaxed mb-5">
                Create a structured, ATS-friendly resume designed to present
                your skills and experience clearly.
              </p>

              <div className="flex items-center gap-2 text-xs text-muted">
                <FileText size={14} />
                Available to everyone
              </div>

            </Link>

          </div>

        </div>

      </section>


      {/* =========================================================
          FOR EVERYONE
      ========================================================= */}
      <section className="py-20 sm:py-24 bg-surface">

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <span className="badge-primary mb-4 inline-flex">
            <Sparkles size={14} />
            Built around your journey
          </span>

          <h2 className="section-title mb-5">
            Start where you are.
            <br />
            Build from there.
          </h2>

          <p className="text-muted text-lg max-w-2xl mx-auto mb-10">
            Whether you're exploring your first career, switching fields, or
            simply trying to understand what to learn next, CareerCraft gives
            you a structured starting point.
          </p>


          <div className="grid sm:grid-cols-3 gap-4 text-left">

            {[
              {
                icon: Compass,
                title: 'Explore',
                desc: 'Understand careers and discover where your skills can take you.',
              },
              {
                icon: Target,
                title: 'Analyze',
                desc: 'Measure your current skills against your target career.',
              },
              {
                icon: Rocket,
                title: 'Grow',
                desc: 'Follow a focused roadmap and track your progress.',
              },
            ].map((item) => (

              <div
                key={item.title}
                className="rounded-2xl border p-5"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >

                <item.icon
                  size={22}
                  className="mb-4"
                  style={{ color: 'var(--primary)' }}
                />

                <h3
                  className="font-semibold mb-2"
                  style={{ color: 'var(--text)' }}
                >
                  {item.title}
                </h3>

                <p className="text-sm text-muted leading-relaxed">
                  {item.desc}
                </p>

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* =========================================================
          FINAL CTA
      ========================================================= */}
      <section className="py-24 relative overflow-hidden">

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, var(--primary) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: 'rgba(64,61,136,0.10)',
              color: 'var(--primary)',
            }}
          >
            <Rocket size={27} />
          </div>

          <h2 className="section-title mb-4">
            Your next career move starts with clarity.
          </h2>

          <p className="text-muted max-w-2xl mx-auto mb-9">
            Discover your skills, understand your gaps, build your roadmap,
            and move toward your career goals with CareerCraft.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">

            <Link
              to={startPath}
              className="btn-primary text-base px-7 py-3.5"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Get Started'}
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/resume-builder"
              className="btn-outline text-base px-7 py-3.5"
            >
              Build Your Resume
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}