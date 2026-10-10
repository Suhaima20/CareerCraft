import { useState, useEffect, useCallback, useRef } from 'react';
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
  Lock,
  Play,
  CircleCheck,
  CircleAlert,
  Trophy,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Video,
  ClipboardCheck,
} from 'lucide-react';

import {
  roadmapAPI,
  onboardingAPI,
  quizAPI,
} from '@/services/api';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

import { FullPageSpinner } from '@/components/Spinner';

import {
  ErrorState,
  EmptyState,
} from '@/components/States';


/* ============================================================
   YOUTUBE HELPERS
============================================================ */

function getYoutubeVideoId(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // youtube.com/watch?v=XXXXXXXXXXX
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');

      if (videoId) {
        return videoId;
      }

      // youtube.com/embed/XXXXXXXXXXX
      const embedMatch = parsed.pathname.match(
        /\/embed\/([^/?]+)/
      );

      if (embedMatch) {
        return embedMatch[1];
      }

      // youtube.com/shorts/XXXXXXXXXXX
      const shortsMatch = parsed.pathname.match(
        /\/shorts\/([^/?]+)/
      );

      if (shortsMatch) {
        return shortsMatch[1];
      }
    }

    // youtu.be/XXXXXXXXXXX
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.replace('/', '').split('/')[0];
    }

    return null;
  } catch {
    // Fallback for malformed-but-valid-looking URLs
    const match = url.match(
      /(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/
    );

    return match ? match[1] : null;
  }
}


