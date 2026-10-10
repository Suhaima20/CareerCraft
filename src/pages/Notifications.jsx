import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Building2,
  MapPin,
  Briefcase,
  BookOpen,
  Clock,
  AlarmClock,
} from 'lucide-react';

import { useNotifications } from '@/context/NotificationContext';
import { FullPageSpinner } from '@/components/Spinner';
import { EmptyState } from '@/components/States';
import { studyReminderAPI } from '@/services/api';
import { timeAgo } from '@/utils/helpers';

export default function Notifications() {

  const {
    notifications,
    loading,
    markAllRead,
    markRead,
    fetchNotifications,
  } = useNotifications();

  const [snoozingId, setSnoozingId] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);


  // ============================================================
  // SNOOZE STUDY REMINDER
  // ============================================================

  const handleSnooze = async (notification) => {

    if (!notification?.reminderId) {
      return;
    }

    try {

      setSnoozingId(notification._id);

      await studyReminderAPI.snooze(
        notification.reminderId
      );

      await markRead(notification._id);

      await fetchNotifications();

    } catch (error) {

      console.error(
        'Failed to snooze study reminder:',
        error
      );

    } finally {

      setSnoozingId(null);

    }
  };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading && notifications.length === 0) {

    return (
      <FullPageSpinner
        label="Loading notifications..."
      />
    );

  }


  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="animate-fade-in">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-2">

          <Bell
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
            Notifications
          </h1>

        </div>


        {notifications.some(
          (n) => !n.read
        ) && (

          <button
            onClick={markAllRead}
            className="btn-secondary flex items-center gap-2"
          >

            <CheckCheck size={16} />

            Mark All Read

          </button>

        )}

      </div>


      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {notifications.length === 0 ? (

        <EmptyState
          icon={Bell}
          title="No notifications"
          message="You're all caught up! New job and study reminders will appear here."
        />

      ) : (

        /* ===================================================
           NOTIFICATION LIST
        ==================================================== */

        <div className="space-y-3">

          {notifications.map((n) => {

            const isStudyReminder =
              n.type === 'study_reminder';


            return (

              <div
                key={n._id}
                className={`card p-5 transition-shadow hover:shadow-soft ${
                  !n.read
                    ? 'border-l-4'
                    : ''
                }`}
                style={
                  !n.read
                    ? {
                        borderLeftColor:
                          'var(--primary)',
                      }
                    : {}
                }
              >

                <div className="flex items-start gap-4">


                  {/* =================================================
                      ICON
                  ================================================== */}

                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      width: '42px',
                      height: '42px',
                      background:
                        'var(--primary-light)',
                      color:
                        'var(--primary)',
                    }}
                  >

                    {isStudyReminder ? (
                      <BookOpen size={20} />
                    ) : (
                      <Briefcase size={20} />
                    )}

                  </div>


                  {/* =================================================
                      CONTENT
                  ================================================== */}

                  <div className="flex-1 min-w-0">


                    {/* =================================================
                        TITLE + UNREAD
                    ================================================== */}

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h3
                          className="text-base font-semibold"
                          style={{
                            color:
                              'var(--text)',
                          }}
                        >

                          {isStudyReminder
                            ? (
                                n.title ||
                                'Study Reminder'
                              )
                            : (
                                n.jobTitle ||
                                'New job opportunity'
                              )}

                        </h3>


                        <p className="text-sm text-muted mt-1">

                          {n.message ||
                            (
                              isStudyReminder
                                ? 'It is time to continue your learning.'
                                : 'A new job opportunity is available for your career.'
                            )}

                        </p>

                      </div>


                      {/* =================================================
                          UNREAD INDICATOR
                      ================================================== */}

                      {!n.read && (

                        <span
                          className="flex-shrink-0 text-xs font-medium"
                          style={{
                            color:
                              'var(--primary)',
                          }}
                        >
                          New
                        </span>

                      )}

                    </div>


                    {/* =================================================
                        STUDY REMINDER INFORMATION
                    ================================================== */}

                    {isStudyReminder ? (

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted">

                        <span className="flex items-center gap-1.5">

                          <Clock size={14} />

                          Study Reminder

                        </span>

                        <span className="flex items-center gap-1.5">

                          <AlarmClock size={14} />

                          Snooze available

                        </span>

                      </div>

                    ) : (

                      /* =================================================
                          JOB COMPANY + LOCATION
                      ================================================== */

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted">

                        {n.company && (

                          <span className="flex items-center gap-1.5">

                            <Building2 size={14} />

                            {n.company}

                          </span>

                        )}

                        {n.location && (

                          <span className="flex items-center gap-1.5">

                            <MapPin size={14} />

                            {n.location}

                          </span>

                        )}

                      </div>

                    )}


                    {/* =================================================
                        FOOTER
                    ================================================== */}

                    <div className="flex flex-wrap items-center gap-3 mt-4">


                      {/* =================================================
                          STUDY REMINDER ACTIONS
                      ================================================== */}

                      {isStudyReminder ? (

                        <>

                          {/* Snooze */}

                          <button
                            onClick={() =>
                              handleSnooze(n)
                            }
                            disabled={
                              snoozingId ===
                              n._id
                            }
                            className="btn-primary flex items-center gap-2"
                          >

                            <AlarmClock
                              size={15}
                            />

                            {snoozingId ===
                            n._id
                              ? 'Snoozing...'
                              : 'Snooze'
                            }

                          </button>


                          {/* Mark read */}

                          {!n.read && (

                            <button
                              onClick={() =>
                                markRead(
                                  n._id
                                )
                              }
                              className="text-xs link"
                            >
                              Mark read
                            </button>

                          )}

                        </>

                      ) : (

                        /* =================================================
                            JOB ACTIONS
                        ================================================== */

                        <>

                          {n.externalUrl && (

                            <a
                              href={
                                n.externalUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary flex items-center gap-2"
                              onClick={() => {

                                if (!n.read) {

                                  markRead(
                                    n._id
                                  );

                                }

                              }}
                            >

                              <ExternalLink
                                size={15}
                              />

                              View Job

                            </a>

                          )}


                          {!n.read && (

                            <button
                              onClick={() =>
                                markRead(
                                  n._id
                                )
                              }
                              className="text-xs link"
                            >
                              Mark read
                            </button>

                          )}

                        </>

                      )}


                      {/* =================================================
                          TIME
                      ================================================== */}

                      <span className="text-xs text-muted">

                        {timeAgo(
                          n.createdAt
                        )}

                      </span>

                    </div>

                  </div>

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>
  );
}
