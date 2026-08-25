import { useState, useEffect } from 'react';
import {
  Briefcase,
  ExternalLink,
  MapPin,
  Building2,
  Search,
  Calendar,
} from 'lucide-react';

import { jobAPI } from '@/services/api';
import { useDebounce } from '@/hooks/useHooks';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import { formatDate } from '@/utils/helpers';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await jobAPI.list({
        q: debouncedSearch,
        page,
        limit: 10,
      });

      setJobs(res.data.jobs || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to load jobs'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [debouncedSearch, page]);

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase
            size={24}
            style={{ color: 'var(--primary)' }}
          />

          <h1
            className="text-2xl font-heading font-bold"
            style={{ color: 'var(--text)' }}
          >
            Relevant Jobs
          </h1>
        </div>

        <p className="text-muted">
          External job opportunities related to your career path.
          Click to apply on the original site.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />

        <input
          type="text"
          className="input pl-10"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Loading */}
      {loading ? (
        <FullPageSpinner label="Loading jobs..." />
      ) : error ? (

        /* Error */
        <ErrorState
          message={error}
          onRetry={fetchJobs}
        />

      ) : jobs.length === 0 ? (

        /* Empty */
        <EmptyState
          icon={Briefcase}
          title="No jobs available"
          message="External job data is currently unavailable. This feature requires a job data provider to be configured. Check back later."
        />

      ) : (

        /* Jobs */
        <>
          <div className="space-y-4">

            {jobs.map((job) => {

              /*
               * Adzuna normally provides `id`.
               * Older/local job objects may use `_id`.
               * The fallback ensures React always receives
               * a unique key.
               */
              const jobKey =
                job.id ||
                job._id ||
                `${job.title || 'job'}-${job.company || 'company'}-${job.location || 'location'}`;

              return (
                <div
                  key={jobKey}
                  className="card p-5 hover:shadow-soft transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">

                    {/* Job Information */}
                    <div className="flex-1">

                      {/* Title + Category */}
                      <div className="flex items-center gap-2 mb-2">

                        <h3
                          className="text-lg font-semibold"
                          style={{ color: 'var(--text)' }}
                        >
                          {job.title}
                        </h3>

                        {job.category && (
                          <span className="badge-primary">
                            {job.category}
                          </span>
                        )}

                      </div>

                      {/* Company / Location / Date */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted">

                        {job.company && (
                          <span className="flex items-center gap-1">
                            <Building2 size={14} />
                            {job.company}
                          </span>
                        )}

                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {job.location}
                          </span>
                        )}

                        {job.postedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(job.postedDate)}
                          </span>
                        )}

                      </div>

                      {/* Skills */}
                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">

                          {job.skills.map((skill, index) => (
                            <span
                              key={`${skill}-${index}`}
                              className="badge-primary text-xs"
                            >
                              {skill}
                            </span>
                          ))}

                        </div>
                      )}

                      {/* Salary */}
                      {job.salary && (
                        <p
                          className="text-sm mt-2"
                          style={{ color: 'var(--primary)' }}
                        >
                          {job.salary}
                        </p>
                      )}

                    </div>

                    {/* Apply Button */}
                    {job.externalUrl && (
                      <a
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                      >
                        <ExternalLink size={16} />
                        Apply
                      </a>
                    )}

                  </div>
                </div>
              );
            })}

          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">

              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>

              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={page === totalPages}
                className="btn-secondary"
              >
                Next
              </button>

            </div>
          )}

        </>
      )}

    </div>
  );
}