import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  Briefcase,
} from 'lucide-react';

import {
  careerAPI,
  analysisAPI,
  onboardingAPI,
} from '@/services/api';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import {
  FullPageSpinner,
  ButtonSpinner,
} from '@/components/Spinner';
import { ErrorState } from '@/components/States';

export default function CareerRecommendation() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [switchingCareerId, setSwitchingCareerId] = useState(null);

  // ============================================================
  // LOAD CAREER RECOMMENDATIONS
  // ============================================================

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await careerAPI.getRecommended();

      setRecommendations(
        res.data?.recommendations || []
      );

      setCurrentMatch(
        res.data?.currentMatch || null
      );
    } catch (err) {
      console.error(
        'Failed to load career recommendations:',
        err
      );

      setError(
        err.response?.data?.error ||
        'Failed to load recommendations'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // ============================================================
  // CONTINUE WITH CURRENTLY SELECTED CAREER
  // ============================================================

  const handleContinueSelected = async () => {
    setSubmitting(true);

    try {
      /*
       * IMPORTANT:
       *
       * Do NOT go back to:
       *   skill-source
       *   resume-upload
       *   manual-skills
       *
       * The user's existing resume/skills are already stored.
       *
       * We only move forward to the roadmap.
       */

      await onboardingAPI.updateStep('roadmap');

      navigate('/onboarding/roadmap');

    } catch (err) {
      console.error(
        'Failed to continue with selected career:',
        err
      );

      toast.error(
        err.response?.data?.error ||
        'Failed to continue'
      );

    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // SWITCH TO ANOTHER CAREER
  // ============================================================

  const handleExploreRecommended = async (careerId) => {
    if (!careerId || submitting) {
      return;
    }

    setSubmitting(true);
    setSwitchingCareerId(careerId);

    try {
      console.log(
        '========================================'
      );

      console.log(
        'SWITCHING CAREER'
      );

      console.log(
        'New Career ID:',
        careerId
      );

      console.log(
        'Existing resume will be reused.'
      );

      console.log(
        '========================================'
      );

      // --------------------------------------------------------
      // STEP 1
      // Switch active career in backend
      // --------------------------------------------------------

      const switchResponse =
        await careerAPI.switchCareer(careerId);

      console.log(
        'Career switch response:',
        switchResponse.data
      );

      // --------------------------------------------------------
      // STEP 2
      // Refresh logged-in user
      // --------------------------------------------------------

      await refreshUser();

      // --------------------------------------------------------
      // STEP 3
      // IMPORTANT:
      //
      // Analyze the NEW career using the user's EXISTING
      // stored skills/resume.
      //
      // We DO NOT upload the resume again.
      // --------------------------------------------------------

      const analysisResponse =
        await analysisAPI.analyze(careerId);

      console.log(
        'New career analysis:',
        analysisResponse.data
      );

      // --------------------------------------------------------
      // STEP 4
      // Move directly to roadmap
      //
      // Do NOT navigate to skill-source or resume-upload.
      // --------------------------------------------------------

      await onboardingAPI.updateStep('roadmap');

      // --------------------------------------------------------
      // STEP 5
      // Success
      // --------------------------------------------------------

      toast.success(
        'Career switched successfully! Your existing resume and skills were reused.'
      );

      navigate('/onboarding/roadmap');

    } catch (err) {
      console.error(
        'Failed to switch career:',
        err
      );

      toast.error(
        err.response?.data?.error ||
        'Failed to switch career'
      );

    } finally {
      setSubmitting(false);
      setSwitchingCareerId(null);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <FullPageSpinner
        label="Finding recommendations..."
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
        onRetry={fetchRecommendations}
      />
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="text-center mb-8">

        <div className="inline-flex items-center gap-2 badge-primary mb-3">
          Step 4 of 4
        </div>

        <h1
          className="text-3xl font-heading font-bold mb-2"
          style={{ color: 'var(--text)' }}
        >
          Career Recommendations
        </h1>

        <p className="text-muted">
          Based on your existing skill profile, here are
          alternative careers you might consider.
        </p>

      </div>

      {/* ====================================================== */}
      {/* EXISTING RESUME NOTICE */}
      {/* ====================================================== */}

      <div
        className="card p-4 mb-6"
        style={{
          borderColor: 'rgba(64,61,136,0.2)',
          background: 'rgba(64,61,136,0.04)',
        }}
      >

        <div className="flex items-start gap-3">

          <Briefcase
            size={20}
            style={{
              color: 'var(--primary)',
              marginTop: '2px',
            }}
          />

          <div>

            <p
              className="font-medium"
              style={{ color: 'var(--text)' }}
            >
              Your existing resume will be reused
            </p>

            <p className="text-sm text-muted mt-1">
              Switching careers does not require you to
              upload your resume again. CareerCraft will
              analyze your existing stored skills against
              the new career.
            </p>

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* CURRENT CAREER */}
      {/* ====================================================== */}

      <div className="card p-6 mb-6">

        <div className="flex items-center gap-2 mb-2">

          <Briefcase
            size={20}
            style={{ color: 'var(--primary)' }}
          />

          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--text)' }}
          >
            Your Selected Career
          </h3>

        </div>

        <div className="flex items-center justify-between">

          <div>

            <p
              className="text-xl font-medium"
              style={{ color: 'var(--text)' }}
            >
              {
                currentMatch?.name ||
                currentMatch?.careerName ||
                user?.activeCareerName ||
                'Your Career'
              }
            </p>

            <p className="text-sm text-muted">
              Current match
            </p>

          </div>

          <div
            className="text-3xl font-bold"
            style={{ color: 'var(--primary)' }}
          >
            {currentMatch?.matchPercentage || 0}%
          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* RECOMMENDATIONS */}
      {/* ====================================================== */}

      {recommendations.length > 0 ? (

        <div className="space-y-4 mb-6">

          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'var(--text)' }}
          >

            <Star
              size={20}
              style={{ color: 'var(--primary)' }}
            />

            Recommended Alternatives

          </h3>

          {recommendations.map((rec) => {

            const isSwitching =
              switchingCareerId === rec._id;

            return (

              <div
                key={rec._id}
                className="card p-6"
              >

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                  <div className="flex-1">

                    <p
                      className="text-lg font-medium"
                      style={{ color: 'var(--text)' }}
                    >
                      {rec.name}
                    </p>

                    <p className="text-sm text-muted mb-2">
                      {
                        rec.description ||
                        'No description available'
                      }
                    </p>

                    <div className="flex items-center gap-3">

                      <div className="flex items-center gap-1">

                        <TrendingUp
                          size={16}
                          style={{
                            color: 'var(--primary)',
                          }}
                        />

                        <span
                          className="text-sm font-medium"
                          style={{
                            color: 'var(--primary)',
                          }}
                        >
                          {rec.matchPercentage}%
                          {' '}potential match
                        </span>

                      </div>

                      <span className="text-xs text-muted">
                        {rec.knownCount}
                        {' '}of{' '}
                        {rec.totalRequired}
                        {' '}skills matched
                      </span>

                    </div>

                  </div>

                  <button
                    onClick={() =>
                      handleExploreRecommended(rec._id)
                    }
                    disabled={submitting}
                    className="btn-outline"
                  >

                    {isSwitching ? (
                      <ButtonSpinner />
                    ) : (
                      <>
                        Explore This Career
                        <ArrowRight size={16} />
                      </>
                    )}

                  </button>

                </div>

              </div>

            );
          })}

        </div>

      ) : (

        <div className="card p-6 text-center mb-6">

          <p className="text-muted">
            No alternative recommendations available
            at this time. Your selected career is a
            great fit!
          </p>

        </div>

      )}

      {/* ====================================================== */}
      {/* FOOTER BUTTONS */}
      {/* ====================================================== */}

      <div className="flex justify-between mt-8">

        <button
          onClick={() =>
            navigate('/onboarding/analysis')
          }
          disabled={submitting}
          className="btn-ghost"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          onClick={handleContinueSelected}
          disabled={submitting}
          className="btn-primary"
        >

          {submitting ? (
            <ButtonSpinner />
          ) : (
            <>
              <Check size={18} />
              Continue With My Selected Career
            </>
          )}

        </button>

      </div>

    </div>
  );
}