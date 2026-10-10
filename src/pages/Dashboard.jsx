import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  FileText,
  Flame,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BookOpen,
  Target,
  Info,
  Sparkles,
  MapPin,
  ChevronRight,
  Rocket,
  Layers,
  Lock,
} from 'lucide-react';

import {
  analysisAPI,
  roadmapAPI,
  achievementAPI,
  jobAPI,
  marketAPI,
} from '@/services/api';

import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

/* ============================================================
   INFORMATION BUTTON
============================================================ */

function InfoButton({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-bg"
        style={{
          color: 'var(--muted)',
          border: '1px solid var(--border)',
        }}
        aria-label={`Information about ${title}`}
        aria-expanded={open}
      >
        <Info size={15} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />

          <div
            className="absolute right-0 top-9 z-40 w-72 rounded-xl p-4 shadow-xl border"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  {title}
                </p>

                <p className="text-xs text-muted mt-2 leading-relaxed">
                  {children}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-themed text-lg leading-none"
                aria-label="Close information"
              >
                ×
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  icon: Icon,
  title,
  description,
  infoTitle,
  infoText,
  action,
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(64,61,136,0.10)',
          }}
        >
          <Icon
            size={19}
            style={{ color: 'var(--primary)' }}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg font-heading font-semibold"
              style={{ color: 'var(--text)' }}
            >
              {title}
            </h2>

            {infoTitle && (
              <InfoButton title={infoTitle}>
                {infoText}
              </InfoButton>
            )}
          </div>

          {description && (
            <p className="text-sm text-muted mt-1">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */
function CareerSkillNode({ skill, onClick, locked = false }) {
  const chapters = skill?.chapters || [];
  const totalChapters = chapters.length;
  const completedChapters = chapters.filter(
    (chapter) => chapter.completed
  ).length;

  const percentage =
    totalChapters > 0
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0;

  const isComplete = totalChapters > 0 && percentage === 100;
  const isStarted = percentage > 0 && percentage < 100;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={`relative w-full text-left group ${
        locked ? 'cursor-not-allowed' : ''
      }`}
      aria-disabled={locked}
    >
      <div
        className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300"
        style={{
          background: locked
            ? 'rgba(243,232,223,0.38)'
            : 'var(--surface)',
          border: `1px solid ${
            isComplete
              ? 'rgba(64,61,136,0.45)'
              : locked
              ? 'rgba(64,61,136,0.10)'
              : 'var(--border)'
          }`,
          opacity: locked ? 0.68 : 1,
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
          style={{
            height: `${percentage}%`,
            background:
              'linear-gradient(to top, rgba(64,61,136,0.13), rgba(64,61,136,0.035))',
            pointerEvents: 'none',
          }}
        />

        {!locked && percentage > 0 && percentage < 100 && (
          <div
            className="absolute left-0 right-0 h-px transition-all duration-1000"
            style={{
              bottom: `${percentage}%`,
              background: 'rgba(64,61,136,0.35)',
            }}
          />
        )}

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: locked
                    ? 'rgba(64,61,136,0.06)'
                    : isComplete
                    ? 'rgba(64,61,136,0.14)'
                    : 'rgba(64,61,136,0.08)',
                }}
              >
                {locked ? (
                  <Lock size={19} style={{ color: 'var(--muted)' }} />
                ) : isComplete ? (
                  <CheckCircle2
                    size={22}
                    style={{ color: 'var(--primary)' }}
                  />
                ) : (
                  <Layers
                    size={21}
                    style={{ color: 'var(--primary)' }}
                  />
                )}
              </div>

              <div className="min-w-0">
                <p
                  className="font-semibold truncate"
                  style={{
                    color: locked ? 'var(--muted)' : 'var(--text)',
                  }}
                >
                  {skill.name}
                </p>

                <p className="text-xs text-muted mt-1">
                  {locked
                    ? 'Complete the previous skill to unlock'
                    : `${completedChapters} of ${totalChapters} chapters completed`}
                </p>
              </div>
            </div>

            {locked ? (
              <Lock
                size={16}
                className="shrink-0"
                style={{ color: 'var(--muted)' }}
              />
            ) : (
              <span
                className="text-sm font-bold shrink-0"
                style={{ color: 'var(--primary)' }}
              >
                {percentage}%
              </span>
            )}
          </div>

          <div
            className="h-1.5 rounded-full overflow-hidden mt-5"
            style={{ background: 'rgba(64,61,136,0.10)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${percentage}%`,
                background: locked
                  ? 'rgba(64,61,136,0.18)'
                  : 'var(--primary)',
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted">
              {locked
                ? 'Locked'
                : isComplete
                ? 'Skill completed'
                : isStarted
                ? 'In progress'
                : 'Ready to start'}
            </span>

            {!locked && (
              <span
                className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                Continue →
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const careerId = user?.activeCareerId;

  /* ============================================================
     FETCH DASHBOARD DATA
  ============================================================ */

  const fetchDashboard = useCallback(async () => {
    if (!careerId) {
      navigate('/onboarding/career');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        analysisRes,
        roadmapRes,
        achieveRes,
        jobsRes,
        marketRes,
      ] = await Promise.allSettled([
        analysisAPI.getResult(careerId),
        roadmapAPI.get(careerId),
        achievementAPI.list(),
        jobAPI.list({ limit: 3 }),
        marketAPI.getStatus(),
      ]);

      if (analysisRes.status === 'fulfilled') {
        setAnalysis(analysisRes.value.data);
      }

      if (roadmapRes.status === 'fulfilled') {
        setRoadmap(roadmapRes.value.data);
      }

      if (achieveRes.status === 'fulfilled') {
        setAchievements(
          achieveRes.value.data.achievements || []
        );
      }

      if (jobsRes.status === 'fulfilled') {
        setJobs(
          jobsRes.value.data.jobs || []
        );
      }

      if (marketRes.status === 'fulfilled') {
        setMarketStatus(marketRes.value.data);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [careerId, navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ============================================================
     LOADING / ERROR
  ============================================================ */

  if (loading) {
    return <FullPageSpinner label="Loading dashboard..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchDashboard}
      />
    );
  }

  /* ============================================================
     DATA
  ============================================================ */

  const knownSkills = analysis?.knownSkills || [];
  const missingSkills = analysis?.missingSkills || [];

  const matchPercent = Math.min(
    100,
    Math.max(0, Number(analysis?.matchPercentage || 0))
  );

  const progress = Math.min(
    100,
    Math.max(0, Number(roadmap?.progress || 0))
  );

  const completedChapters =
    roadmap?.completedChapters || 0;

  const totalChapters =
    roadmap?.totalChapters || 0;

  const unlockedAchievements =
    achievements.filter((a) => a.unlocked);

  const careerName =
    analysis?.careerName ||
    user?.activeCareerName ||
    'Your selected career';

  const streak = user?.streak || 0;

  /* ============================================================
     CHART DATA
  ============================================================ */

  const skillData = [
    {
      name: 'Known',
      value: knownSkills.length,
      color: '#403D88',
    },
    {
      name: 'Skills to Build',
      value: missingSkills.length,
      color: '#B98278',
    },
  ].filter((item) => item.value > 0);

  const progressData = [
    {
      name: 'Completed',
      value: completedChapters,
      color: '#403D88',
    },
    {
      name: 'Remaining',
      value: Math.max(
        0,
        totalChapters - completedChapters
      ),
      color: '#E8D1C5',
    },
  ].filter((item) => item.value > 0);

  /* ============================================================
     NEXT ACTION
  ============================================================ */

  let nextAction = {
    title: 'Explore your roadmap',
    description:
      'Start building the skills needed for your selected career.',
    button: 'View Roadmap',
    link: '/roadmap',
    icon: GraduationCap,
  };

  if (missingSkills.length > 0 && progress < 100) {
    nextAction = {
      title: `Build your ${careerName} skills`,
      description: `You currently have ${missingSkills.length} skill${
        missingSkills.length === 1 ? '' : 's'
      } identified as missing for your selected career.`,
      button: 'Continue Roadmap',
      link: '/roadmap',
      icon: Target,
    };
  } else if (progress >= 100) {
    nextAction = {
      title: 'Your roadmap is complete',
      description:
        'Explore jobs, market intelligence, or strengthen your resume.',
      button: 'Explore Jobs',
      link: '/jobs',
      icon: Rocket,
    };
  }

  const NextIcon = nextAction.icon;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="animate-fade-in space-y-7">

      {/* ======================================================
          HERO
      ====================================================== */}

      <section
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background:
            'linear-gradient(135deg, rgba(64,61,136,0.12), rgba(243,232,223,0.55))',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="absolute -right-16 -top-20 w-52 h-52 rounded-full opacity-30"
          style={{
            background: 'var(--primary)',
            filter: 'blur(70px)',
          }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-7">

          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'rgba(64,61,136,0.10)',
                  color: 'var(--primary)',
                }}
              >
                <Sparkles size={13} />
                CAREER INTELLIGENCE
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-heading font-bold tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              Welcome back,{' '}
              {user?.name?.split(' ')[0] || 'there'}!
            </h1>

            <p className="text-muted mt-3 max-w-xl leading-relaxed">
              Here's a snapshot of your progress toward becoming a{' '}
              <strong style={{ color: 'var(--text)' }}>
                {careerName}
              </strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-5">

              <button
                onClick={() =>
                  navigate('/onboarding/career')
                }
                className="btn-outline"
              >
                <RefreshCw size={16} />
                Switch Career
              </button>

              <Link
                to="/roadmap"
                className="btn-primary"
              >
                Continue Learning
                <ArrowRight size={16} />
              </Link>

            </div>
          </div>

          {/* Match circle */}

          <div className="flex items-center gap-5">

            <div className="relative w-32 h-32 shrink-0">

              <svg
                viewBox="0 0 120 120"
                className="w-full h-full -rotate-90"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="10"
                />

                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${matchPercent * 3.016} 301.6`}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-2xl font-bold"
                  style={{ color: 'var(--text)' }}
                >
                  {matchPercent}%
                </span>

                <span className="text-[11px] text-muted">
                  Career Match
                </span>
              </div>

            </div>

            <div className="hidden sm:block">

              <div className="flex items-center gap-2 mb-2">
                <Flame
                  size={18}
                  style={{ color: '#D97706' }}
                />

                <span
                  className="font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  {streak} day streak
                </span>
              </div>

              <p className="text-xs text-muted max-w-32">
                Keep learning consistently to build your progress.
              </p>

            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          STATS
      ====================================================== */}

      <section>

        <div className="flex items-center justify-between mb-4">

          <div>
            <h2
              className="text-lg font-heading font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Your Progress
            </h2>

            <p className="text-sm text-muted mt-1">
              A quick view of your current career journey.
            </p>
          </div>

          <InfoButton title="Your Progress">
            These figures summarize your current skill analysis,
            roadmap completion, and unlocked achievements for
            your selected career.
          </InfoButton>

        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {[
            {
              icon: CheckCircle2,
              label: 'Known Skills',
              value: knownSkills.length,
              color: '#403D88',
              text: 'Skills already identified in your profile.',
            },
            {
              icon: XCircle,
              label: 'Skills to Build',
              value: missingSkills.length,
              color: '#B98278',
              text: 'Skills identified as missing for your career.',
            },
            {
              icon: BookOpen,
              label: 'Chapters Done',
              value: `${completedChapters}/${totalChapters}`,
              color: 'var(--primary)',
              text: 'Completed chapters in your learning roadmap.',
            },
            {
              icon: Award,
              label: 'Achievements',
              value: unlockedAchievements.length,
              color: 'var(--secondary)',
              text: 'Achievements you have unlocked.',
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="card p-5 transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${stat.color}15`,
                    }}
                  >
                    <Icon
                      size={19}
                      style={{ color: stat.color }}
                    />
                  </div>

                  <InfoButton title={stat.label}>
                    {stat.text}
                  </InfoButton>

                </div>

                <p
                  className="text-2xl font-bold mt-4"
                  style={{ color: 'var(--text)' }}
                >
                  {stat.value}
                </p>

                <p className="text-xs text-muted mt-1">
                  {stat.label}
                </p>
              </div>
            );
          })}

        </div>
      </section>

      {/* ======================================================
          NEXT ACTION
      ====================================================== */}

      <section
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

          <div className="flex items-start gap-4">

            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(64,61,136,0.10)',
              }}
            >
              <NextIcon
                size={23}
                style={{ color: 'var(--primary)' }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--primary)' }}
                >
                  Recommended Next Step
                </span>

                <InfoButton title="Recommended Next Step">
                  This suggestion is based on the current skill
                  analysis and roadmap progress available for your
                  selected career.
                </InfoButton>
              </div>

              <h2
                className="text-lg font-heading font-semibold mt-1"
                style={{ color: 'var(--text)' }}
              >
                {nextAction.title}
              </h2>

              <p className="text-sm text-muted mt-1 max-w-xl">
                {nextAction.description}
              </p>
            </div>

          </div>

          <Link
            to={nextAction.link}
            className="btn-primary whitespace-nowrap"
          >
            {nextAction.button}
            <ArrowRight size={16} />
          </Link>

        </div>

      </section>
            {/* CAREER JOURNEY */}
      <section className="mb-8">
        <SectionHeader
          icon={Target}
          title="Your Career Journey"
          description={`Build the skills required for your ${careerName || 'career'} path.`}
          infoTitle="About Your Career Journey"
          infoText="This journey shows the skills mapped to your selected career. Each skill fills as you complete its roadmap chapters. Skills unlock in order: finish all chapters in one skill before the next skill becomes available."
          action={
            <Link
              to="/roadmap"
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: 'var(--primary)' }}
            >
              View Roadmap
              <ArrowRight size={15} />
            </Link>
          }
        />

        {roadmap?.skills?.length > 0 ? (
          <div
            className="rounded-3xl p-6 md:p-8"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >

            {/* Career destination */}
            <div className="flex justify-center mb-8">
              <div
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
                style={{
                  background: 'rgba(64,61,136,0.08)',
                  border: '1px solid rgba(64,61,136,0.18)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(64,61,136,0.14)',
                  }}
                >
                  <Target
                    size={20}
                    style={{ color: 'var(--primary)' }}
                  />
                </div>

                <div>
                  <p className="text-xs text-muted">
                    Your selected career
                  </p>

                  <p
                    className="font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    {careerName || 'Career Path'}
                  </p>
                </div>
              </div>
            </div>

            {/* Journey flow */}
            <div className="relative">

              {/* Central vertical line */}
              <div
                className="absolute left-1/2 top-0 bottom-0 hidden md:block"
                style={{
                  width: '2px',
                  background:
                    'linear-gradient(to bottom, rgba(64,61,136,0.15), rgba(64,61,136,0.45), rgba(64,61,136,0.15))',
                  transform: 'translateX(-50%)',
                }}
              />

              <div className="relative space-y-6">

                {roadmap.skills.map((skill, index) => {
                  const previousSkill = roadmap.skills[index - 1];
                  const previousChapters = previousSkill?.chapters || [];
                  const previousTotalChapters = previousChapters.length;
                  const previousCompletedChapters =
                    previousChapters.filter(
                      (chapter) => chapter.completed
                    ).length;

                  const previousPercentage =
                    previousTotalChapters > 0
                      ? Math.round(
                          (previousCompletedChapters /
                            previousTotalChapters) *
                            100
                        )
                      : 0;

                  // The first skill is always unlocked.
                  // Each later skill unlocks only after the immediately
                  // previous skill reaches 100%.
                  const locked =
                    index > 0 && previousPercentage < 100;

                  const isLeft = index % 2 === 0;

                  return (
                    <div
                      key={skill._id || skill.id || index}
                      className="relative flex items-center justify-center"
                    >
                      <div
                        className="hidden md:flex absolute left-1/2 top-1/2 w-10 h-10 rounded-full items-center justify-center font-semibold text-sm z-20"
                        style={{
                          transform: 'translate(-50%, -50%)',
                          background: locked
                            ? 'var(--bg)'
                            : 'var(--surface)',
                          border: `2px solid ${
                            locked
                              ? 'rgba(64,61,136,0.18)'
                              : 'var(--primary)'
                          }`,
                          color: locked
                            ? 'var(--muted)'
                            : 'var(--primary)',
                          boxShadow: locked
                            ? 'none'
                            : '0 4px 14px rgba(64,61,136,0.16)',
                        }}
                      >
                        {locked ? <Lock size={15} /> : index + 1}
                      </div>

                      <div
                        className="hidden md:block absolute top-1/2 h-px"
                        style={{
                          width: '32px',
                          background: locked
                            ? 'rgba(64,61,136,0.12)'
                            : 'rgba(64,61,136,0.25)',
                          left: isLeft
                            ? 'calc(50% - 32px)'
                            : '50%',
                        }}
                      />

                      <div
                        className={`w-full md:w-[calc(50%-48px)] ${
                          isLeft ? 'md:mr-auto' : 'md:ml-auto'
                        }`}
                      >
                        <CareerSkillNode
                          skill={skill}
                          locked={locked}
                          onClick={() =>
                            navigate('/roadmap', {
                              state: {
                                focusSkillId: skill._id,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* End destination */}
            <div className="flex justify-center mt-8">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: 'rgba(64,61,136,0.08)',
                  color: 'var(--primary)',
                }}
              >
                <Rocket size={16} />
                Keep progressing toward your career goal
              </div>
            </div>

          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <Layers
              size={28}
              className="mx-auto mb-3"
              style={{ color: 'var(--primary)' }}
            />

            <p
              className="font-medium"
              style={{ color: 'var(--text)' }}
            >
              Your career journey is being prepared
            </p>

            <p className="text-sm text-muted mt-1">
              Your mapped skills will appear here once your roadmap is available.
            </p>
          </div>
        )}
      </section>

      {/* ======================================================
          CAREER PROGRESS
      ====================================================== */}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Skills */}

        <div className="card p-6">

          <SectionHeader
            icon={BarChart3}
            title="Skill Distribution"
            description="Your current skills compared with identified gaps."
            infoTitle="About Skill Distribution"
            infoText="This chart compares the skills currently identified in your profile with the skills that are still missing for your selected career."
          />

          {skillData.length > 0 ? (

            <div className="h-[250px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>

                  <Pie
                    data={skillData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {skillData.map((entry, index) => (
                      <Cell
                        key={`skill-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={30}
                  />

                </PieChart>
              </ResponsiveContainer>

            </div>

          ) : (

            <div className="py-12 text-center">

              <BarChart3
                size={30}
                className="mx-auto mb-3 text-muted"
              />

              <p className="text-sm text-muted">
                No skill data available yet.
              </p>

            </div>

          )}

        </div>

        {/* Roadmap */}

        <div className="card p-6">

          <SectionHeader
            icon={TrendingUp}
            title="Learning Progress"
            description="Your progress through the personalized roadmap."
            infoTitle="About Learning Progress"
            infoText="This represents the chapters you have completed compared with the total chapters available in your current learning roadmap."
          />

          {progressData.length > 0 ? (

            <div className="h-[250px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>

                  <Pie
                    data={progressData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {progressData.map((entry, index) => (
                      <Cell
                        key={`progress-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={30}
                  />

                </PieChart>
              </ResponsiveContainer>

            </div>

          ) : (

            <div className="py-12 text-center">

              <TrendingUp
                size={30}
                className="mx-auto mb-3 text-muted"
              />

              <p className="text-sm text-muted">
                No roadmap progress available yet.
              </p>

            </div>

          )}

          <div className="mt-2">

            <div className="flex items-center justify-between text-xs mb-2">

              <span className="text-muted">
                Overall roadmap progress
              </span>

              <span
                className="font-semibold"
                style={{ color: 'var(--primary)' }}
              >
                {progress}%
              </span>

            </div>

            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: 'var(--primary)',
                }}
              />
            </div>

          </div>

        </div>

      </section>

      {/* ======================================================
          QUICK ACTIONS
      ====================================================== */}

      <section>

        <SectionHeader
          icon={Rocket}
          title="Quick Actions"
          description="Jump directly to the tools you use most."
          infoTitle="About Quick Actions"
          infoText="These shortcuts provide quick access to the main CareerCraft features connected to your career journey."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {[
            {
              to: '/roadmap',
              icon: GraduationCap,
              title: 'My Roadmap',
              description: 'Continue learning',
              color: 'var(--primary)',
            },
            {
              to: '/achievements',
              icon: Award,
              title: 'Achievements',
              description: `${unlockedAchievements.length} unlocked`,
              color: 'var(--secondary)',
            },
            {
              to: '/resume-builder',
              icon: FileText,
              title: 'Resume Builder',
              description: 'Build ATS-friendly resume',
              color: 'var(--accent)',
            },
            {
              to: '/jobs',
              icon: Briefcase,
              title: 'Find Jobs',
              description: 'Explore opportunities',
              color: 'var(--primary)',
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className="card p-5 group transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5"
              >

                <div className="flex items-center gap-3">

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${item.color}15`,
                    }}
                  >
                    <Icon
                      size={21}
                      style={{ color: item.color }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">

                    <p
                      className="font-medium truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {item.title}
                    </p>

                    <p className="text-xs text-muted mt-1">
                      {item.description}
                    </p>

                  </div>

                  <ChevronRight
                    size={17}
                    className="text-muted group-hover:translate-x-1 transition-transform"
                  />

                </div>

              </Link>
            );
          })}

        </div>

      </section>

      {/* ======================================================
          MARKET INTELLIGENCE
      ====================================================== */}

      <section className="card p-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

          <div className="flex items-start gap-4">

            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(64,61,136,0.10)',
              }}
            >
              <BarChart3
                size={22}
                style={{ color: 'var(--primary)' }}
              />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2
                  className="text-lg font-heading font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  Market Intelligence
                </h2>

                <InfoButton title="About Market Intelligence">
                  This section gives you a quick view of current
                  market information available through CareerCraft's
                  collected job listings.
                </InfoButton>

              </div>

              <p className="text-sm text-muted mt-1">

                {marketStatus?.available
                  ? `Current trending role: ${
                      marketStatus?.trendingJob ||
                      'Data Analyst'
                    }`
                  : 'Live market intelligence is currently unavailable.'}

              </p>

              {marketStatus?.available && (
                <div className="flex items-center gap-2 mt-2">

                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'var(--primary)',
                    }}
                  />

                  <span className="text-xs text-muted">
                    Live data available
                  </span>

                </div>
              )}

            </div>

          </div>

          <Link
            to="/market"
            className="btn-outline whitespace-nowrap"
          >
            View Market Insights
            <ArrowRight size={16} />
          </Link>

        </div>

      </section>

      {/* ======================================================
          RECENT JOBS
      ====================================================== */}

      <section className="card p-6">

        <SectionHeader
          icon={Briefcase}
          title="Relevant Jobs"
          description="Recent opportunities available through CareerCraft."
          infoTitle="About Relevant Jobs"
          infoText="These job listings are fetched through CareerCraft's job data provider. Logged-in users can open the available external job links."
          action={
            <Link
              to="/jobs"
              className="link text-sm flex items-center gap-1"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          }
        />

        {jobs.length > 0 ? (

          <div className="space-y-2">

            {jobs.map((job) => (

              <a
                key={job._id}
                href={job.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl p-4 transition-all duration-200 hover:bg-bg border border-transparent hover:border-themed"
              >

                <div className="flex items-center justify-between gap-4">

                  <div className="min-w-0">

                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {job.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">

                      <span className="text-xs text-muted">
                        {job.company}
                      </span>

                      {job.location && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <MapPin size={12} />
                          {job.location}
                        </span>
                      )}

                    </div>

                  </div>

                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-1"
                    style={{
                      background: 'rgba(64,61,136,0.08)',
                    }}
                  >
                    <ArrowRight
                      size={15}
                      style={{ color: 'var(--primary)' }}
                    />
                  </div>

                </div>

              </a>

            ))}

          </div>

        ) : (

          <EmptyState
            icon={Briefcase}
            title="No jobs available"
            message="External job data is currently unavailable. Check back later."
          />

        )}

      </section>

    </div>
  );
}