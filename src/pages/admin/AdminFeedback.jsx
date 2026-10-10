import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  X,
  User,
  Mail,
  Calendar,
  Reply,
  Eye,
  ChevronDown,
} from 'lucide-react';

import { adminAPI } from '@/services/api';
import { useToast } from '@/components/Toast';
import { FullPageSpinner } from '@/components/Spinner';
import { ErrorState, EmptyState } from '@/components/States';
import { useDebounce } from '@/hooks/useHooks';
import { formatDateTime } from '@/utils/helpers';

const STATUS_OPTIONS = [
  'pending',
  'reviewed',
  'answered',
  'resolved',
];

const STATUS_ICONS = {
  pending: Clock,
  reviewed: AlertCircle,
  answered: Reply,
  resolved: CheckCircle,
};

const STATUS_COLORS = {
  pending: '#C99A2E',
  reviewed: '#403D88',
  answered: '#2563EB',
  resolved: '#3B7A57',
};

const STATUS_LABELS = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  answered: 'Answered',
  resolved: 'Resolved',
};

export default function AdminFeedback() {
  const toast = useToast();

  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [updating, setUpdating] = useState(null);

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await adminAPI.listFeedback({
        q: debouncedSearch,
        status: statusFilter,
        page,
        limit: 10,
      });

      setFeedback(res.data.feedback || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Failed to load feedback'
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  /*
   * Update feedback status.
   */
  const handleStatusChange = async (id, status) => {
    setUpdating(id);

    try {
      const response =
        await adminAPI.updateFeedbackStatus(id, status);

      const updatedFeedback =
        response?.data?.feedback || null;

      setFeedback((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                ...(updatedFeedback || {}),
                status,
              }
            : item
        )
      );

      if (selectedFeedback?._id === id) {
        setSelectedFeedback((prev) =>
          prev
            ? {
                ...prev,
                ...(updatedFeedback || {}),
                status,
              }
            : prev
        );
      }

      toast.success(
        `Feedback marked as ${
          STATUS_LABELS[status] || status
        }`
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Failed to update feedback status'
      );
    } finally {
      setUpdating(null);
    }
  };

  /*
   * Open feedback details.
   */
  const openFeedback = (item) => {
    setSelectedFeedback(item);
    setReplyText(item.adminReply || '');
  };

  /*
   * Close feedback details.
   */
  const closeFeedback = () => {
    if (replying) return;

    setSelectedFeedback(null);
    setReplyText('');
  };

  /*
   * Send admin reply.
   *
   * This calls:
   * PUT /api/admin/feedback/<id>/reply
   */
  const handleReply = async () => {
    if (!selectedFeedback) return;

    const trimmedReply = replyText.trim();

    if (!trimmedReply) {
      toast.error('Please enter a reply.');
      return;
    }

    if (trimmedReply.length > 2000) {
      toast.error(
        'Reply must be under 2000 characters.'
      );
      return;
    }

    setReplying(true);

    try {
      const response =
        await adminAPI.replyToFeedback(
          selectedFeedback._id,
          trimmedReply
        );

      const updatedFeedback =
        response?.data?.feedback || {
          ...selectedFeedback,
          adminReply: trimmedReply,
          status: 'answered',
        };

      const finalFeedback = {
        ...selectedFeedback,
        ...updatedFeedback,
        adminReply: trimmedReply,
        status:
          updatedFeedback.status || 'answered',
      };

      setFeedback((prev) =>
        prev.map((item) =>
          item._id === selectedFeedback._id
            ? {
                ...item,
                ...finalFeedback,
              }
            : item
        )
      );

      setSelectedFeedback(finalFeedback);

      toast.success(
        'Reply sent successfully.'
      );
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Failed to send reply'
      );
    } finally {
      setReplying(false);
    }
  };

  /*
   * Mark as reviewed.
   */
  const handleMarkReviewed = async () => {
    if (!selectedFeedback) return;

    await handleStatusChange(
      selectedFeedback._id,
      'reviewed'
    );
  };

  /*
   * Mark as resolved.
   */
  const handleMarkResolved = async () => {
    if (!selectedFeedback) return;

    await handleStatusChange(
      selectedFeedback._id,
      'resolved'
    );
  };

  if (loading && feedback.length === 0) {
    return (
      <FullPageSpinner label="Loading feedback..." />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchFeedback}
      />
    );
  }

  return (
    <div className="animate-fade-in">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    'var(--primary-soft, rgba(64,61,136,0.1))',
                }}
              >
                <MessageSquare
                  size={22}
                  style={{
                    color: 'var(--primary)',
                  }}
                />
              </div>

              <div>
                <h1
                  className="text-2xl font-heading font-bold"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  Feedback Management
                </h1>

                <p className="text-sm text-muted">
                  Review user feedback, respond when
                  necessary, and track resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ====================================================== */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="text"
              className="input pl-10"
              placeholder="Search by name, email or feedback..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              className="input lg:w-48 appearance-none pr-10"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">
                All Status
              </option>

              {STATUS_OPTIONS.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          FEEDBACK LIST
      ====================================================== */}
      {feedback.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback found"
          message={
            search || statusFilter
              ? 'No feedback matches your current filters.'
              : 'No user feedback has been submitted yet.'
          }
        />
      ) : (
        <div className="space-y-3">

          {feedback.map((item) => {
            const status =
              item.status || 'pending';

            const StatusIcon =
              STATUS_ICONS[status] || Clock;

            const statusColor =
              STATUS_COLORS[status] || '#57595B';

            return (
              <div
                key={item._id}
                className="card p-4 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                  {/* Feedback information */}
                  <div className="flex-1 min-w-0">

                    <div className="flex flex-wrap items-center gap-2 mb-2">

                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: `${statusColor}15`,
                          color: statusColor,
                        }}
                      >
                        <User size={15} />
                      </div>

                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: 'var(--text)',
                        }}
                      >
                        {item.name || 'Guest'}
                      </span>

                      {item.email && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Mail size={12} />
                          {item.email}
                        </span>
                      )}
                    </div>

                    <p
                      className="text-sm leading-6"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      {item.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-3">

                      <span className="text-xs text-muted flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDateTime(
                          item.createdAt
                        )}
                      </span>

                      {item.adminReply && (
                        <span className="text-xs flex items-center gap-1 text-secondary">
                          <Reply size={12} />
                          Admin replied
                        </span>
                      )}

                    </div>
                  </div>

                  {/* Status + View */}
                  <div className="flex items-center gap-2 flex-shrink-0">

                    <span
                      className="badge flex items-center gap-1"
                      style={{
                        background:
                          `${statusColor}15`,
                        color: statusColor,
                      }}
                    >
                      <StatusIcon size={12} />

                      {STATUS_LABELS[status] ||
                        status}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        openFeedback(item)
                      }
                      className="btn-secondary flex items-center gap-1.5"
                    >
                      <Eye size={15} />
                      View
                    </button>

                  </div>
                </div>

                {/* Status controls */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-themed">

                  <span className="text-xs text-muted mr-1">
                    Status:
                  </span>

                  {STATUS_OPTIONS.map(
                    (nextStatus) => (
                      <button
                        key={nextStatus}
                        type="button"
                        onClick={() =>
                          handleStatusChange(
                            item._id,
                            nextStatus
                          )
                        }
                        disabled={
                          updating === item._id ||
                          status === nextStatus
                        }
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                          status === nextStatus
                            ? 'font-semibold'
                            : 'hover:bg-bg'
                        }`}
                        style={
                          status === nextStatus
                            ? {
                                color:
                                  STATUS_COLORS[
                                    nextStatus
                                  ],
                                background:
                                  `${STATUS_COLORS[nextStatus]}12`,
                              }
                            : {
                                color:
                                  'var(--text-muted)',
                              }
                        }
                      >
                        {
                          STATUS_LABELS[
                            nextStatus
                          ]
                        }
                      </button>
                    )
                  )}

                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* =====================================================
          PAGINATION
      ====================================================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">

          <button
            type="button"
            onClick={() =>
              setPage((p) =>
                Math.max(1, p - 1)
              )
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
            type="button"
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

      {/* =====================================================
          FEEDBACK DETAILS / REPLY MODAL
      ====================================================== */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
          }}
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              closeFeedback();
            }
          }}
        >

          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{
              background: 'var(--surface)',
              border:
                '1px solid var(--border)',
            }}
          >

            {/* Modal header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5"
              style={{
                background:
                  'var(--surface)',
                borderBottom:
                  '1px solid var(--border)',
              }}
            >

              <div>
                <h2
                  className="text-lg font-heading font-bold"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  Feedback Details
                </h2>

                <p className="text-xs text-muted mt-1">
                  Review the message and respond
                  if necessary.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFeedback}
                disabled={replying}
                className="icon-button"
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            <div className="p-5 space-y-5">

              {/* User */}
              <div className="flex flex-wrap items-center gap-3">

                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      'var(--surface-soft)',
                    color:
                      'var(--primary)',
                  }}
                >
                  <User size={20} />
                </div>

                <div>

                  <p
                    className="font-semibold"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    {selectedFeedback.name ||
                      'Guest'}
                  </p>

                  {selectedFeedback.email && (
                    <p className="text-sm text-muted flex items-center gap-1">
                      <Mail size={13} />
                      {selectedFeedback.email}
                    </p>
                  )}

                </div>
              </div>

              {/* Submitted message */}
              <div
                className="rounded-xl p-4"
                style={{
                  background:
                    'var(--surface-soft)',
                }}
              >

                <div className="flex items-center justify-between gap-3 mb-2">

                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    User Feedback
                  </span>

                  <span className="text-xs text-muted">
                    {formatDateTime(
                      selectedFeedback.createdAt
                    )}
                  </span>

                </div>

                <p
                  className="text-sm leading-6 whitespace-pre-wrap"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  {selectedFeedback.message}
                </p>

              </div>

              {/* Current status */}
              <div>

                <label className="label">
                  Current Status
                </label>

                <div className="flex flex-wrap gap-2">

                  {STATUS_OPTIONS.map(
                    (status) => {
                      const Icon =
                        STATUS_ICONS[
                          status
                        ];

                      const active =
                        selectedFeedback.status ===
                        status;

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              selectedFeedback._id,
                              status
                            )
                          }
                          disabled={
                            updating ===
                              selectedFeedback._id ||
                            active
                          }
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
                          style={
                            active
                              ? {
                                  background:
                                    `${STATUS_COLORS[status]}15`,
                                  color:
                                    STATUS_COLORS[
                                      status
                                    ],
                                  fontWeight: 600,
                                }
                              : {
                                  background:
                                    'var(--surface-soft)',
                                  color:
                                    'var(--text-muted)',
                                }
                          }
                        >
                          <Icon size={14} />
                          {
                            STATUS_LABELS[
                              status
                            ]
                          }
                        </button>
                      );
                    }
                  )}

                </div>
              </div>

              {/* Existing admin reply */}
              {selectedFeedback.adminReply && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background:
                      'rgba(37,99,235,0.07)',
                    border:
                      '1px solid rgba(37,99,235,0.15)',
                  }}
                >

                  <div className="flex items-center gap-2 mb-2">

                    <Reply
                      size={15}
                      style={{
                        color:
                          'var(--secondary)',
                      }}
                    />

                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          'var(--secondary)',
                      }}
                    >
                      Previous Admin Reply
                    </span>

                  </div>

                  <p
                    className="text-sm leading-6 whitespace-pre-wrap"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    {
                      selectedFeedback.adminReply
                    }
                  </p>

                  {selectedFeedback.repliedAt && (
                    <p className="text-xs text-muted mt-2">
                      {formatDateTime(
                        selectedFeedback.repliedAt
                      )}
                    </p>
                  )}

                </div>
              )}

              {/* Reply */}
              <div>

                <div className="flex items-center justify-between mb-2">

                  <label className="label mb-0">
                    Admin Response
                  </label>

                  <span className="text-xs text-muted">
                    {replyText.length}/2000
                  </span>

                </div>

                <textarea
                  className="input min-h-[130px] resize-y"
                  placeholder="Write a response to the user when a reply is appropriate..."
                  value={replyText}
                  onChange={(e) =>
                    setReplyText(
                      e.target.value
                    )
                  }
                  maxLength={2000}
                  disabled={replying}
                />

                <p className="text-xs text-muted mt-2">
                  A reply will automatically mark
                  this feedback as Answered.
                </p>

              </div>

            </div>

            {/* Modal footer */}
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5"
              style={{
                borderTop:
                  '1px solid var(--border)',
              }}
            >

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={handleMarkReviewed}
                  disabled={
                    replying ||
                    selectedFeedback.status ===
                      'reviewed'
                  }
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Eye size={15} />
                  Mark Reviewed
                </button>

                <button
                  type="button"
                  onClick={handleMarkResolved}
                  disabled={
                    replying ||
                    selectedFeedback.status ===
                      'resolved'
                  }
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  Resolve
                </button>

              </div>

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={closeFeedback}
                  disabled={replying}
                  className="btn-secondary"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleReply}
                  disabled={
                    replying ||
                    !replyText.trim()
                  }
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Send size={15} />

                  {replying
                    ? 'Sending...'
                    : 'Send Reply'}
                </button>

              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}