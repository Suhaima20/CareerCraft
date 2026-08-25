import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Check,
  Youtube,
  Clock,
  ArrowRight,
  GraduationCap,
  RefreshCw,
  Layers,
  Award,
  X,
} from 'lucide-react';
import {
  roadmapAPI,
  onboardingAPI,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import {
  ErrorState,
  EmptyState,
} from '@/components/States';
export default function Roadmap() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnboarding =
    location.pathname.startsWith('/onboarding');
  // ============================================================
  // STATE
  // ============================================================
  const [roadmap, setRoadmap] = useState(null);
  const [brushUp, setBrushUp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] =
    useState('roadmap');
  // Newly unlocked achievement
  const [newAchievement, setNewAchievement] =
    useState(null);
  const careerId =
    user?.activeCareerId;
  // ============================================================
  // FETCH ROADMAP
  // ============================================================
  const fetchRoadmap = useCallback(async () => {
    if (!careerId) {
      navigate('/onboarding/career');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [
        roadmapRes,
        brushRes,
      ] = await Promise.all([
        roadmapAPI.get(
          careerId
        ),
        roadmapAPI
          .getBrushUp(careerId)
          .catch(() => ({
            data: {
              chapters: [],
            },
          })),
      ]);
      setRoadmap(
        roadmapRes.data
      );
      setBrushUp(
        brushRes.data?.chapters || []
      );
    } catch (err) {
      console.error(
        'Failed to load roadmap:',
        err
      );
      setError(
        err.response?.data?.error ||
        'Failed to load roadmap'
      );
    } finally {
      setLoading(false);
    }
  }, [
    careerId,
    navigate,
  ]);
  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);
  // ============================================================
  // CLOSE ACHIEVEMENT CARD
  // ============================================================
  const closeAchievement = () => {
    setNewAchievement(null);
  };
  // ============================================================
  // TOGGLE ROADMAP CHAPTER
  // ============================================================
  const handleToggleChapter = async (
    chapterId,
    completed
  ) => {
    try {
      /*
       * IMPORTANT:
       *
       * Do NOT calculate progress manually here.
       *
       * The backend calculates:
       *
       * - completed chapters
       * - total chapters
       * - percentage
       * - newly unlocked achievements
       *
       * We use those values directly.
       */
      const response =
        await roadmapAPI.toggleChapter(
          careerId,
          chapterId,
          completed
        );
      const data =
        response?.data || {};
      console.log(
        'Chapter progress response:',
        data
      );
      // ========================================================
      // UPDATE ROADMAP USING BACKEND VALUES
      // ========================================================
      setRoadmap((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedSkills =
          prev.skills.map((skill) => ({
            ...skill,
            chapters:
              skill.chapters.map((chapter) =>
                chapter._id === chapterId
                  ? {
                      ...chapter,
                      completed,
                    }
                  : chapter
              ),
          }));
        return {
          ...prev,
          skills:
            updatedSkills,
          completedChapters:
            data.completedChapters ??
            prev.completedChapters,
          totalChapters:
            data.totalChapters ??
            prev.totalChapters,
          progress:
            data.progress ??
            prev.progress,
        };
      });
      // ========================================================
      // CHECK FOR NEW ACHIEVEMENT
      // ========================================================
      const newlyUnlocked =
        data.newlyUnlockedAchievements || [];
      if (
        completed &&
        newlyUnlocked.length > 0
      ) {
        /*
         * Usually only one achievement will unlock
         * at a time, but we support multiple.
         *
         * Show the first newly unlocked achievement.
         */
        const achievement =
          newlyUnlocked[0];
        setNewAchievement(
          achievement
        );
        /*
         * Toast as an additional notification.
         */
        toast.success(
          `Achievement unlocked: ${achievement.title}!`
        );
      } else if (completed) {
        toast.success(
          'Chapter completed! Keep going.'
        );
      }
      // ========================================================
      // REFRESH USER
      //
      // This keeps dashboard/user state synchronized.
      // ========================================================
      try {
        await refreshUser();
      } catch (refreshError) {
        console.warn(
          'Could not refresh user:',
          refreshError
        );
      }
    } catch (err) {
      console.error(
        'Failed to update chapter:',
        err
      );
      toast.error(
        err.response?.data?.error ||
        'Failed to update progress'
      );
    }
  };
  // ============================================================
  // TOGGLE BRUSH-UP
  // ============================================================
  const handleToggleBrushUp = async (
    chapterId,
    completed
  ) => {
    try {
      await roadmapAPI.toggleBrushUp(
        careerId,
        chapterId,
        completed
      );
      setBrushUp((prev) =>
        prev.map((chapter) =>
          chapter._id === chapterId
            ? {
                ...chapter,
                completed,
              }
            : chapter
        )
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Failed to update brush-up progress'
      );
    }
  };
  // ============================================================
  // FINISH ONBOARDING
  // ============================================================
  const handleFinishOnboarding =
    async () => {
      try {
        await onboardingAPI.updateStep(
          'complete'
        );
        await refreshUser();
        toast.success(
          'Your roadmap is ready! Welcome to your dashboard.'
        );
        navigate(
          '/dashboard'
        );
      } catch (err) {
        console.error(
          'Failed to finish onboarding:',
          err
        );
        navigate(
          '/dashboard'
        );
      }
    };
  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <FullPageSpinner
        label="Loading your roadmap..."
      />
    );
  }
  // ============================================================
  // ERROR
  // ============================================================
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchRoadmap}
      />
    );
  }
  // ============================================================
  // DATA
  // ============================================================
  const skills =
    roadmap?.skills || [];
  const hasRoadmap =
    skills.length > 0;
  const progress =
    roadmap?.progress || 0;
  const completedChapters =
    roadmap?.completedChapters || 0;
  const totalChapters =
    roadmap?.totalChapters || 0;
  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="animate-fade-in">
      {/* ======================================================
          ACHIEVEMENT POPUP
      ====================================================== */}
      {newAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{
            background:
              'rgba(0, 0, 0, 0.45)',
          }}
        >
          <div
            className="card p-6 w-full max-w-md relative animate-fade-in"
            style={{
              border:
                '2px solid var(--primary)',
              boxShadow:
                '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            {/* Close */}
            <button
              onClick={closeAchievement}
              className="absolute top-3 right-3 p-1 rounded-lg"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'rgba(64,61,136,0.12)',
                }}
              >
                <Award
                  size={34}
                  style={{
                    color:
                      'var(--primary)',
                  }}
                />
              </div>
            </div>
            {/* Congratulations */}
            <div className="text-center">
              <p
                className="text-sm font-semibold mb-1"
                style={{
                  color:
                    'var(--primary)',
                }}
              >
                ACHIEVEMENT UNLOCKED
              </p>
              <h2
                className="text-2xl font-heading font-bold mb-2"
                style={{
                  color:
                    'var(--text)',
                }}
              >
                🎉 Congratulations!
              </h2>
              <h3
                className="text-lg font-semibold mb-2"
                style={{
                  color:
                    'var(--text)',
                }}
              >
                {newAchievement.title}
              </h3>
              <p className="text-sm text-muted mb-4">
                {newAchievement.description}
              </p>
              {/* Current progress */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  background:
                    'var(--bg)',
                }}
              >
                <p className="text-sm text-muted">
                  You have completed
                </p>
                <p
                  className="text-3xl font-bold mt-1"
                  style={{
                    color:
                      'var(--primary)',
                  }}
                >
                  {progress}%
                </p>
                <p className="text-xs text-muted mt-1">
                  of your{' '}
                  {roadmap?.careerName ||
                    'career'} roadmap
                </p>
              </div>
              {/* Encouragement */}
              {progress < 100 ? (
                <p className="text-sm text-muted mb-5">
                  Amazing work! 🚀 Keep learning
                  and complete the next milestone
                  as soon as you can.
                </p>
              ) : (
                <p className="text-sm text-muted mb-5">
                  🏆 Incredible! You completed
                  your entire roadmap. You are
                  ready to take the next step!
                </p>
              )}
              <button
                onClick={closeAchievement}
                className="btn-primary w-full"
              >
                Keep Learning <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================
          HEADER
      ====================================================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap
            size={24}
            style={{
              color:
                'var(--primary)',
            }}
          />
          <h1
            className="text-2xl font-heading font-bold"
            style={{
              color:
                'var(--text)',
            }}
          >
            Learning Roadmap
          </h1>
        </div>
        <p className="text-muted">
          {roadmap?.careerName ||
            'Your Career'}
          {' — '}
          {completedChapters}
          {' of '}
          {totalChapters}
          {' chapters completed'}
        </p>
      </div>
      {/* ======================================================
          PROGRESS
      ====================================================== */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium"
            style={{
              color:
                'var(--text)',
            }}
          >
            Overall Progress
          </span>
          <span
            className="text-sm font-bold"
            style={{
              color:
                'var(--primary)',
            }}
          >
            {progress}%
          </span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{
            background:
              'var(--border)',
          }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width:
                `${progress}%`,
              background:
                'var(--primary)',
            }}
          />
        </div>
        <p className="text-xs text-muted mt-2">
          Progress only counts missing-skill
          chapters. Brush-up does not affect
          this.
        </p>
      </div>
      {/* ======================================================
          TABS
      ====================================================== */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() =>
            setActiveTab('roadmap')
          }
          className={`btn ${
            activeTab === 'roadmap'
              ? 'btn-primary'
              : 'btn-secondary'
          }`}
        >
          <BookOpen size={16} />
          Roadmap ({totalChapters})
        </button>
        <button
          onClick={() =>
            setActiveTab('brushup')
          }
          className={`btn ${
            activeTab === 'brushup'
              ? 'btn-primary'
              : 'btn-secondary'
          }`}
        >
          <RefreshCw size={16} />
          Brush-Up ({brushUp.length})
        </button>
      </div>
      {/* ======================================================
          ROADMAP TAB
      ====================================================== */}
      {activeTab === 'roadmap' && (
        !hasRoadmap ? (
          <EmptyState
            icon={BookOpen}
            title="No missing skills!"
            message="You already have all the required skills for this career. Check the Brush-Up tab to review skills you already know."
          />
        ) : (
          <div className="space-y-6">
            {skills.map((skill) => (
              <div
                key={skill._id}
                className="card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Layers
                    size={18}
                    style={{
                      color:
                        'var(--primary)',
                    }}
                  />
                  <h3
                    className="text-lg font-semibold"
                    style={{
                      color:
                        'var(--text)',
                    }}
                  >
                    {skill.name}
                  </h3>
                  <span className="badge-warning ml-auto">
                    {skill.chapters?.length || 0}
                    {' '}
                    chapters
                  </span>
                </div>
                {skill.description && (
                  <p className="text-sm text-muted mb-4">
                    {skill.description}
                  </p>
                )}
                <div className="space-y-2">
                  {skill.chapters?.map(
                    (chapter) => (
                      <div
                        key={chapter._id}
                        className="flex items-start gap-3 p-3 rounded-lg"
                        style={{
                          background:
                            'var(--bg)',
                        }}
                      >
                        {/* CHECKBOX */}
                        <button
                          onClick={() =>
                            handleToggleChapter(
                              chapter._id,
                              !chapter.completed
                            )
                          }
                          className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{
                            background:
                              chapter.completed
                                ? 'var(--primary)'
                                : 'transparent',
                            border:
                              chapter.completed
                                ? 'none'
                                : '1px solid var(--border)',
                          }}
                          aria-label={
                            chapter.completed
                              ? 'Mark incomplete'
                              : 'Mark complete'
                          }
                        >
                          {chapter.completed && (
                            <Check
                              size={14}
                              className="text-white"
                            />
                          )}
                        </button>
                        {/* CHAPTER CONTENT */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              chapter.completed
                                ? 'line-through text-muted'
                                : ''
                            }`}
                            style={{
                              color:
                                chapter.completed
                                  ? 'var(--text-muted)'
                                  : 'var(--text)',
                            }}
                          >
                            {chapter.title}
                          </p>
                          {chapter.description && (
                            <p className="text-xs text-muted mt-0.5">
                              {chapter.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {chapter.youtubeUrl && (
                              <a
                                href={
                                  chapter.youtubeUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs link"
                              >
                                <Youtube
                                  size={14}
                                />
                                Watch
                              </a>
                            )}
                            {chapter.duration && (
                              <span className="flex items-center gap-1 text-xs text-muted">
                                <Clock
                                  size={14}
                                />
                                {chapter.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {/* ======================================================
          BRUSH-UP TAB
      ====================================================== */}
      {activeTab === 'brushup' && (
        brushUp.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No brush-up content"
            message="Brush-up chapters are for skills you already know. They don't count toward your roadmap progress."
          />
        ) : (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw
                size={18}
                style={{
                  color:
                    'var(--secondary)',
                }}
              />
              <h3
                className="text-lg font-semibold"
                style={{
                  color:
                    'var(--text)',
                }}
              >
                Brush-Up Path
              </h3>
            </div>
            <p className="text-sm text-muted mb-4">
              These are skills you already know.
              Reviewing them does not affect your
              roadmap progress.
            </p>
            <div className="space-y-2">
              {brushUp.map((chapter) => (
                <div
                  key={chapter._id}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background:
                      'var(--bg)',
                  }}
                >
                  <button
                    onClick={() =>
                      handleToggleBrushUp(
                        chapter._id,
                        !chapter.completed
                      )
                    }
                    className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        chapter.completed
                          ? 'var(--secondary)'
                          : 'transparent',
                      border:
                        chapter.completed
                          ? 'none'
                          : '1px solid var(--border)',
                    }}
                  >
                    {chapter.completed && (
                      <Check
                        size={14}
                        className="text-white"
                      />
                    )}
                  </button>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      {chapter.title}
                    </p>
                    {chapter.description && (
                      <p className="text-xs text-muted mt-0.5">
                        {chapter.description}
                      </p>
                    )}
                    {chapter.youtubeUrl && (
                      <a
                        href={
                          chapter.youtubeUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs link mt-1"
                      >
                        <Youtube
                          size={14}
                        />
                        Watch
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
      {/* ======================================================
          ONBOARDING FINISH
      ====================================================== */}
      {isOnboarding && (
        <div className="flex justify-end mt-8">
          <button
            onClick={
              handleFinishOnboarding
            }
            className="btn-primary"
          >
            Go to Dashboard
            <ArrowRight
              size={18}
            />
          </button>
        </div>
      )}
    </div>
  );
}
