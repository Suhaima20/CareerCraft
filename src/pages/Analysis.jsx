import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

import { analysisAPI, onboardingAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner, ButtonSpinner } from '@/components/Spinner';
import { ErrorState } from '@/components/States';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

export default function Analysis() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // RUN SKILL GAP ANALYSIS
  // =========================================================

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const careerId = user?.activeCareerId;

      console.log('========================================');
      console.log('RUNNING SKILL GAP ANALYSIS');
      console.log('Career ID:', careerId);

      if (!careerId) {
        navigate('/onboarding/career');
        return;
      }

      const response = await analysisAPI.analyze(careerId);

      console.log('ANALYSIS API RESPONSE:');
      console.log(response.data);

      console.log(
        'Required Skills:',
        response.data?.requiredSkills
      );

      console.log(
        'Known Skills:',
        response.data?.knownSkills
      );

      console.log(
        'Missing Skills:',
        response.data?.missingSkills
      );

      console.log(
        'Backend Match Percentage:',
        response.data?.matchPercentage
      );

      console.log('========================================');

      setAnalysis(response.data);

    } catch (err) {
      console.error('Analysis error:', err);

      setError(
        err.response?.data?.error ||
        'Failed to run skill gap analysis'
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RUN ANALYSIS WHEN PAGE LOADS
  // =========================================================

  useEffect(() => {
    runAnalysis();
  }, []);

  // =========================================================
  // CONTINUE TO RECOMMENDATIONS
  // =========================================================

  const handleContinue = async () => {
    setSubmitting(true);

    try {
      await onboardingAPI.updateStep('recommendation');

      navigate('/onboarding/recommendation');

    } catch (err) {
      console.error(
        'Failed to continue:',
        err
      );

    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <FullPageSpinner
        label="Analyzing your skills..."
      />
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={runAnalysis}
      />
    );
  }

  // =========================================================
  // SAFELY READ BACKEND DATA
  // =========================================================

  const requiredSkills = Array.isArray(
    analysis?.requiredSkills
  )
    ? analysis.requiredSkills
    : [];

  const knownSkills = Array.isArray(
    analysis?.knownSkills
  )
    ? analysis.knownSkills
    : [];

  const missingSkills = Array.isArray(
    analysis?.missingSkills
  )
    ? analysis.missingSkills
    : [];

  // =========================================================
  // TOTAL REQUIRED SKILLS
  //
  // The backend's requiredSkills array is authoritative.
  // =========================================================

  const totalSkills = requiredSkills.length;

  // =========================================================
  // MATCH PERCENTAGE
  //
  // First use backend's matchPercentage.
  // If unavailable/invalid, calculate it.
  // =========================================================

  let matchPercent = Number(
    analysis?.matchPercentage ?? 0
  );

  const backendPercentageIsValid =
    Number.isFinite(matchPercent) &&
    matchPercent >= 0 &&
    matchPercent <= 100;

  if (!backendPercentageIsValid) {
    matchPercent =
      totalSkills > 0
        ? Math.round(
            (knownSkills.length / totalSkills) * 100
          )
        : 0;
  }

  /*
   * Safety fallback.
   *
   * If the backend accidentally sends 0 while
   * known skills are clearly present, calculate
   * the percentage from the actual arrays.
   *
   * Example:
   *
   * Required = 5
   * Known = 3
   *
   * 3 / 5 * 100 = 60%
   */

  if (
    matchPercent === 0 &&
    knownSkills.length > 0 &&
    totalSkills > 0
  ) {
    matchPercent = Math.round(
      (knownSkills.length / totalSkills) * 100
    );
  }

  // =========================================================
  // FINAL SAFETY
  // =========================================================

  matchPercent = Math.max(
    0,
    Math.min(100, matchPercent)
  );

  // =========================================================
  // CHART DATA
  // =========================================================

  const chartData = [
    {
      name: 'Known',
      value: knownSkills.length,
      color: '#3B7A57',
    },
    {
      name: 'Missing',
      value: missingSkills.length,
      color: '#B5444B',
    },
  ].filter(
    (item) => item.value > 0
  );

  // =========================================================
  // DEBUG
  // =========================================================

  console.log(
    '========== DISPLAY VALUES =========='
  );

  console.log(
    'Career:',
    analysis?.careerName
  );

  console.log(
    'Total required:',
    totalSkills
  );

  console.log(
    'Known:',
    knownSkills.length
  );

  console.log(
    'Missing:',
    missingSkills.length
  );

  console.log(
    'Match percentage:',
    matchPercent
  );

  console.log(
    'Known skill names:',
    knownSkills.map(
      (skill) => skill?.name
    )
  );

  console.log(
    'Missing skill names:',
    missingSkills.map(
      (skill) => skill?.name
    )
  );

  console.log(
    '===================================='
  );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="text-center mb-8">

        <div className="inline-flex items-center gap-2 badge-primary mb-3">
          Step 3 of 4
        </div>

        <h1
          className="text-3xl font-heading font-bold mb-2"
          style={{
            color: 'var(--text)',
          }}
        >
          Skill Gap Analysis
        </h1>

        <p className="text-muted">
          Here's how your skills match your chosen career.
        </p>

      </div>

      {/* ================================================= */}
      {/* MATCH SCORE */}
      {/* ================================================= */}

      <div className="card p-8 mb-6 text-center">

        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 relative">

          <svg
            className="absolute inset-0"
            viewBox="0 0 100 100"
          >

            {/* Background circle */}

            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />

            {/* Progress circle */}

            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${
                2 *
                Math.PI *
                44 *
                (1 - matchPercent / 100)
              }`}
              transform="rotate(-90 50 50)"
              style={{
                transition:
                  'stroke-dashoffset 1s ease',
              }}
            />

          </svg>

          <span
            className="text-3xl font-bold"
            style={{
              color: 'var(--text)',
            }}
          >
            {matchPercent}%
          </span>

        </div>

        <h2
          className="text-xl font-semibold mb-1"
          style={{
            color: 'var(--text)',
          }}
        >
          {analysis?.careerName || 'Selected Career'}
        </h2>

        <p className="text-sm text-muted">

          {matchPercent >= 75
            ? 'Great match!'
            : matchPercent >= 50
            ? "Good progress — you're getting there."
            : "You have some skills to learn, but that's what the roadmap is for."
          }

        </p>

      </div>

      {/* ================================================= */}
      {/* CHART + SUMMARY */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* ================================================= */}
        {/* SKILL DISTRIBUTION */}
        {/* ================================================= */}

        <div className="card p-6">

          <h3
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{
              color: 'var(--text)',
            }}
          >

            <BarChart3
              size={20}
              style={{
                color: 'var(--primary)',
              }}
            />

            Skill Distribution

          </h3>

          {chartData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height={200}
            >

              <PieChart>

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >

                  {chartData.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    )
                  )}

                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          ) : (

            <p className="text-muted text-sm text-center py-8">
              No skill data available
            </p>

          )}

        </div>

        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <div className="card p-6">

          <h3
            className="text-lg font-semibold mb-4"
            style={{
              color: 'var(--text)',
            }}
          >
            Summary
          </h3>

          <div className="space-y-3">

            {/* TOTAL REQUIRED */}

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted">
                Total Required Skills
              </span>

              <span
                className="text-sm font-medium"
                style={{
                  color: 'var(--text)',
                }}
              >
                {totalSkills}
              </span>

            </div>

            {/* KNOWN SKILLS */}

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted flex items-center gap-1">

                <CheckCircle2
                  size={16}
                  className="text-green-600"
                />

                Known Skills

              </span>

              <span className="text-sm font-medium text-green-600">
                {knownSkills.length}
              </span>

            </div>

            {/* MISSING SKILLS */}

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted flex items-center gap-1">

                <XCircle
                  size={16}
                  className="text-red-600"
                />

                Missing Skills

              </span>

              <span className="text-sm font-medium text-red-600">
                {missingSkills.length}
              </span>

            </div>

            {/* MATCH SCORE */}

            <div className="flex items-center justify-between">

              <span className="text-sm text-muted flex items-center gap-1">

                <TrendingUp
                  size={16}
                  style={{
                    color: 'var(--primary)',
                  }}
                />

                Match Score

              </span>

              <span
                className="text-sm font-medium"
                style={{
                  color: 'var(--primary)',
                }}
              >
                {matchPercent}%
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* KNOWN + MISSING SKILLS */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* ================================================= */}
        {/* KNOWN SKILLS */}
        {/* ================================================= */}

        <div className="card p-6">

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-500">

            <CheckCircle2 size={20} />

            Known Skills

          </h3>

          {knownSkills.length > 0 ? (

            <div className="flex flex-wrap gap-2">

              {knownSkills.map(
                (skill, index) => (

                  <span
                    key={
                      skill?._id ||
                      skill?.skillId ||
                      `known-${index}`
                    }
                    className="badge-success"
                  >
                    {skill?.name ||
                      skill?.skillName ||
                      'Unknown skill'}
                  </span>

                )
              )}

            </div>

          ) : (

            <p className="text-sm text-muted">
              No known skills detected yet.
            </p>

          )}

        </div>

        {/* ================================================= */}
        {/* MISSING SKILLS */}
        {/* ================================================= */}

        <div className="card p-6">

          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-700 dark:text-red-500">

            <XCircle size={20} />

            Missing Skills

          </h3>

          {missingSkills.length > 0 ? (

            <div className="flex flex-wrap gap-2">

              {missingSkills.map(
                (skill, index) => (

                  <span
                    key={
                      skill?._id ||
                      skill?.skillId ||
                      `missing-${index}`
                    }
                    className="badge-error"
                  >
                    {skill?.name ||
                      skill?.skillName ||
                      'Unknown skill'}
                  </span>

                )
              )}

            </div>

          ) : (

            <p className="text-sm text-muted">
              No missing skills — you're fully matched!
            </p>

          )}

        </div>

      </div>

      {/* ================================================= */}
      {/* NAVIGATION */}
      {/* ================================================= */}

      <div className="flex justify-between mt-8">

        <button
          onClick={() =>
            navigate(
              '/onboarding/skill-source'
            )
          }
          className="btn-ghost"
        >

          <ArrowLeft size={18} />

          Back

        </button>

        <button
          onClick={handleContinue}
          disabled={submitting}
          className="btn-primary"
        >

          {submitting ? (

            <ButtonSpinner />

          ) : (

            <>
              See Recommendations

              <ArrowRight size={18} />
            </>

          )}

        </button>

      </div>

    </div>
  );
}