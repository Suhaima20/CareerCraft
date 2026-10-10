import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  MapPin,
  TrendingUp,
  Code2,
  IndianRupee,
  RefreshCw,
  Target,
  Globe2,
  UserRound,
  ExternalLink,
  AlertCircle,
  Lock,
  Activity,
  ArrowUpRight,
  Database,
} from 'lucide-react';

import { marketAPI, careerAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';


// ============================================================
// FORMATTERS
// ============================================================

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  return Number(value).toLocaleString('en-IN');
}


function formatSalary(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return `₹${Number(value).toLocaleString('en-IN')}`;
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  accent = false,
}) {
  return (
    <div
      className="card p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: accent
          ? 'linear-gradient(135deg, rgba(64,61,136,0.10), rgba(64,61,136,0.03))'
          : 'var(--card)',
      }}
    >
      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {label}
          </p>

          <p
            className="text-2xl sm:text-3xl font-heading font-bold mt-2"
            style={{
              color: 'var(--text)',
            }}
          >
            {value}
          </p>

          {description && (
            <p className="text-xs text-muted mt-2">
              {description}
            </p>
          )}

        </div>

        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(64,61,136,0.10)',
          }}
        >
          <Icon
            size={21}
            style={{
              color: 'var(--primary)',
            }}
          />
        </div>

      </div>

    </div>
  );
}


// ============================================================
// RANKED INSIGHT CARD
// ============================================================

function InsightList({
  title,
  subtitle,
  icon: Icon,
  items,
  emptyMessage,
}) {
  const maxCount =
    items?.length
      ? Math.max(
          ...items.map((item) => Number(item.count) || 0),
          1
        )
      : 1;

  return (
    <div className="card p-5 sm:p-6">

      <div className="flex items-start justify-between gap-4 mb-5">

        <div className="flex items-center gap-3">

          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(64,61,136,0.10)',
            }}
          >
            <Icon
              size={19}
              style={{
                color: 'var(--primary)',
              }}
            />
          </div>

          <div>

            <h3
              className="font-heading font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              {title}
            </h3>

            {subtitle && (
              <p className="text-xs text-muted mt-0.5">
                {subtitle}
              </p>
            )}

          </div>

        </div>

        <Activity
          size={17}
          className="text-muted flex-shrink-0"
        />

      </div>


      {!items || items.length === 0 ? (

        <p className="text-sm text-muted">
          {emptyMessage || 'No data available.'}
        </p>

      ) : (

        <div className="space-y-4">

          {items.slice(0, 8).map((item, index) => {

            const count =
              Number(item.count) || 0;

            const percentage =
              Math.max(
                5,
                Math.round(
                  (count / maxCount) * 100
                )
              );

            return (
              <div
                key={`${item.name}-${index}`}
                className="group"
              >

                <div className="flex items-center justify-between gap-3 mb-1.5">

                  <div className="flex items-center gap-2 min-w-0">

                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{
                        background:
                          index === 0
                            ? 'var(--primary)'
                            : 'var(--bg)',
                        color:
                          index === 0
                            ? '#ffffff'
                            : 'var(--primary)',
                      }}
                    >
                      {index + 1}
                    </span>

                    <span
                      className="text-sm font-medium truncate"
                      style={{
                        color: 'var(--text)',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>

                  </div>

                  <span className="text-xs font-semibold text-muted flex-shrink-0">
                    {formatNumber(count)}
                  </span>

                </div>

                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{
                    background: 'var(--bg)',
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                      background: 'var(--primary)',
                      opacity: index === 0 ? 1 : 0.55,
                    }}
                  />
                </div>

              </div>
            );
          })}

        </div>

      )}

    </div>
  );
}


// ============================================================
// RECENT JOB CARD
// ============================================================

