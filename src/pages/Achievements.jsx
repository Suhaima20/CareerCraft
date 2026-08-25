import { useState, useEffect } from 'react';
import {
  Award,
  Lock,
  Trophy,
  Star,
  Target,
  CheckCircle2,
  BookOpen,
  Flame,
} from 'lucide-react';
import { achievementAPI } from '@/services/api';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
const ICONS = {
  first: Star,
  '10': Target,
  '25': Target,
  '3_chapters': BookOpen,
  '50': Award,
  '5_chapters': BookOpen,
  '75': Trophy,
  '10_chapters': Flame,
  '100': CheckCircle2,
};
export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [careerName, setCareerName] = useState('');
  const [progress, setProgress] = useState({
    percent: 0,
    completedChapters: 0,
    totalChapters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ============================================================
  // FETCH ACHIEVEMENTS
  // ============================================================
  const fetchAchievements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await achievementAPI.list();
      const data = res.data || {};
      setAchievements(
        data.achievements || []
      );
      setCareerName(
        data.careerName || ''
      );
      setProgress(
        data.progress || {
          percent: 0,
          completedChapters: 0,
          totalChapters: 0,
        }
      );
    } catch (err) {
      console.error(
        'Failed to load achievements:',
        err
      );
      setError(
        err.response?.data?.error ||
        'Failed to load achievements'
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAchievements();
  }, []);
  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <FullPageSpinner
        label="Loading achievements..."
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
        onRetry={fetchAchievements}
      />
    );
  }
  // ============================================================
  // EMPTY
  // ============================================================
  if (achievements.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No achievements yet"
        message="Start completing roadmap chapters to unlock achievements!"
      />
    );
  }
  // ============================================================
  // COUNTS
  // ============================================================
  const unlocked = achievements.filter(
    (achievement) =>
      achievement.unlocked
  );
  const locked = achievements.filter(
    (achievement) =>
      !achievement.unlocked
  );
  // ============================================================
  // NEXT ACHIEVEMENT
  // ============================================================
  const nextAchievement =
    locked.length > 0
      ? locked[0]
      : null;
  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="animate-fade-in">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Award
            size={24}
            style={{
              color: 'var(--primary)',
            }}
          />
          <h1
            className="text-2xl font-heading font-bold"
            style={{
              color: 'var(--text)',
            }}
          >
            Achievements
          </h1>
        </div>
        <p className="text-muted">
          {careerName
            ? `${careerName} learning journey`
            : 'Your learning achievements'}
        </p>
      </div>
      {/* ====================================================== */}
      {/* PROGRESS SUMMARY */}
      {/* ====================================================== */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p
              className="text-sm text-muted"
            >
              Current Career
            </p>
            <p
              className="text-lg font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              {careerName || 'Your Career'}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-bold"
              style={{
                color: 'var(--primary)',
              }}
            >
              {progress.percent}%
            </p>
            <p className="text-xs text-muted">
              {progress.completedChapters}
              {' '}
              of
              {' '}
              {progress.totalChapters}
              {' '}
              chapters
            </p>
          </div>
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
                `${progress.percent}%`,
              background:
                'var(--primary)',
            }}
          />
        </div>
        <p className="text-sm text-muted mt-3">
          <strong>
            {unlocked.length}
          </strong>
          {' '}
          of
          {' '}
          <strong>
            {achievements.length}
          </strong>
          {' '}
          achievements unlocked.
        </p>
      </div>
      {/* ====================================================== */}
      {/* NEXT GOAL */}
      {/* ====================================================== */}
      {nextAchievement && (
        <div
          className="card p-5 mb-6"
          style={{
            borderColor:
              'var(--primary)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  'rgba(64,61,136,0.1)',
              }}
            >
              <Target
                size={24}
                style={{
                  color:
                    'var(--primary)',
                }}
              />
            </div>
            <div>
              <p
                className="font-semibold"
                style={{
                  color:
                    'var(--text)',
                }}
              >
                Keep going! 🎯
              </p>
              <p className="text-sm text-muted mt-1">
                Your next achievement is:
                {' '}
                <strong>
                  {nextAchievement.title}
                </strong>
              </p>
              <p className="text-xs text-muted mt-1">
                {nextAchievement.description}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ====================================================== */}
      {/* ACHIEVEMENT GRID */}
      {/* ====================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const Icon =
            ICONS[achievement.type] ||
            Award;
          return (
            <div
              key={achievement._id}
              className={`card p-5 transition-all ${
                achievement.unlocked
                  ? 'shadow-lift'
                  : 'opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      achievement.unlocked
                        ? 'rgba(64,61,136,0.1)'
                        : 'var(--border)',
                  }}
                >
                  {achievement.unlocked ? (
                    <Icon
                      size={24}
                      style={{
                        color:
                          'var(--primary)',
                      }}
                    />
                  ) : (
                    <Lock
                      size={24}
                      className="text-muted"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold"
                    style={{
                      color:
                        'var(--text)',
                    }}
                  >
                    {achievement.title}
                  </p>
                  <p className="text-xs text-muted">
                    {achievement.unlocked
                      ? '✓ Unlocked'
                      : '🔒 Locked'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted">
                {achievement.description}
              </p>
              {achievement.unlocked &&
                achievement.unlockedAt && (
                  <p className="text-xs text-muted mt-3">
                    Unlocked on
                    {' '}
                    {new Date(
                      achievement.unlockedAt
                    ).toLocaleDateString(
                      'en-IN'
                    )}
                  </p>
                )}
            </div>
          );
        })}
      </div>
      {/* ====================================================== */}
      {/* MOTIVATION */}
      {/* ====================================================== */}
      {progress.percent < 100 && (
        <div className="text-center mt-8">
          <p
            className="font-semibold"
            style={{
              color:
                'var(--text)',
            }}
          >
            You're making progress! 🚀
          </p>
          <p className="text-sm text-muted mt-1">
            Complete your next chapter to move
            closer to your next achievement.
          </p>
        </div>
      )}
      {progress.percent >= 100 && (
        <div className="text-center mt-8">
          <p
            className="text-lg font-bold"
            style={{
              color:
                'var(--primary)',
            }}
          >
            🎉 Career Master!
          </p>
          <p className="text-sm text-muted mt-1">
            You've completed your entire
            {careerName
              ? ` ${careerName}`
              : ''}
            roadmap. Amazing work!
          </p>
        </div>
      )}
    </div>
  );
}
