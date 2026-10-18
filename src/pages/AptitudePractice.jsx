
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Search,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Target,
  Calculator,
  Lightbulb,
  MessageSquareText,
  BarChart3,
  BriefcaseBusiness,
  Code2,
  ArrowUpRight,
  AlertCircle,
  X,
} from 'lucide-react';

import { aptitudeAPI } from '../services/api';

const CATEGORIES = [
  {
    name: 'Quantitative Aptitude',
    description: 'Practise numerical problems, arithmetic and mathematical aptitude.',
    icon: Calculator,
  },
  {
    name: 'Logical Reasoning',
    description: 'Improve logical thinking, patterns and problem-solving skills.',
    icon: Lightbulb,
  },
  {
    name: 'Verbal Ability',
    description: 'Strengthen grammar, vocabulary and verbal reasoning.',
    icon: MessageSquareText,
  },
  {
    name: 'Data Interpretation',
    description: 'Learn to analyse charts, tables, graphs and numerical data.',
    icon: BarChart3,
  },
  {
    name: 'Placement Preparation',
    description: 'Prepare for placement assessments and interview rounds.',
    icon: BriefcaseBusiness,
  },
  {
    name: 'Technical Practice',
    description: 'Practise programming, SQL and technical interview questions.',
    icon: Code2,
  },
];

function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load practice resources. Please try again.'
  );
}

export default function AptitudePractice() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await aptitudeAPI.list();
      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : data?.resources || [];

      // The backend already returns active resources only.
      // This extra check keeps inactive resources hidden.
      setResources(
        items.filter((resource) => resource.active !== false)
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const filteredResources = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        resource.category === selectedCategory;

      const searchableText = [
        resource.title,
        resource.description,
        resource.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !searchText || searchableText.includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [resources, search, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return resources.reduce((counts, resource) => {
      counts[resource.category] =
        (counts[resource.category] || 0) + 1;

      return counts;
    }, {});
  }, [resources]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('All');
  };

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background:
            'linear-gradient(135deg, var(--primary), var(--primary-dark, #302b70))',
          color: '#ffffff',
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-4 h-32 w-32 rounded-full border border-white/10" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <Brain size={27} />
          </div>

          <p className="mb-2 text-sm font-medium text-white/80">
            CAREERCRAFT LEARNING CENTRE
          </p>

          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            Aptitude Practice
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            Build the skills you need for aptitude tests, technical
            assessments and campus placements. Choose a category and
            practise using trusted external learning resources.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2">
              <BookOpen size={16} />
              {resources.length} active resources
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2">
              <Target size={16} />
              6 practice categories
            </span>
          </div>
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />

          <p className="flex-1 text-sm">{error}</p>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* CATEGORY CARDS */}
      <section>
        <div className="mb-4">
          <h2
            className="text-xl font-bold font-heading"
            style={{ color: 'var(--text)' }}
          >
            Explore Categories
          </h2>

          <p className="mt-1 text-sm text-muted">
            Select a category to find relevant practice websites.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.name;
            const count = categoryCounts[category.name] || 0;

            return (
              <button
                key={category.name}
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    isSelected ? 'All' : category.name
                  )
                }
                aria-pressed={isSelected}
                className="card flex h-full items-start gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={
                  isSelected
                    ? {
                        borderColor: 'var(--primary)',
                        boxShadow: '0 0 0 1px var(--primary)',
                      }
                    : undefined
                }
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: isSelected
                      ? 'var(--primary)'
                      : 'var(--primary-light, rgba(99, 82, 180, 0.12))',
                    color: isSelected ? '#ffffff' : 'var(--primary)',
                  }}
                >
                  <Icon size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      {category.name}
                    </h3>

                    <span className="shrink-0 rounded-full border border-themed px-2 py-0.5 text-xs text-muted">
                      {count}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-5 text-muted">
                    {category.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search practice resources..."
              aria-label="Search practice resources"
              className="input w-full pl-10"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            aria-label="Filter by category"
            className="input w-full sm:w-64"
          >
            <option value="All">All Categories</option>

            {CATEGORIES.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadResources}
            disabled={loading}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </section>

      {/* RESOURCE LIST */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className="text-xl font-bold font-heading"
              style={{ color: 'var(--text)' }}
            >
              {selectedCategory === 'All'
                ? 'Available Practice Resources'
                : selectedCategory}
            </h2>

            <p className="mt-1 text-sm text-muted">
              {loading
                ? 'Loading resources...'
                : `${filteredResources.length} resource${
                    filteredResources.length === 1 ? '' : 's'
                  } available`}
            </p>
          </div>

          {(search || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost text-sm"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw
              size={28}
              className="animate-spin"
              style={{ color: 'var(--primary)' }}
            />

            <p className="mt-4 font-medium" style={{ color: 'var(--text)' }}>
              Loading practice resources
            </p>

            <p className="mt-1 text-sm text-muted">
              Please wait a moment.
            </p>
          </div>
        ) : error && resources.length === 0 ? (
          <div className="card flex flex-col items-center p-10 text-center">
            <AlertCircle size={38} className="text-red-500" />

            <h3
              className="mt-3 font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Resources could not be loaded
            </h3>

            <p className="mt-2 text-sm text-muted">
              Please check your connection and try again.
            </p>

            <button
              type="button"
              onClick={loadResources}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="card flex flex-col items-center p-12 text-center">
            <BookOpen
              size={42}
              className="text-muted"
            />

            <h3
              className="mt-4 text-lg font-semibold"
              style={{ color: 'var(--text)' }}
            >
              {resources.length === 0
                ? 'No practice resources yet'
                : 'No matching resources found'}
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              {resources.length === 0
                ? 'Practice resources will appear here once they are added and activated by the administrator.'
                : 'Try another category or search term to find the resources you need.'}
            </p>

            {(search || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary mt-4"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredResources.map((resource) => {
              const category = CATEGORIES.find(
                (item) => item.name === resource.category
              );

              const Icon = category?.icon || Brain;

              return (
                <article
                  key={resource._id || resource.id || resource.url}
                  className="card flex min-w-0 flex-col p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background:
                          'var(--primary-light, rgba(99, 82, 180, 0.12))',
                        color: 'var(--primary)',
                      }}
                    >
                      <Icon size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3
                        className="break-words font-semibold"
                        style={{ color: 'var(--text)' }}
                      >
                        {resource.title}
                      </h3>

                      <span className="mt-2 inline-flex rounded-full border border-themed px-2.5 py-1 text-xs text-muted">
                        {resource.category}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 flex-1 whitespace-pre-line break-words text-sm leading-6 text-muted">
                    {resource.description}
                  </p>

                  <div className="mt-5 border-t border-themed pt-4">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                    >
                      Practice Now
                      <ArrowUpRight size={17} />
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTNOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-themed p-4">
        <ExternalLink
          size={18}
          className="mt-0.5 shrink-0"
          style={{ color: 'var(--primary)' }}
        />

        <p className="text-sm leading-6 text-muted">
          Practice activities open on external websites. CareerCraft
          provides these links for learning and placement preparation;
          the external websites manage their own questions, tests and
          accounts.
        </p>
      </div>
    </div>
  );
}