function RecentJobCard({
  job,
  isAuthenticated,
}) {
  return (
    <div
      className="p-4 sm:p-5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
      }}
    >

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="min-w-0 flex-1">

          <div className="flex items-start gap-3">

            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(64,61,136,0.08)',
              }}
            >
              <Briefcase
                size={17}
                style={{
                  color: 'var(--primary)',
                }}
              />
            </div>

            <div className="min-w-0">

              <h4
                className="font-semibold truncate"
                style={{
                  color: 'var(--text)',
                }}
                title={job.title}
              >
                {job.title || 'Job opportunity'}
              </h4>

              <p className="text-sm text-muted mt-1">
                {job.company || 'Unknown Company'}
              </p>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 ml-12">

            {job.location && (
              <span className="text-xs text-muted flex items-center gap-1">
                <MapPin size={13} />
                {job.location}
              </span>
            )}

            {job.category && (
              <span className="text-xs text-muted flex items-center gap-1">
                <Code2 size={13} />
                {job.category}
              </span>
            )}

          </div>

        </div>


        <div className="flex-shrink-0">

          {isAuthenticated ? (

            job.externalUrl ? (

              <a
                href={job.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                title="View original job"
              >
                <ExternalLink size={15} />
                View Job
              </a>

            ) : (

              <span className="text-xs text-muted">
                Link unavailable
              </span>

            )

          ) : (

            <a
              href="/login"
              className="btn-outline inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              title="Login to view job"
            >
              <Lock size={15} />
              Login to View
            </a>

          )}

        </div>

      </div>


      {!isAuthenticated && (
        <div
          className="mt-4 pt-3 flex items-center gap-2 text-xs text-muted"
          style={{
            borderTop: '1px solid var(--border)',
          }}
        >
          <Lock size={13} />

          <span>
            Login to access the original listing and application page.
          </span>

        </div>
      )}

    </div>
  );
}


// ============================================================
// DATA SOURCE BADGE
// ============================================================

function LiveBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        background: 'rgba(34,197,94,0.10)',
        color: '#15803d',
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: '#22c55e',
        }}
      />

      LIVE MARKET DATA
    </div>
  );
}


// ============================================================
// MAIN MARKET PAGE
// ============================================================