/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function Roadmap() {
  const { user, refreshUser } = useAuth();

  const toast = useToast();

  const navigate = useNavigate();

  const location = useLocation();

  const isOnboarding =
    location.pathname.startsWith('/onboarding');

  /* ============================================================
     MAIN STATE
  ============================================================ */

  const [roadmap, setRoadmap] = useState(null);

  const [brushUp, setBrushUp] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] =
    useState('roadmap');


  /* ============================================================
     ACHIEVEMENT
  ============================================================ */

  const [newAchievement, setNewAchievement] =
    useState(null);


  /* ============================================================
     ACTIVE CHAPTER / VIDEO
  ============================================================ */

  const [activeChapter, setActiveChapter] =
    useState(null);

  const [watchProgress, setWatchProgress] =
    useState(0);

  const [watchLoading, setWatchLoading] =
    useState(false);

  const [savingWatch, setSavingWatch] =
    useState(false);


  /* ============================================================
     QUIZ
  ============================================================ */

  const [quizOpen, setQuizOpen] =
    useState(false);

  const [quizLoading, setQuizLoading] =
    useState(false);

  const [quizData, setQuizData] =
    useState(null);

  const [quizAnswers, setQuizAnswers] =
    useState({});

  const [quizAttemptId, setQuizAttemptId] =
    useState(null);

  const [quizSubmitting, setQuizSubmitting] =
    useState(false);

  const [quizResult, setQuizResult] =
    useState(null);

  const [quizQuestionIndex, setQuizQuestionIndex] =
    useState(0);


  /* ============================================================
     YOUTUBE PLAYER
  ============================================================ */

  const playerRef = useRef(null);

  const youtubePlayerRef = useRef(null);

  const youtubeIntervalRef = useRef(null);

  const lastSavedProgressRef = useRef(0);

  const youtubeReadyRef = useRef(false);


  /* ============================================================
     CAREER
  ============================================================ */

  const careerId =
    user?.activeCareerId;


  /* ============================================================
     FETCH ROADMAP
  ============================================================ */

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
        roadmapAPI.get(careerId),

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


  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);


  /* ============================================================
     CLOSE ACHIEVEMENT
  ============================================================ */

  const closeAchievement = () => {
    setNewAchievement(null);
  };


  /* ============================================================
     CLEAN YOUTUBE PLAYER
  ============================================================ */

  const destroyYoutubePlayer = useCallback(() => {
    if (youtubeIntervalRef.current) {
      clearInterval(
        youtubeIntervalRef.current
      );

      youtubeIntervalRef.current = null;
    }

    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.destroy === 'function'
    ) {
      try {
        youtubePlayerRef.current.destroy();
      } catch {
        // Ignore player cleanup errors
      }
    }

    youtubePlayerRef.current = null;

    youtubeReadyRef.current = false;
  }, []);


  /* ============================================================
     SAVE WATCH PROGRESS
  ============================================================ */

  const saveWatchProgress = useCallback(
    async (
      chapter,
      percentage,
      currentTime = null,
      duration = null
    ) => {
      if (!careerId || !chapter?._id) {
        return;
      }

      const safePercentage = Math.min(
        100,
        Math.max(
          0,
          Math.round(Number(percentage) || 0)
        )
      );

      /*
       * Never repeatedly save exactly the same value.
       */
      if (
        safePercentage <=
        lastSavedProgressRef.current
      ) {
        return;
      }

      lastSavedProgressRef.current =
        safePercentage;

      setWatchProgress(
        (previous) =>
          Math.max(
            previous,
            safePercentage
          )
      );

      try {
        setSavingWatch(true);

        await roadmapAPI.saveWatchProgress(
          careerId,
          chapter._id,
          {
            watchPercentage:
              safePercentage,

            watchedSeconds:
              currentTime !== null
                ? Number(currentTime)
                : undefined,

            durationSeconds:
              duration !== null
                ? Number(duration)
                : undefined,
          }
        );
      } catch (err) {
        console.warn(
          'Could not save video progress:',
          err
        );
      } finally {
        setSavingWatch(false);
      }
    },
    [careerId]
  );


  /* ============================================================
     LOAD SAVED WATCH PROGRESS
  ============================================================ */

  const loadWatchProgress = useCallback(
    async (chapter) => {
      if (!careerId || !chapter?._id) {
        return 0;
      }

      try {
        setWatchLoading(true);

        const response =
          await roadmapAPI.getWatchProgress(
            careerId,
            chapter._id
          );

        const percentage = Math.min(
          100,
          Math.max(
            0,
            Number(
              response.data?.watchPercentage ||
              response.data?.percentage ||
              0
            )
          )
        );

        setWatchProgress(
          percentage
        );

        lastSavedProgressRef.current =
          percentage;

        return percentage;
      } catch (err) {
        console.warn(
          'Could not load watch progress:',
          err
        );

        setWatchProgress(0);

        lastSavedProgressRef.current = 0;

        return 0;
      } finally {
        setWatchLoading(false);
      }
    },
    [careerId]
  );


  /* ============================================================
     LOAD YOUTUBE IFRAME API
  ============================================================ */

  const loadYoutubeAPI = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (
        window.YT &&
        window.YT.Player
      ) {
        resolve(window.YT);
        return;
      }

      const existingScript =
        document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );

      if (existingScript) {
        const originalReady =
          window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady =
          () => {
            if (originalReady) {
              originalReady();
            }

            if (
              window.YT &&
              window.YT.Player
            ) {
              resolve(window.YT);
            } else {
              reject(
                new Error(
                  'YouTube API failed to initialize'
                )
              );
            }
          };

        setTimeout(() => {
          if (
            window.YT &&
            window.YT.Player
          ) {
            resolve(window.YT);
          }
        }, 3000);

        return;
      }

      const script =
        document.createElement('script');

      script.src =
        'https://www.youtube.com/iframe_api';

      script.async = true;

      window.onYouTubeIframeAPIReady =
        () => {
          if (
            window.YT &&
            window.YT.Player
          ) {
            resolve(window.YT);
          } else {
            reject(
              new Error(
                'YouTube API unavailable'
              )
            );
          }
        };

      script.onerror = () => {
        reject(
          new Error(
            'Could not load YouTube API'
          )
        );
      };

      document.body.appendChild(script);
    });
  }, []);


  /* ============================================================
     START VIDEO TRACKING
  ============================================================ */

  const startVideoTracking = useCallback(
    async (chapter) => {
      if (
        !chapter ||
        !chapter.youtubeUrl ||
        !playerRef.current
      ) {
        return;
      }

      const videoId =
        getYoutubeVideoId(
          chapter.youtubeUrl
        );

      if (!videoId) {
        return;
      }

      destroyYoutubePlayer();

      try {
        const YT =
          await loadYoutubeAPI();

        /*
         * Small delay ensures the container exists
         * after React renders it.
         */
        setTimeout(() => {
          if (
            !playerRef.current ||
            !window.YT
          ) {
            return;
          }

          try {
            youtubePlayerRef.current =
              new YT.Player(
                playerRef.current,
                {
                  videoId,

                  playerVars: {
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                  },

                  events: {
                    onReady: (
                      event
                    ) => {
                      youtubeReadyRef.current =
                        true;

                      const player =
                        event.target;

                      const duration =
                        player.getDuration();

                      /*
                       * If the user previously watched
                       * this chapter, seek to the saved
                       * position.
                       */
                      const saved =
                        lastSavedProgressRef.current;

                      if (
                        saved > 0 &&
                        duration > 0 &&
                        saved < 98
                      ) {
                        const seekTime =
                          duration *
                          (saved / 100);

                        try {
                          player.seekTo(
                            seekTime,
                            true
                          );
                        } catch {
                          // Ignore seek errors
                        }
                      }

                      /*
                       * Check progress every 2 seconds.
                       */
                      youtubeIntervalRef.current =
                        setInterval(() => {
                          if (
                            !youtubePlayerRef.current ||
                            !youtubeReadyRef.current
                          ) {
                            return;
                          }

                          try {
                            const currentTime =
                              player.getCurrentTime();

                            const videoDuration =
                              player.getDuration();

                            if (
                              !videoDuration ||
                              videoDuration <= 0
                            ) {
                              return;
                            }

                            const percentage =
                              Math.min(
                                100,
                                Math.round(
                                  (currentTime /
                                    videoDuration) *
                                    100
                                )
                              );

                            setWatchProgress(
                              (previous) =>
                                Math.max(
                                  previous,
                                  percentage
                                )
                            );

                            /*
                             * Save when progress advances.
                             */
                            if (
                              percentage >=
                                lastSavedProgressRef.current +
                                  1
                            ) {
                              saveWatchProgress(
                                chapter,
                                percentage,
                                currentTime,
                                videoDuration
                              );
                            }

                            /*
                             * Reaching 98% unlocks quiz.
                             */
                            if (
                              percentage >= 98 &&
                              lastSavedProgressRef.current <
                                98
                            ) {
                              saveWatchProgress(
                                chapter,
                                98,
                                currentTime,
                                videoDuration
                              );

                              toast.success(
                                'Video completed! Your chapter quiz is now unlocked.'
                              );
                            }
                          } catch {
                            // Player may be unavailable during cleanup
                          }
                        }, 2000);
                    },

                    onStateChange: (
                      event
                    ) => {
                      /*
                       * When the video ends,
                       * explicitly save 100%.
                       */
                      if (
                        window.YT &&
                        event.data ===
                          window.YT.PlayerState
                            .ENDED
                      ) {
                        try {
                          const player =
                            event.target;

                          const duration =
                            player.getDuration();

                          saveWatchProgress(
                            chapter,
                            100,
                            duration,
                            duration
                          );
                        } catch {
                          // Ignore end-event errors
                        }
                      }
                    },
                  },
                }
              );
            } catch (err) {
              console.error(
                'Could not create YouTube player:',
                err
              );
            }

        }, 100);
      } catch (err) {
        console.error(
          'Could not initialize YouTube player:',
          err
        );
      }
    },
    [
      destroyYoutubePlayer,
      loadYoutubeAPI,
      saveWatchProgress,
      toast,
    ]
  );


  /* ============================================================
     OPEN CHAPTER
  ============================================================ */

  const openChapter = async (
    chapter,
    locked = false
  ) => {
    if (locked) {
      toast.error(
        'Complete the previous chapter before starting this one.'
      );

      return;
    }

    if (chapter.completed) {
      /*
       * Completed chapters can still be opened
       * for review.
       */
    }

    setActiveChapter(chapter);

    setQuizOpen(false);

    setQuizData(null);

    setQuizResult(null);

    setQuizAnswers({});

    setQuizAttemptId(null);

    setQuizQuestionIndex(0);

    setWatchProgress(0);

    lastSavedProgressRef.current = 0;

    await loadWatchProgress(
      chapter
    );
  };


  /* ============================================================
     START VIDEO AFTER CHAPTER PANEL RENDERS
  ============================================================ */

  useEffect(() => {
    if (
      !activeChapter ||
      !activeChapter.youtubeUrl
    ) {
      destroyYoutubePlayer();
      return;
    }

    /*
     * Wait for the modal/video container
     * to render.
     */
    const timer =
      setTimeout(() => {
        startVideoTracking(
          activeChapter
        );
      }, 150);

    return () => {
      clearTimeout(timer);
      destroyYoutubePlayer();
    };
  }, [
    activeChapter,
    destroyYoutubePlayer,
    startVideoTracking,
  ]);


  /* ============================================================
     CLOSE CHAPTER
  ============================================================ */

  const closeChapter = () => {
    destroyYoutubePlayer();

    setActiveChapter(null);

    setQuizOpen(false);

    setQuizData(null);

    setQuizResult(null);

    setQuizAnswers({});

    setQuizAttemptId(null);
  };


  /* ============================================================
     OPEN QUIZ
  ============================================================ */

  const openQuiz = async () => {
    if (!activeChapter) {
      return;
    }

    if (watchProgress < 98) {
      toast.error(
        'Watch at least 98% of the lesson before taking the quiz.'
      );

      return;
    }

    try {
      setQuizLoading(true);

      setQuizResult(null);

      setQuizAnswers({});

      setQuizQuestionIndex(0);

      const response =
        await quizAPI.getQuiz(
          activeChapter._id
        );

      const data =
        response.data || {};

      if (
        data.hasQuiz === false ||
        !data.questions ||
        data.questions.length === 0
      ) {
        toast.error(
          'A quiz has not been configured for this chapter yet.'
        );

        return;
      }

      if (
        data.quizUnlocked === false
      ) {
        toast.error(
          data.message ||
          'Complete the required video watching first.'
        );

        return;
      }

      setQuizData(data);

      setQuizAttemptId(
        data.attemptId
      );

      setQuizOpen(true);
    } catch (err) {
      console.error(
        'Failed to load quiz:',
        err
      );

      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to load quiz'
      );
    } finally {
      setQuizLoading(false);
    }
  };


  /* ============================================================
     SELECT QUIZ ANSWER
  ============================================================ */

  const selectQuizAnswer = (
    questionId,
    optionIndex
  ) => {
    setQuizAnswers(
      (previous) => ({
        ...previous,
        [questionId]:
          optionIndex,
      })
    );
  };


  /* ============================================================
     SUBMIT QUIZ
  ============================================================ */


  const submitQuiz = async () => {
    if (!quizData || !activeChapter) {
      return;
    }

    const questions = quizData.questions || [];

    const unanswered = questions.filter(
      (question) =>
        quizAnswers[question.id] === undefined ||
        quizAnswers[question.id] === null
    );

    if (unanswered.length > 0) {
      toast.error(
        `Please answer all ${unanswered.length} remaining question${
          unanswered.length === 1 ? '' : 's'
        }.`
      );
      return;
    }

    try {
      setQuizSubmitting(true);

      const response = await quizAPI.submitQuiz(
        activeChapter._id,
        quizAnswers,
        quizAttemptId
      );

      const data = response.data || {};

      setQuizResult(data);

      const scorePercentage =
        data.scorePercentage ?? data.score ?? 0;

      if (data.passed === true) {
        toast.success(
          `Quiz passed! You scored ${scorePercentage}%. Chapter completed.`
        );

        // Refresh the roadmap so the next chapter unlocks.
        await fetchRoadmap();

        try {
          await refreshUser();
        } catch {
          // Refreshing the user is non-blocking.
        }

        const newlyUnlockedAchievements =
          data.newlyUnlockedAchievements || [];

        if (newlyUnlockedAchievements.length > 0) {
          setNewAchievement(newlyUnlockedAchievements[0]);
        }
      } else {
        toast.error(
          `Quiz not passed. You scored ${scorePercentage}%.`
        );
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);

      toast.error(
        err.response?.data?.error ||
        'Failed to submit quiz'
      );
    } finally {
      setQuizSubmitting(false);
    }
  };




  /* ============================================================
     RETAKE QUIZ
  ============================================================ */

  const retakeQuiz = async () => {
    setQuizResult(null);

    setQuizAnswers({});

    setQuizQuestionIndex(0);

    await openQuiz();
  };


  /* ============================================================
     TOGGLE BRUSH-UP
  ============================================================ */

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

      setBrushUp(
        (prev) =>
          prev.map(
            (chapter) =>
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


  /* ============================================================
     FINISH ONBOARDING
  ============================================================ */

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

        navigate('/dashboard');
      } catch (err) {
        console.error(
          'Failed to finish onboarding:',
          err
        );

        navigate('/dashboard');
      }
    };


  /* ============================================================
     CLEANUP ON UNMOUNT
  ============================================================ */

  useEffect(() => {
    return () => {
      destroyYoutubePlayer();
    };
  }, [destroyYoutubePlayer]);


  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <FullPageSpinner
        label="Loading your roadmap..."
      />
    );
  }


  /* ============================================================
     ERROR
  ============================================================ */

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchRoadmap}
      />
    );
  }


  /* ============================================================
     DATA
  ============================================================ */

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


  /* ============================================================
     DETERMINE CHAPTER LOCK STATUS
  ============================================================ */

  const isChapterLocked = (
    skillIndex,
    chapterIndex
  ) => {
    /*
     * First chapter of first skill is always unlocked.
     */
    if (
      skillIndex === 0 &&
      chapterIndex === 0
    ) {
      return false;
    }

    /*
     * Every chapter after the first chapter
     * requires the previous chapter to be completed.
     */
    if (chapterIndex > 0) {
      const previousChapter =
        skills[
          skillIndex
        ]?.chapters?.[
          chapterIndex - 1
        ];

      return !previousChapter?.completed;
    }

    /*
     * First chapter of a later skill requires
     * every chapter in the previous skill to be complete.
     */
    const previousSkill =
      skills[
        skillIndex - 1
      ];

    if (!previousSkill) {
      return false;
    }

    const previousSkillChapters =
      previousSkill.chapters || [];

    if (
      previousSkillChapters.length === 0
    ) {
      return false;
    }

    return !previousSkillChapters.every(
      (chapter) =>
        chapter.completed
    );
  };


  /* ============================================================
     SKILL COMPLETION
  ============================================================ */

  const getSkillProgress = (
    skill
  ) => {
    const chapters =
      skill?.chapters || [];

    if (chapters.length === 0) {
      return 0;
    }

    const completed =
      chapters.filter(
        (chapter) =>
          chapter.completed
      ).length;

    return Math.round(
      (completed /
        chapters.length) *
        100
    );
  };


  /* ============================================================
     CURRENT QUIZ QUESTION
  ============================================================ */

  const quizQuestions =
    quizData?.questions || [];

  const currentQuestion =
    quizQuestions[
      quizQuestionIndex
    ];


  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="animate-fade-in">

      {/* ======================================================
          ACHIEVEMENT POPUP
      ====================================================== */}

      {newAchievement && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
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

            <button
              onClick={
                closeAchievement
              }
              className="absolute top-3 right-3 p-1 rounded-lg"
              aria-label="Close"
            >
              <X size={20} />
            </button>

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

              {progress < 100 ? (
                <p className="text-sm text-muted mb-5">
                  Amazing work! 🚀 Keep learning
                  and complete the next milestone.
                </p>
              ) : (
                <p className="text-sm text-muted mb-5">
                  🏆 Incredible! You completed
                  your entire roadmap.
                </p>
              )}

              <button
                onClick={
                  closeAchievement
                }
                className="btn-primary w-full"
              >
                Keep Learning
                <ArrowRight size={18} />
              </button>

            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          VIDEO + CHAPTER MODAL
      ====================================================== */}

      {activeChapter && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{
            background:
              'rgba(0, 0, 0, 0.65)',
          }}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl"
            style={{
              background:
                'var(--surface)',
              boxShadow:
                '0 25px 80px rgba(0,0,0,0.3)',
            }}
          >

            {/* HEADER */}

            <div className="flex items-start justify-between gap-4 p-5 border-b"
              style={{
                borderColor:
                  'var(--border)',
              }}
            >
              <div className="min-w-0">

                <div className="flex items-center gap-2 mb-1">
                  <Video
                    size={18}
                    style={{
                      color:
                        'var(--primary)',
                    }}
                  />

                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color:
                        'var(--primary)',
                    }}
                  >
                    Learning Chapter
                  </span>
                </div>

                <h2
                  className="text-xl font-heading font-bold"
                  style={{
                    color:
                      'var(--text)',
                  }}
                >
                  {activeChapter.title}
                </h2>

                {activeChapter.description && (
                  <p className="text-sm text-muted mt-1">
                    {activeChapter.description}
                  </p>
                )}

              </div>

              <button
                onClick={
                  closeChapter
                }
                className="p-2 rounded-lg flex-shrink-0"
                aria-label="Close chapter"
              >
                <X size={20} />
              </button>

            </div>


            {/* VIDEO */}

            <div className="p-5">

              {activeChapter.youtubeUrl &&
              getYoutubeVideoId(
                activeChapter.youtubeUrl
              ) ? (
                <div
                  className="rounded-xl overflow-hidden bg-black"
                  style={{
                    aspectRatio:
                      '16 / 9',
                  }}
                >
                  <div
                    ref={playerRef}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{
                    background:
                      'var(--bg)',
                  }}
                >
                  <Youtube
                    size={42}
                    className="mx-auto mb-3"
                    style={{
                      color:
                        'var(--primary)',
                    }}
                  />

                  <p className="font-semibold">
                    No embedded video available
                  </p>

                  <p className="text-sm text-muted mt-1">
                    This chapter does not have a valid
                    YouTube lesson configured.
                  </p>

                  {activeChapter.youtubeUrl && (
                    <a
                      href={
                        activeChapter.youtubeUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary mt-4 inline-flex"
                    >
                      Open YouTube
                      <ArrowRight size={16} />
                    </a>
                  )}
                </div>
              )}


              {/* WATCH PROGRESS */}

              <div className="mt-5">

                <div className="flex items-center justify-between mb-2">

                  <div className="flex items-center gap-2">
                    {watchProgress >= 98 ? (
                      <CircleCheck
                        size={18}
                        style={{
                          color:
                            'var(--primary)',
                        }}
                      />
                    ) : (
                      <Play
                        size={18}
                        style={{
                          color:
                            'var(--primary)',
                        }}
                      />
                    )}

                    <span
                      className="text-sm font-semibold"
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      Lesson Progress
                    </span>
                  </div>

                  <span
                    className="text-sm font-bold"
                    style={{
                      color:
                        watchProgress >= 98
                          ? 'var(--primary)'
                          : 'var(--text)',
                    }}
                  >
                    {watchProgress}%
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
                        `${watchProgress}%`,
                      background:
                        'var(--primary)',
                    }}
                  />
                </div>

                <div className="flex justify-between mt-2">

                  <p className="text-xs text-muted">
                    {watchProgress >= 98
                      ? 'Required watch percentage reached.'
                      : 'Watch at least 98% to unlock the quiz.'}
                  </p>

                  {savingWatch && (
                    <span className="text-xs text-muted">
                      Saving...
                    </span>
                  )}

                </div>

              </div>


              {/* QUIZ UNLOCK MESSAGE */}

              {watchProgress >= 98 && (
                <div
                  className="mt-5 rounded-xl p-4"
                  style={{
                    background:
                      'rgba(64,61,136,0.08)',
                    border:
                      '1px solid rgba(64,61,136,0.18)',
                  }}
                >
                  <div className="flex items-start gap-3">

                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          'rgba(64,61,136,0.12)',
                      }}
                    >
                      <ClipboardCheck
                        size={20}
                        style={{
                          color:
                            'var(--primary)',
                        }}
                      />
                    </div>

                    <div className="flex-1">

                      <p
                        className="font-semibold"
                        style={{
                          color:
                            'var(--text)',
                        }}
                      >
                        Quiz Unlocked
                      </p>

                      <p className="text-sm text-muted mt-1">
                        You watched at least 98% of
                        the lesson. Complete the quiz
                        with a score of 70% or higher
                        to complete this chapter.
                      </p>

                    </div>

                  </div>

                  <button
                    onClick={openQuiz}
                    disabled={quizLoading}
                    className="btn-primary mt-4 w-full"
                  >
                    {quizLoading ? (
                      <>
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                        Loading Quiz...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck size={17} />
                        Take Chapter Quiz
                      </>
                    )}
                  </button>

                </div>
              )}


              {/* REQUIREMENT MESSAGE */}

              {watchProgress < 98 && (
                <div
                  className="mt-5 rounded-xl p-4 flex items-start gap-3"
                  style={{
                    background:
                      'var(--bg)',
                  }}
                >
                  <CircleAlert
                    size={19}
                    className="flex-shrink-0 mt-0.5"
                    style={{
                      color:
                        'var(--secondary)',
                    }}
                  />

                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      Keep watching
                    </p>

                    <p className="text-xs text-muted mt-1">
                      The quiz will unlock automatically
                      when your lesson progress reaches
                      98%.
                    </p>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}


      {/* ======================================================
          QUIZ MODAL
      ====================================================== */}

      {quizOpen && quizData && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{
            background:
              'rgba(0, 0, 0, 0.65)',
          }}
        >

          <div
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl"
            style={{
              background:
                'var(--surface)',
              boxShadow:
                '0 25px 80px rgba(0,0,0,0.3)',
            }}
          >

            {/* QUIZ HEADER */}

            <div
              className="p-5 border-b"
              style={{
                borderColor:
                  'var(--border)',
              }}
            >

              <div className="flex items-start justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2 mb-1">

                    <ClipboardCheck
                      size={18}
                      style={{
                        color:
                          'var(--primary)',
                      }}
                    />

                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color:
                          'var(--primary)',
                      }}
                    >
                      Chapter Quiz
                    </span>

                  </div>

                  <h2
                    className="text-xl font-heading font-bold"
                    style={{
                      color:
                        'var(--text)',
                    }}
                  >
                    {quizData.title ||
                      `${activeChapter?.title || 'Chapter'} Quiz`}
                  </h2>

                </div>

                {!quizSubmitting &&
                  !quizResult?.passed && (
                    <button
                      onClick={() =>
                        setQuizOpen(false)
                      }
                      className="p-2 rounded-lg"
                      aria-label="Close quiz"
                    >
                      <X size={20} />
                    </button>
                  )}

              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-muted">

                <span>
                  {quizQuestions.length}{' '}
                  questions
                </span>

                <span>
                  Pass score:{' '}
                  {quizData.passScore ??
                    70}
                  %
                </span>

              </div>

            </div>


            {/* QUIZ RESULT */}

            {quizResult && (
              <div className="p-5">

                <div
                  className="rounded-2xl p-6 text-center"
                  style={{
                    background:
                      quizResult.passed
                        ? 'rgba(64,61,136,0.08)'
                        : 'var(--bg)',
                    border:
                      quizResult.passed
                        ? '1px solid rgba(64,61,136,0.18)'
                        : '1px solid var(--border)',
                  }}
                >

                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                    style={{
                      background:
                        quizResult.passed
                          ? 'rgba(64,61,136,0.12)'
                          : 'rgba(185,130,120,0.15)',
                    }}
                  >
                    {quizResult.passed ? (
                      <Trophy
                        size={32}
                        style={{
                          color:
                            'var(--primary)',
                        }}
                      />
                    ) : (
                      <CircleAlert
                        size={32}
                        style={{
                          color:
                            'var(--secondary)',
                        }}
                      />
                    )}
                  </div>

                  <h3
                    className="text-2xl font-heading font-bold"
                    style={{
                      color:
                        'var(--text)',
                    }}
                  >
                    {quizResult.passed
                      ? 'Chapter Completed!'
                      : 'Keep Practicing'}
                  </h3>

                  <p
                    className="text-4xl font-bold mt-3"
                    style={{
                      color:
                        quizResult.passed
                          ? 'var(--primary)'
                          : 'var(--secondary)',
                    }}
                  >
                    {quizResult.scorePercentage ?? quizResult.score ?? 0}%


                  </p>

                  <p className="text-sm text-muted mt-2">
                    Required to pass:{' '}
                    {quizResult.passScore ??
                      quizData.passScore ??
                      70}
                    %
                  </p>

                  {quizResult.passed ? (
                    <div className="mt-5">

                      <p className="text-sm text-muted mb-4">
                        Great work! The next chapter
                        is now available on your roadmap.
                      </p>

                      <button
                        onClick={() => {
                          setQuizOpen(false);
                          setQuizResult(null);
                          closeChapter();
                        }}
                        className="btn-primary w-full"
                      >
                        Continue Learning
                        <ArrowRight size={18} />
                      </button>

                    </div>
                  ) : (
                    <div className="mt-5">

                      <p className="text-sm text-muted mb-4">
                        Review the lesson and try the
                        quiz again.
                      </p>

                      <button
                        onClick={retakeQuiz}
                        className="btn-primary w-full"
                      >
                        <RotateCcw size={17} />
                        Retake Quiz
                      </button>

                    </div>
                  )}

                </div>

              </div>
            )}


            {/* CURRENT QUESTION */}

            {!quizResult &&
              currentQuestion && (
                <div className="p-5">

                  {/* QUESTION PROGRESS */}

                  <div className="flex items-center justify-between mb-4">

                    <span className="text-sm text-muted">
                      Question{' '}
                      {quizQuestionIndex + 1}
                      {' of '}
                      {quizQuestions.length}
                    </span>

                    <span className="text-xs text-muted">
                      {
                        Object.keys(
                          quizAnswers
                        ).length
                      } answered
                    </span>

                  </div>

                  <div
                    className="h-2 rounded-full overflow-hidden mb-6"
                    style={{
                      background:
                        'var(--border)',
                    }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width:
                          `${
                            ((quizQuestionIndex + 1) /
                              quizQuestions.length) *
                            100
                          }%`,
                        background:
                          'var(--primary)',
                      }}
                    />
                  </div>


                  {/* QUESTION */}

                  <div className="mb-6">

                    <h3
                      className="text-lg font-semibold leading-relaxed"
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      {currentQuestion.question ||
                        currentQuestion.text}
                    </h3>

                  </div>


                  {/* OPTIONS */}

                  <div className="space-y-3">

                    {(currentQuestion.options ||
                      []).map(
                      (
                        option,
                        optionIndex
                      ) => {
                        const selected =
                          quizAnswers[
                            currentQuestion.id
                          ] ===
                          optionIndex;

                        return (
                          <button
                            key={
                              optionIndex
                            }
                            onClick={() =>
                              selectQuizAnswer(
                                currentQuestion.id,
                                optionIndex
                              )
                            }
                            className="w-full text-left p-4 rounded-xl transition-all"
                            style={{
                              background:
                                selected
                                  ? 'rgba(64,61,136,0.09)'
                                  : 'var(--bg)',
                              border:
                                selected
                                  ? '2px solid var(--primary)'
                                  : '1px solid var(--border)',
                            }}
                          >

                            <div className="flex items-center gap-3">

                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                                style={{
                                  background:
                                    selected
                                      ? 'var(--primary)'
                                      : 'var(--surface)',
                                  color:
                                    selected
                                      ? '#fff'
                                      : 'var(--text)',
                                  border:
                                    selected
                                      ? 'none'
                                      : '1px solid var(--border)',
                                }}
                              >
                                {String.fromCharCode(
                                  65 +
                                    optionIndex
                                )}
                              </div>

                              <span
                                className="text-sm"
                                style={{
                                  color:
                                    'var(--text)',
                                }}
                              >
                                {option}
                              </span>

                            </div>

                          </button>
                        );
                      }
                    )}

                  </div>


                  {/* NAVIGATION */}

                  <div className="flex items-center justify-between gap-3 mt-7">

                    <button
                      onClick={() =>
                        setQuizQuestionIndex(
                          (previous) =>
                            Math.max(
                              0,
                              previous - 1
                            )
                        )
                      }
                      disabled={
                        quizQuestionIndex ===
                        0
                      }
                      className="btn-secondary"
                    >
                      <ChevronLeft size={17} />
                      Previous
                    </button>


                    {quizQuestionIndex <
                    quizQuestions.length -
                      1 ? (
                      <button
                        onClick={() =>
                          setQuizQuestionIndex(
                            (previous) =>
                              Math.min(
                                quizQuestions.length -
                                  1,
                                previous + 1
                              )
                          )
                        }
                        className="btn-primary"
                      >
                        Next
                        <ChevronRight
                          size={17}
                        />
                      </button>
                    ) : (
                      <button
                        onClick={
                          submitQuiz
                        }
                        disabled={
                          quizSubmitting
                        }
                        className="btn-primary"
                      >
                        {quizSubmitting ? (
                          <>
                            <RefreshCw
                              size={16}
                              className="animate-spin"
                            />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Check
                              size={17}
                            />
                            Submit Quiz
                          </>
                        )}
                      </button>
                    )}

                  </div>

                </div>
              )}

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
          Progress only counts completed
          missing-skill chapters. Brush-up
          chapters do not affect this percentage.
        </p>

      </div>


      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="flex gap-2 mb-6 flex-wrap">

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

      {activeTab === 'roadmap' &&
        (!hasRoadmap ? (
          <EmptyState
            icon={BookOpen}
            title="No missing skills!"
            message="You already have all the required skills for this career. Check the Brush-Up tab to review skills you already know."
          />
        ) : (
          <div className="space-y-6">

            {skills.map(
              (
                skill,
                skillIndex
              ) => {

                const skillProgress =
                  getSkillProgress(
                    skill
                  );

                return (
                  <div
                    key={
                      skill._id
                    }
                    className="card p-5"
                  >

                    {/* SKILL HEADER */}

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
                        {skill.chapters?.length ||
                          0}{' '}
                        chapters
                      </span>

                    </div>


                    {/* SKILL PROGRESS */}

                    <div className="mb-4">

                      <div className="flex justify-between text-xs mb-1">

                        <span className="text-muted">
                          Skill Progress
                        </span>

                        <span
                          className="font-semibold"
                          style={{
                            color:
                              'var(--primary)',
                          }}
                        >
                          {skillProgress}%
                        </span>

                      </div>

                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{
                          background:
                            'var(--border)',
                        }}
                      >
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width:
                              `${skillProgress}%`,
                            background:
                              'var(--primary)',
                          }}
                        />
                      </div>

                    </div>


                    {skill.description && (
                      <p className="text-sm text-muted mb-4">
                        {skill.description}
                      </p>
                    )}


                    {/* CHAPTERS */}

                    <div className="space-y-3">

                      {skill.chapters?.map(
                        (
                          chapter,
                          chapterIndex
                        ) => {

                          const locked =
                            isChapterLocked(
                              skillIndex,
                              chapterIndex
                            );

                          const completed =
                            Boolean(
                              chapter.completed
                            );

                          return (
                            <div
                              key={
                                chapter._id
                              }
                              className="rounded-xl p-4 transition-all"
                              style={{
                                background:
                                  locked
                                    ? 'rgba(0,0,0,0.025)'
                                    : 'var(--bg)',
                                border:
                                  completed
                                    ? '1px solid rgba(64,61,136,0.18)'
                                    : '1px solid var(--border)',
                                opacity:
                                  locked
                                    ? 0.58
                                    : 1,
                              }}
                            >

                              <div className="flex items-start gap-3">

                                {/* STATUS ICON */}

                                <div
                                  className="mt-0.5 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background:
                                      completed
                                        ? 'var(--primary)'
                                        : locked
                                        ? 'var(--border)'
                                        : 'rgba(64,61,136,0.10)',
                                  }}
                                >
                                  {completed ? (
                                    <Check
                                      size={18}
                                      className="text-white"
                                    />
                                  ) : locked ? (
                                    <Lock
                                      size={16}
                                    />
                                  ) : (
                                    <Play
                                      size={16}
                                      style={{
                                        color:
                                          'var(--primary)',
                                      }}
                                    />
                                  )}
                                </div>


                                {/* CONTENT */}

                                <div className="flex-1 min-w-0">

                                  <div className="flex items-start justify-between gap-3">

                                    <div>

                                      <p
                                        className={`text-sm font-semibold ${
                                          completed
                                            ? 'line-through text-muted'
                                            : ''
                                        }`}
                                        style={{
                                          color:
                                            completed
                                              ? 'var(--text-muted)'
                                              : 'var(--text)',
                                        }}
                                      >
                                        {chapter.title}
                                      </p>

                                      {chapter.description && (
                                        <p className="text-xs text-muted mt-1">
                                          {chapter.description}
                                        </p>
                                      )}

                                    </div>

                                    {completed && (
                                      <span
                                        className="text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                                        style={{
                                          color:
                                            'var(--primary)',
                                        }}
                                      >
                                        <CircleCheck
                                          size={14}
                                        />
                                        Completed
                                      </span>
                                    )}

                                  </div>


                                  {/* META */}

                                  <div className="flex items-center gap-3 mt-3 flex-wrap">

                                    {chapter.duration && (
                                      <span className="flex items-center gap-1 text-xs text-muted">
                                        <Clock
                                          size={14}
                                        />
                                        {chapter.duration}
                                      </span>
                                    )}

                                    {chapter.youtubeUrl && (
                                      <span className="flex items-center gap-1 text-xs text-muted">
                                        <Youtube
                                          size={14}
                                        />
                                        Video lesson
                                      </span>
                                    )}

                                  </div>


                                  {/* ACTION */}

                                  <div className="mt-3">

                                    {locked ? (
                                      <div className="flex items-center gap-2 text-xs text-muted">
                                        <Lock
                                          size={14}
                                        />

                                        {chapterIndex >
                                        0
                                          ? 'Complete the previous chapter to unlock this lesson.'
                                          : 'Complete the previous skill to unlock this lesson.'}
                                      </div>
                                    ) : completed ? (
                                      <button
                                        onClick={() =>
                                          openChapter(
                                            chapter,
                                            false
                                          )
                                        }
                                        className="btn-secondary text-xs"
                                      >
                                        <RefreshCw
                                          size={14}
                                        />
                                        Review Lesson
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          openChapter(
                                            chapter,
                                            false
                                          )
                                        }
                                        className="btn-primary text-xs"
                                      >
                                        <Play
                                          size={14}
                                        />
                                        Start Lesson
                                        <ArrowRight
                                          size={14}
                                        />
                                      </button>
                                    )}

                                  </div>

                                </div>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        ))}


      {/* ======================================================
          BRUSH-UP TAB
      ====================================================== */}

      {activeTab === 'brushup' &&
        (brushUp.length === 0 ? (
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

            <div className="space-y-3">

              {brushUp.map(
                (chapter) => (
                  <div
                    key={
                      chapter._id
                    }
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      background:
                        'var(--bg)',
                    }}
                  >

                    {/* MANUAL BRUSH-UP CHECK */}

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
                      aria-label={
                        chapter.completed
                          ? 'Mark brush-up incomplete'
                          : 'Mark brush-up complete'
                      }
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
