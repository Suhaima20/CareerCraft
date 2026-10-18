import { useCallback, useEffect, useState } from 'react';
import {
  Brain,
  Plus,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  Power,
  RefreshCw,
  X,
  Save,
  BookOpen,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import { adminAPI } from '@/services/api';

const CATEGORIES = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
  'Data Interpretation',
  'Placement Preparation',
  'Technical Practice',
];

const EMPTY_FORM = {
  title: '',
  description: '',
  category: CATEGORIES[0],
  url: '',
  active: true,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

export default function AdminAptitudePractice() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response =
        await adminAPI.listAptitudeResources();

      const data = response.data;

      setResources(
        Array.isArray(data)
          ? data
          : data?.resources || []
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

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setError('');
    setSuccess('');
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (resource) => {
    setError('');
    setSuccess('');

    setEditingId(
      resource._id || resource.id
    );

    setForm({
      title: resource.title || '',
      description: resource.description || '',
      category: resource.category || CATEGORIES[0],
      url: resource.url || '',
      active: resource.active !== false,
    });

    setShowForm(true);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const title = form.title.trim();
    const description = form.description.trim();
    const url = form.url.trim();

    if (!title || !description || !url) {
      setError(
        'Please complete the title, description and URL.'
      );
      return;
    }

    try {
      const parsedUrl = new URL(url);

      if (
        !['http:', 'https:'].includes(
          parsedUrl.protocol
        )
      ) {
        setError(
          'Please enter a valid HTTP or HTTPS URL.'
        );
        return;
      }
    } catch {
      setError(
        'Please enter a valid website URL.'
      );
      return;
    }

    const payload = {
      title,
      description,
      category: form.category,
      url,
      active: Boolean(form.active),
    };

    setSubmitting(true);

    try {
      if (editingId) {
        await adminAPI.updateAptitudeResource(
          editingId,
          payload
        );

        setSuccess(
          'Aptitude resource updated successfully.'
        );
      } else {
        await adminAPI.createAptitudeResource(
          payload
        );

        setSuccess(
          'Aptitude resource added successfully.'
        );
      }

      resetForm();
      await loadResources();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (resource) => {
    const id = resource._id || resource.id;

    setError('');
    setSuccess('');

    try {
      await adminAPI.toggleAptitudeResource(id);

      setSuccess(
        resource.active
          ? 'Resource deactivated successfully.'
          : 'Resource activated successfully.'
      );

      await loadResources();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (resource) => {
    const id = resource._id || resource.id;

    const confirmed = window.confirm(
      `Delete "${resource.title}" permanently? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await adminAPI.deleteAptitudeResource(id);

      setSuccess(
        'Aptitude resource deleted successfully.'
      );

      await loadResources();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const filteredResources = resources.filter(
    (resource) => {
      const searchText = search
        .trim()
        .toLowerCase();

      const matchesSearch =
        !searchText ||
        resource.title
          ?.toLowerCase()
          .includes(searchText) ||
        resource.description
          ?.toLowerCase()
          .includes(searchText) ||
        resource.category
          ?.toLowerCase()
          .includes(searchText) ||
        resource.url
          ?.toLowerCase()
          .includes(searchText);

      const matchesCategory =
        categoryFilter === 'All' ||
        resource.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' &&
          resource.active !== false) ||
        (statusFilter === 'Inactive' &&
          resource.active === false);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    }
  );

  const activeCount = resources.filter(
    (resource) => resource.active !== false
  ).length;

  const inactiveCount =
    resources.length - activeCount;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
              }}
            >
              <Brain size={25} />
            </div>

            <div>
              <h1
                className="text-2xl font-bold font-heading"
                style={{ color: 'var(--text)' }}
              >
                Aptitude Practice
              </h1>

              <p className="text-sm text-muted mt-1">
                Manage external practice resources for students.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Resource
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm flex-1">
            {error}
          </p>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
        >
          <CheckCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm flex-1">
            {success}
          </p>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss success message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">
                Total Resources
              </p>

              <p
                className="mt-2 text-3xl font-bold"
                style={{ color: 'var(--text)' }}
              >
                {resources.length}
              </p>
            </div>

            <BookOpen
              size={27}
              style={{ color: 'var(--primary)' }}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">
                Active Resources
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {activeCount}
              </p>
            </div>

            <CheckCircle
              size={27}
              className="text-green-600"
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">
                Inactive Resources
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-600">
                {inactiveCount}
              </p>
            </div>

            <Power
              size={27}
              className="text-amber-600"
            />
          </div>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: 'var(--text)' }}
              >
                {editingId
                  ? 'Edit Resource'
                  : 'Add New Resource'}
              </h2>

              <p className="mt-1 text-sm text-muted">
                Enter the details of the external practice website.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="btn-ghost p-2"
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* TITLE */}
              <div>
                <label
                  htmlFor="aptitude-title"
                  className="mb-2 block text-sm font-medium"
                >
                  Resource Title *
                </label>

                <input
                  id="aptitude-title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Quantitative Aptitude Practice"
                  maxLength={150}
                  required
                  className="input w-full"
                />
              </div>

              {/* CATEGORY */}
              <div>
                <label
                  htmlFor="aptitude-category"
                  className="mb-2 block text-sm font-medium"
                >
                  Category *
                </label>

                <select
                  id="aptitude-category"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  required
                  className="input w-full"
                >
                  {CATEGORIES.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div className="md:col-span-2">
                <label
                  htmlFor="aptitude-url"
                  className="mb-2 block text-sm font-medium"
                >
                  Practice Website URL *
                </label>

                <input
                  id="aptitude-url"
                  name="url"
                  type="url"
                  value={form.url}
                  onChange={handleFormChange}
                  placeholder="https://example.com/practice"
                  required
                  className="input w-full"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="md:col-span-2">
                <label
                  htmlFor="aptitude-description"
                  className="mb-2 block text-sm font-medium"
                >
                  Description *
                </label>

                <textarea
                  id="aptitude-description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Briefly explain what students can practise on this website."
                  rows={4}
                  maxLength={1000}
                  required
                  className="input w-full resize-y"
                />

                <p className="mt-1 text-right text-xs text-muted">
                  {form.description.length}/1000 characters
                </p>
              </div>
            </div>

            {/* ACTIVE STATUS */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-themed p-4">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleFormChange}
                className="h-4 w-4 accent-current"
              />

              <span>
                <span
                  className="block text-sm font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  Active resource
                </span>

                <span className="mt-1 block text-xs text-muted">
                  Active resources are visible to logged-in students.
                </span>
              </span>
            </label>

            {/* FORM BUTTONS */}
            <div className="flex flex-wrap justify-end gap-3 border-t border-themed pt-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary inline-flex items-center gap-2"
              >
                {submitting ? (
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                {submitting
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Resource'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SEARCH AND FILTERS */}
      <section className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search resources..."
              aria-label="Search resources"
              className="input w-full pl-10"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            aria-label="Filter by category"
            className="input w-full"
          >
            <option value="All">
              All Categories
            </option>

            {CATEGORIES.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter by status"
            className="input w-full"
          >
            <option value="All">
              All Statuses
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>
          </select>
        </div>
      </section>

      {/* RESOURCE LIST */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--text)' }}
            >
              Practice Resources
            </h2>

            <p className="mt-1 text-sm text-muted">
              Showing {filteredResources.length} of{' '}
              {resources.length} resources
            </p>
          </div>

          <button
            type="button"
            onClick={loadResources}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw
              size={16}
              className={
                loading ? 'animate-spin' : ''
              }
            />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center gap-3 p-12">
            <RefreshCw
              size={22}
              className="animate-spin"
              style={{ color: 'var(--primary)' }}
            />

            <p className="text-sm text-muted">
              Loading aptitude resources...
            </p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <BookOpen
              size={42}
              className="mb-3 text-muted"
            />

            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--text)' }}
            >
              No resources found
            </h3>

            <p className="mt-2 max-w-md text-sm text-muted">
              {resources.length === 0
                ? 'Add your first aptitude practice resource to make it available for students.'
                : 'Try changing your search or filters.'}
            </p>

            {resources.length === 0 && (
              <button
                type="button"
                onClick={openCreateForm}
                className="btn-primary mt-5 inline-flex items-center gap-2"
              >
                <Plus size={17} />
                Add First Resource
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredResources.map((resource) => {
              const id =
                resource._id || resource.id;

              const isActive =
                resource.active !== false;

              return (
                <article
                  key={id}
                  className="card flex min-w-0 flex-col p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background:
                            'var(--primary)',
                          color: '#ffffff',
                        }}
                      >
                        <Brain size={21} />
                      </div>

                      <div className="min-w-0">
                        <h3
                          className="break-words font-semibold"
                          style={{
                            color: 'var(--text)',
                          }}
                        >
                          {resource.title}
                        </h3>

                        <span className="mt-2 inline-flex rounded-full border border-themed px-2.5 py-1 text-xs text-muted">
                          {resource.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isActive
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-line break-words text-sm text-muted">
                    {resource.description}
                  </p>

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-fit max-w-full items-center gap-2 break-all text-sm font-medium hover:underline"
                    style={{
                      color: 'var(--primary)',
                    }}
                  >
                    <ExternalLink
                      size={16}
                      className="shrink-0"
                    />

                    <span className="break-all">
                      {resource.url}
                    </span>
                  </a>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-themed pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(resource)
                      }
                      className="btn-secondary inline-flex items-center gap-2 text-sm"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggle(resource)
                      }
                      className="btn-secondary inline-flex items-center gap-2 text-sm"
                    >
                      <Power size={15} />

                      {isActive
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(resource)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}