export default function Market() {

  const {
    user,
    loading: authLoading,
    isAuthenticated,
  } = useAuth();


  // ============================================================
  // ACTIVE TAB
  // ============================================================

  const [activeTab, setActiveTab] = useState('overall');


  // ============================================================
  // MARKET DATA
  // ============================================================

  const [overallMarket, setOverallMarket] = useState(null);
  const [careerMarket, setCareerMarket] = useState(null);
  const [activeCareer, setActiveCareer] = useState(null);


  // ============================================================
  // UI STATE
  // ============================================================

  const [loading, setLoading] = useState(true);
  const [careerLoading, setCareerLoading] = useState(false);
  const [error, setError] = useState(null);


  // ============================================================
  // LOAD OVERALL MARKET
  // ============================================================

  const loadOverallMarket = useCallback(async () => {

    try {

      const response =
        await marketAPI.getOverview();

      setOverallMarket(
        response.data
      );

      return response.data;

    } catch (err) {

      console.error(
        'Overall market error:',
        err
      );

      throw err;
    }

  }, []);


  // ============================================================
  // LOAD ACTIVE CAREER
  // ============================================================

  const loadActiveCareer = useCallback(async () => {

    if (!isAuthenticated) {
      setActiveCareer(null);
      return null;
    }

    try {

      const response =
        await careerAPI.getActiveCareer();

      const data =
        response.data;

      const career =
        data?.career ||
        data?.activeCareer ||
        data;

      setActiveCareer(
        career || null
      );

      return career || null;

    } catch (err) {

      console.error(
        'Active career error:',
        err
      );

      setActiveCareer(null);

      return null;
    }

  }, [isAuthenticated]);


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  const loadMarket = useCallback(async () => {

    setLoading(true);
    setError(null);

    try {

      await loadOverallMarket();

      if (isAuthenticated) {
        await loadActiveCareer();
      } else {
        setActiveCareer(null);
      }

    } catch (err) {

      setError(
        'Failed to load market intelligence.'
      );

    } finally {

      setLoading(false);

    }

  }, [
    loadOverallMarket,
    loadActiveCareer,
    isAuthenticated,
  ]);


  useEffect(() => {

    if (!authLoading) {
      loadMarket();
    }

  }, [
    authLoading,
    loadMarket,
  ]);


  // ============================================================
  // LOAD CAREER MARKET
  // ============================================================

  const loadCareerMarket = useCallback(async () => {

    if (!isAuthenticated) {
      return;
    }

    const careerName =
      activeCareer?.name ||
      activeCareer?.title ||
      user?.activeCareerName ||
      user?.careerName;

    if (!careerName) {
      setCareerMarket(null);
      return;
    }

    setCareerLoading(true);

    try {

      const response =
        await marketAPI.getCareerMarket(
          careerName
        );

      setCareerMarket(
        response.data
      );

    } catch (err) {

      console.error(
        'Career market error:',
        err
      );

      setCareerMarket(null);

    } finally {

      setCareerLoading(false);

    }

  }, [
    activeCareer,
    user,
    isAuthenticated,
  ]);


  useEffect(() => {

    if (
      isAuthenticated &&
      activeTab === 'career'
    ) {
      loadCareerMarket();
    }

  }, [
    activeTab,
    isAuthenticated,
    loadCareerMarket,
  ]);


  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = async () => {

    setError(null);

    if (activeTab === 'overall') {

      setLoading(true);

      try {

        await loadOverallMarket();

      } catch {

        setError(
          'Failed to refresh market intelligence.'
        );

      } finally {

        setLoading(false);

      }

    } else {

      await loadCareerMarket();

    }
  };


  // ============================================================
  // SELECT DATA
  // ============================================================

  const marketData = useMemo(() => {

    if (activeTab === 'career') {
      return careerMarket;
    }

    return overallMarket;

  }, [
    activeTab,
    overallMarket,
    careerMarket,
  ]);


  // ============================================================
  // AUTH LOADING
  // ============================================================

  if (authLoading) {

    return (
      <FullPageSpinner
        label="Loading market intelligence..."
      />
    );

  }


  // ============================================================
  // INITIAL LOADING
  // ============================================================

  if (loading) {

    return (
      <FullPageSpinner
        label="Loading market intelligence..."
      />
    );

  }


  // ============================================================
  // ERROR
  // ============================================================

  if (
    error &&
    !overallMarket
  ) {

    return (
      <ErrorState
        message={error}
        onRetry={loadMarket}
      />
    );

  }


  // ============================================================
  // ACTIVE CAREER
  // ============================================================

  const careerName =
    activeCareer?.name ||
    activeCareer?.title ||
    user?.activeCareerName ||
    user?.careerName ||
    null;


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="animate-fade-in pb-8">

      {/* ======================================================
          HERO
      ====================================================== */}

      <section
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(64,61,136,0.12), rgba(64,61,136,0.035))',
          border: '1px solid rgba(64,61,136,0.12)',
        }}
      >

        <div
          className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background:
              'rgba(64,61,136,0.08)',
            filter: 'blur(2px)',
          }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

          <div className="max-w-3xl">

            <div className="flex flex-wrap items-center gap-3 mb-4">

              <LiveBadge />

              <span className="text-xs text-muted flex items-center gap-1">
                <Database size={13} />
                CareerCraft job intelligence
              </span>

            </div>

            <div className="flex items-start gap-3">

              <div
                className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                }}
              >
                <BarChart3 size={24} />
              </div>

              <div>

                <h1
                  className="text-3xl sm:text-4xl font-heading font-bold"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  Market Intelligence
                </h1>

                <p className="text-muted mt-3 max-w-2xl leading-relaxed">
                  Understand current demand across India’s
                  technology and software job market, from
                  trending roles and skills to hiring locations
                  and listed salary ranges.
                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={handleRefresh}
            className="btn-outline inline-flex items-center justify-center gap-2 flex-shrink-0"
            disabled={
              activeTab === 'career'
                ? careerLoading
                : loading
            }
          >

            <RefreshCw
              size={16}
              className={
                (
                  activeTab === 'career'
                    ? careerLoading
                    : loading
                )
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh Data

          </button>

        </div>

      </section>


      {/* ======================================================
          GUEST NOTICE
      ====================================================== */}

      {!isAuthenticated && (

        <div
          className="card p-4 mb-6 flex items-start gap-3"
          style={{
            background:
              'rgba(64,61,136,0.05)',
            borderColor:
              'rgba(64,61,136,0.15)',
          }}
        >

          <Globe2
            size={20}
            className="flex-shrink-0 mt-0.5"
            style={{
              color: 'var(--primary)',
            }}
          />

          <div className="flex-1">

            <p
              className="font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Exploring as a guest
            </p>

            <p className="text-sm text-muted mt-1">
              You're viewing the overall Indian IT market.
              Log in to unlock market intelligence tailored
              to your selected career and access original job
              listings.
            </p>

            <a
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-semibold mt-3"
              style={{
                color: 'var(--primary)',
              }}
            >
              Unlock personalized intelligence
              <ArrowUpRight size={15} />
            </a>

          </div>

        </div>

      )}


      {/* ======================================================
          MARKET SWITCHER
      ====================================================== */}

      <div
        className="card p-2 mb-6"
        style={{
          background: 'var(--card)',
        }}
      >

        <div
          className={`grid gap-2 ${
            isAuthenticated
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >

          <button
            type="button"
            onClick={() => setActiveTab('overall')}
            className="p-4 rounded-xl text-left transition-all duration-200"
            style={{
              background:
                activeTab === 'overall'
                  ? 'var(--primary)'
                  : 'var(--bg)',

              color:
                activeTab === 'overall'
                  ? '#ffffff'
                  : 'var(--text)',
            }}
          >

            <div className="flex items-center gap-3">

              <Globe2 size={22} />

              <div>

                <p className="font-semibold">
                  Overall Indian IT Market
                </p>

                <p
                  className="text-xs mt-1"
                  style={{
                    opacity:
                      activeTab === 'overall'
                        ? 0.85
                        : 0.65,
                  }}
                >
                  Technology, software and IT
                  opportunities across India
                </p>

              </div>

            </div>

          </button>


          {isAuthenticated && (

            <button
              type="button"
              onClick={() => setActiveTab('career')}
              className="p-4 rounded-xl text-left transition-all duration-200"
              style={{
                background:
                  activeTab === 'career'
                    ? 'var(--primary)'
                    : 'var(--bg)',

                color:
                  activeTab === 'career'
                    ? '#ffffff'
                    : 'var(--text)',
              }}
            >

              <div className="flex items-center gap-3">

                <Target size={22} />

                <div>

                  <p className="font-semibold">
                    My Career Market
                  </p>

                  <p
                    className="text-xs mt-1"
                    style={{
                      opacity:
                        activeTab === 'career'
                          ? 0.85
                          : 0.65,
                    }}
                  >
                    {careerName
                      ? `Market demand for ${careerName}`
                      : 'Based on your selected career'}
                  </p>

                </div>

              </div>

            </button>

          )}

        </div>

      </div>


      {/* ======================================================
          CAREER WITHOUT SELECTION
      ====================================================== */}

      {activeTab === 'career' &&
        isAuthenticated &&
        !careerName && (

          <div className="card p-10 mb-6 text-center">

            <UserRound
              size={42}
              className="mx-auto mb-4"
              style={{
                color: 'var(--primary)',
              }}
            />

            <h3
              className="text-lg font-heading font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Select a career first
            </h3>

            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              Choose your dream career to view personalized
              market intelligence.
            </p>

          </div>

        )}


      {/* ======================================================
          CAREER LOADING
      ====================================================== */}

      {activeTab === 'career' &&
        careerLoading && (

          <div className="card p-10 mb-6 text-center">

            <RefreshCw
              size={30}
              className="mx-auto mb-3 animate-spin"
              style={{
                color: 'var(--primary)',
              }}
            />

            <p
              className="font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Analysing {careerName || 'your career'}...
            </p>

            <p className="text-sm text-muted mt-1">
              Preparing current market insights.
            </p>

          </div>

        )}


      {/* ======================================================
          MARKET CONTENT
      ====================================================== */}

      {marketData && (
        <>

          {/* DATA SOURCE */}

          <div
            className="card p-4 mb-6 flex items-start gap-3"
            style={{
              background:
                'rgba(64,61,136,0.04)',
            }}
          >

            <AlertCircle
              size={19}
              className="flex-shrink-0 mt-0.5"
              style={{
                color: 'var(--primary)',
              }}
            />

            <div>

              <p
                className="text-sm font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                How this market view is calculated
              </p>

              <p className="text-xs text-muted mt-1 leading-relaxed">
                {marketData.note ||
                  'Insights are calculated from job listings currently fetched by CareerCraft. They should be interpreted as a view of the collected listings, not a complete count of every job in the Indian market.'}
              </p>

            </div>

          </div>


          {/* MARKET HEADING */}

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">

            <div>

              <div className="flex items-center gap-2">

                {activeTab === 'career' ? (
                  <Target
                    size={20}
                    style={{
                      color: 'var(--primary)',
                    }}
                  />
                ) : (
                  <Globe2
                    size={20}
                    style={{
                      color: 'var(--primary)',
                    }}
                  />
                )}

                <h2
                  className="text-xl font-heading font-bold"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  {activeTab === 'career'
                    ? `${careerName || 'My Career'} Market`
                    : 'Overall Indian IT Market'}
                </h2>

              </div>

              <p className="text-sm text-muted mt-1">
                {activeTab === 'career'
                  ? `Current listings and demand signals related to ${careerName || 'your selected career'}.`
                  : 'Current demand signals from CareerCraft’s collected IT job listings.'}
              </p>

            </div>

          </div>


          {/* ==================================================
              STATISTICS
          ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            <StatCard
              icon={Briefcase}
              label="Jobs Analyzed"
              value={formatNumber(
                marketData.totalJobs
              )}
              description="Currently fetched listings"
              accent
            />

            <StatCard
              icon={TrendingUp}
              label="Roles Tracked"
              value={formatNumber(
                marketData.topRoles?.length || 0
              )}
              description="Top roles returned"
            />

            <StatCard
              icon={Code2}
              label="Skills Tracked"
              value={formatNumber(
                marketData.topSkills?.length || 0
              )}
              description="Skills found in listings"
            />

            <StatCard
              icon={MapPin}
              label="Locations Found"
              value={formatNumber(
                marketData.topLocations?.length || 0
              )}
              description="Locations represented"
            />

          </div>


          {/* ==================================================
              SALARY
          ================================================== */}

          {marketData.salary?.available && (

            <div className="card p-5 sm:p-6 mb-6">

              <div className="flex items-start gap-3 mb-5">

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      'rgba(64,61,136,0.10)',
                  }}
                >

                  <IndianRupee
                    size={19}
                    style={{
                      color: 'var(--primary)',
                    }}
                  />

                </div>

                <div>

                  <h3
                    className="font-heading font-semibold"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    Listed Salary Signals
                  </h3>

                  <p className="text-xs text-muted mt-0.5">
                    Salary information available in the collected listings
                  </p>

                </div>

              </div>


              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--bg)',
                  }}
                >

                  <p className="text-xs text-muted">
                    Lowest listed
                  </p>

                  <p
                    className="text-xl font-heading font-bold mt-1"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    {formatSalary(
                      marketData.salary.min
                    ) || '—'}
                  </p>

                </div>


                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--bg)',
                  }}
                >

                  <p className="text-xs text-muted">
                    Highest listed
                  </p>

                  <p
                    className="text-xl font-heading font-bold mt-1"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    {formatSalary(
                      marketData.salary.max
                    ) || '—'}
                  </p>

                </div>


                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--bg)',
                  }}
                >

                  <p className="text-xs text-muted">
                    Average listed range
                  </p>

                  <p
                    className="text-xl font-heading font-bold mt-1"
                    style={{
                      color: 'var(--text)',
                    }}
                  >

                    {marketData.salary.averageMin !== null
                      ? formatSalary(
                          marketData.salary.averageMin
                        )
                      : '—'}

                    {' – '}

                    {marketData.salary.averageMax !== null
                      ? formatSalary(
                          marketData.salary.averageMax
                        )
                      : '—'}

                  </p>

                </div>

              </div>

            </div>

          )}


          {/* ==================================================
              INSIGHTS
          ================================================== */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

            <InsightList
              title="Trending Job Roles"
              subtitle="Most frequently represented roles"
              icon={TrendingUp}
              items={marketData.topRoles}
              emptyMessage="No role data available."
            />

            <InsightList
              title="In-Demand Skills"
              subtitle="Skills appearing most often"
              icon={Code2}
              items={marketData.topSkills}
              emptyMessage="No skill data available."
            />

            <InsightList
              title="Hiring Locations"
              subtitle="Locations represented in listings"
              icon={MapPin}
              items={marketData.topLocations}
              emptyMessage="No location data available."
            />

            <InsightList
              title="Companies Hiring"
              subtitle="Companies represented in collected listings"
              icon={Building2}
              items={marketData.topCompanies}
              emptyMessage="No company data available."
            />

          </div>


          {/* ==================================================
              RECENT JOBS
          ================================================== */}

          <div className="card p-5 sm:p-6">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

              <div>

                <div className="flex items-center gap-2">

                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        'rgba(64,61,136,0.10)',
                    }}
                  >
                    <Briefcase
                      size={17}
                      style={{
                        color: 'var(--primary)',
                      }}
                    />
                  </div>

                  <h3
                    className="font-heading font-semibold"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    Recent Opportunities
                  </h3>

                </div>

                <p className="text-xs text-muted mt-2 ml-11">
                  Latest listings included in this market view
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-muted">

                <Activity size={14} />

                Updated from current listings

              </div>

            </div>


            {marketData.jobs &&
            marketData.jobs.length > 0 ? (

              <div className="space-y-3">

                {marketData.jobs
                  .slice(0, 10)
                  .map((job, index) => (

                    <RecentJobCard
                      key={
                        job.id ||
                        job._id ||
                        index
                      }
                      job={job}
                      isAuthenticated={isAuthenticated}
                    />

                  ))}

              </div>

            ) : (

              <EmptyState
                icon={Briefcase}
                title="No matching jobs found"
                message={
                  activeTab === 'career'
                    ? `CareerCraft could not find current listings matching ${careerName || 'your selected career'}.`
                    : 'No current IT job listings are available.'
                }
              />

            )}

          </div>

        </>

      )}

    </div>
  );
}