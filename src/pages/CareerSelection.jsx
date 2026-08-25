import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Search,
  Check,
  Briefcase,
  ArrowRight,
  Target,
  FileText,
} from 'lucide-react';

import {
  careerAPI,
  resumeAPI,
  analysisAPI,
} from '@/services/api';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useDebounce } from '@/hooks/useHooks';

import {
  FullPageSpinner,
  ButtonSpinner,
} from '@/components/Spinner';

import { ErrorState } from '@/components/States';


export default function CareerSelection() {

  const { refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [careers, setCareers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [hasStoredResume, setHasStoredResume] = useState(false);

  const processingRef = useRef(false);

  const debouncedSearch = useDebounce(search, 300);


  // ============================================================
  // FETCH CAREERS
  // ============================================================

  const fetchCareers = async () => {

    setLoading(true);
    setError(null);

    try {

      const res = await careerAPI.list({
        q: debouncedSearch,
      });

      setCareers(
        res.data?.careers || []
      );

    } catch (err) {

      console.error(
        'Failed to load careers:',
        err
      );

      setError(
        err.response?.data?.error ||
        'Failed to load careers'
      );

    } finally {

      setLoading(false);

    }
  };


  // ============================================================
  // CHECK STORED RESUME
  // ============================================================

  const checkStoredResume = async () => {

    try {

      const res = await resumeAPI.mine();

      const resume =
        res.data?.resume ||
        res.data?.latestResume ||
        (
          Array.isArray(res.data?.resumes)
            ? res.data.resumes[0]
            : null
        );

      setHasStoredResume(!!resume);

    } catch (err) {

      console.warn(
        'Could not check stored resume:',
        err
      );

      setHasStoredResume(false);

    }
  };


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {

    fetchCareers();

  }, [debouncedSearch]);


  useEffect(() => {

    checkStoredResume();

  }, []);


  // ============================================================
  // SWITCH CAREER
  // ============================================================

  const handleSelect = async () => {

    if (!selected) {
      return;
    }

    if (
      submitting ||
      processingRef.current
    ) {
      return;
    }

    processingRef.current = true;

    setSubmitting(true);

    try {

      console.log(
        '========================================'
      );

      console.log(
        'SWITCHING CAREER'
      );

      console.log(
        'Selected career:',
        selected
      );

      console.log(
        'Career ID:',
        selected._id
      );

      console.log(
        '========================================'
      );


      // ========================================================
      // STEP 1
      // SWITCH CAREER
      // ========================================================

      /*
       * IMPORTANT:
       *
       * We ALWAYS use /careers/switch here.
       *
       * The backend determines whether the user has:
       *
       * - resume skills
       * - manually entered skills
       *
       * and returns:
       *
       * reuseExistingSkills
       */

      const switchResponse =
        await careerAPI.switchCareer(
          selected._id
        );


      const switchData =
        switchResponse.data || {};


      console.log(
        'Career switch response:',
        switchData
      );


      // ========================================================
      // STEP 2
      // CHECK BACKEND RESULT
      // ========================================================

      const reuseExistingSkills =
        switchData.reuseExistingSkills === true;

      const hasExistingResume =
        switchData.hasExistingResume === true;

      const hasManualSkills =
        switchData.hasManualSkills === true;


      console.log(
        '----------------------------------------'
      );

      console.log(
        'CAREER SWITCH RESULT'
      );

      console.log(
        'Has existing resume:',
        hasExistingResume
      );

      console.log(
        'Has manual skills:',
        hasManualSkills
      );

      console.log(
        'Reuse existing skills:',
        reuseExistingSkills
      );

      console.log(
        '----------------------------------------'
      );


      // ========================================================
      // STEP 3
      // REFRESH USER
      // ========================================================

      await refreshUser();


      // ========================================================
      // STEP 4
      // ANALYZE NEW CAREER
      // ========================================================

      /*
       * Existing skills are reused.
       *
       * We do NOT:
       *
       * - upload resume again
       * - go to skill-source
       * - enter manual skills again
       */

      if (
        reuseExistingSkills ||
        hasExistingResume ||
        hasManualSkills
      ) {

        console.log(
          'Existing skills found.'
        );

        console.log(
          'Analyzing new career using existing skills...'
        );


        const analysisResponse =
          await analysisAPI.analyze(
            selected._id
          );


        console.log(
          '========================================'
        );

        console.log(
          'NEW CAREER ANALYSIS COMPLETE'
        );

        console.log(
          analysisResponse.data
        );

        console.log(
          '========================================'
        );


        // ======================================================
        // STEP 5
        // GO DIRECTLY TO DASHBOARD
        // ======================================================

        toast.success(
          `Career switched to ${selected.name}! Your new career match has been calculated.`
        );


        console.log(
          'Navigating directly to dashboard...'
        );


        navigate(
          '/dashboard',
          {
            replace: true,
          }
        );


        return;
      }


      // ========================================================
      // STEP 6
      // NO EXISTING SKILLS
      // ========================================================

      /*
       * This is only for a genuinely new user who has
       * no resume and no manually entered skills.
       *
       * They can continue through normal onboarding.
       */

      console.log(
        'No existing skills found.'
      );

      toast.success(
        "Career selected! Let's identify your skills."
      );


      navigate(
        '/onboarding/skill-source'
      );


    } catch (err) {

      console.error(
        'Career switch error:',
        err
      );

      console.error(
        'Backend response:',
        err.response?.data
      );


      toast.error(
        err.response?.data?.error ||
        'Failed to switch career'
      );

    } finally {

      setSubmitting(false);

      processingRef.current = false;

    }

  };


  // ============================================================
  // LOADING
  // ============================================================

  if (
    loading &&
    careers.length === 0
  ) {

    return (
      <FullPageSpinner
        label="Loading careers..."
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
        onRetry={fetchCareers}
      />
    );

  }


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="text-center mb-8">

        <div className="inline-flex items-center gap-2 badge-primary mb-3">

          <Target size={14} />

          Switch Career

        </div>


        <h1
          className="text-3xl font-heading font-bold mb-2"
          style={{
            color: 'var(--text)',
          }}
        >
          Choose Your New Career
        </h1>


        <p className="text-muted">

          Choose another career. Your existing
          resume and skills will be reused
          automatically.

        </p>

      </div>


      {/* ====================================================== */}
      {/* RESUME NOTICE */}
      {/* ====================================================== */}

      {hasStoredResume && (

        <div
          className="card p-4 mb-6 flex items-center gap-4"
          style={{
            borderColor:
              'var(--primary)',
          }}
        >

          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background:
                'rgba(64,61,136,0.1)',
            }}
          >

            <FileText
              size={20}
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
              Your existing resume is stored
            </p>


            <p className="text-sm text-muted">

              You don't need to upload it again.
              Your existing extracted skills will
              be used for the new career analysis.

            </p>

          </div>

        </div>

      )}


      {/* ====================================================== */}
      {/* SEARCH */}
      {/* ====================================================== */}

      <div className="relative mb-6">

        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />


        <input
          type="text"
          className="input pl-10"
          placeholder="Search careers..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>


      {/* ====================================================== */}
      {/* CAREERS */}
      {/* ====================================================== */}

      {careers.length === 0 ? (

        <div className="text-center py-12 text-muted">

          No careers found.
          Try a different search.

        </div>

      ) : (

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">

          {careers.map((career) => (

            <button
              key={career._id}
              onClick={() =>
                setSelected(career)
              }
              disabled={submitting}
              className={`card p-5 text-left transition-all hover:shadow-lift ${
                selected?._id === career._id
                  ? 'ring-2'
                  : ''
              }`}
              style={
                selected?._id === career._id
                  ? {
                      borderColor:
                        'var(--primary)',
                      boxShadow:
                        '0 0 0 2px var(--primary)',
                    }
                  : {}
              }
            >

              <div className="flex items-start justify-between mb-3">

                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'rgba(64,61,136,0.1)',
                  }}
                >

                  <Briefcase
                    size={20}
                    style={{
                      color:
                        'var(--primary)',
                    }}
                  />

                </div>


                {selected?._id === career._id && (

                  <Check
                    size={20}
                    style={{
                      color:
                        'var(--primary)',
                    }}
                  />

                )}

              </div>


              <h3
                className="text-lg font-semibold mb-1"
                style={{
                  color:
                    'var(--text)',
                }}
              >

                {career.name}

              </h3>


              <p className="text-sm text-muted line-clamp-2">

                {career.description ||
                  'No description available'}

              </p>


              {career.requiredSkills &&
                career.requiredSkills.length > 0 && (

                <p className="text-xs text-muted mt-3">

                  {career.requiredSkills.length}
                  {' '}
                  required skills

                </p>

              )}

            </button>

          ))}

        </div>

      )}


      {/* ====================================================== */}
      {/* SWITCH BUTTON */}
      {/* ====================================================== */}

      <div className="flex justify-end">

        <button
          onClick={handleSelect}
          disabled={
            !selected ||
            submitting
          }
          className="btn-primary"
        >

          {submitting ? (

            <ButtonSpinner />

          ) : (

            <>

              Switch Career

              <ArrowRight
                size={18}
              />

            </>

          )}

        </button>

      </div>

    </div>
  );
}