import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CalendarDays,
  Check,
  Clock3,
  Mail,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { studyReminderAPI, careerAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { FullPageSpinner } from '../components/Spinner';


const DEFAULT_FORM = {
  time: '19:00',
  repeatType: 'daily',
  repeatDays: [],
  channels: {
    inApp: true,
    email: false,
  },
  snoozeMinutes: 10,
  enabled: true,
};


const CUSTOM_DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];


function formatTime(time) {
  if (!time) return '--:--';

  const [hour, minute] = time.split(':').map(Number);

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}


function getRepeatLabel(reminder) {
  if (reminder.repeatType === 'once') {
    return 'Once';
  }

  if (reminder.repeatType === 'daily') {
    return 'Every day';
  }

  if (reminder.repeatType === 'weekdays') {
    return 'Weekdays';
  }

  if (reminder.repeatType === 'custom') {
    const days = reminder.repeatDays || [];

    if (!days.length) {
      return 'Custom days';
    }

    return days
      .map((day) =>
        day.charAt(0).toUpperCase() + day.slice(1, 3)
      )
      .join(' • ');
  }

  return 'Custom';
}


function getCareerName(reminder, activeCareer) {
  return (
    reminder?.careerName ||
    activeCareer?.name ||
    activeCareer?.title ||
    'your selected career'
  );
}


export default function StudyReminders() {
  const toast = useToast();

  const [reminders, setReminders] = useState([]);
  const [activeCareer, setActiveCareer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(DEFAULT_FORM);


  const isEditing = Boolean(editingId);


  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [reminderResponse, careerResponse] =
        await Promise.all([
          studyReminderAPI.list(),
          careerAPI.getActiveCareer(),
        ]);

      setReminders(
        reminderResponse.data?.reminders || []
      );

      setActiveCareer(
        careerResponse.data?.career ||
        careerResponse.data?.activeCareer ||
        null
      );
    } catch (error) {
      console.error(
        'Study reminders loading error:',
        error
      );

      toast.error(
        error.response?.data?.error ||
        'Failed to load study reminders.'
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    loadData();
  }, [loadData]);


  const careerName = useMemo(
    () =>
      activeCareer?.name ||
      activeCareer?.title ||
      'your selected career',
    [activeCareer]
  );


  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      channels: {
        ...DEFAULT_FORM.channels,
      },
      repeatDays: [],
    });

    setEditingId(null);
  };


  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };


  const openEditForm = (reminder) => {
    setEditingId(reminder._id);

    setForm({
      time: reminder.time || '19:00',

      repeatType:
        reminder.repeatType || 'daily',

      repeatDays:
        reminder.repeatDays || [],

      channels: {
        inApp:
          reminder.channels?.inApp ?? true,

        email:
          reminder.channels?.email ?? false,
      },

      snoozeMinutes:
        reminder.snoozeMinutes || 10,

      enabled:
        reminder.enabled ?? true,
    });

    setShowForm(true);
  };


  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };


  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  const toggleChannel = (channel) => {
    setForm((previous) => ({
      ...previous,
      channels: {
        ...previous.channels,
        [channel]:
          !previous.channels[channel],
      },
    }));
  };


  const toggleCustomDay = (day) => {
    setForm((previous) => {
      const exists =
        previous.repeatDays.includes(day);

      return {
        ...previous,

        repeatDays: exists
          ? previous.repeatDays.filter(
              (item) => item !== day
            )
          : [
              ...previous.repeatDays,
              day,
            ],
      };
    });
  };


  const validateForm = () => {
    const hasChannel =
      Object.values(form.channels).some(Boolean);

    if (!hasChannel) {
      toast.error(
        'Select at least one notification channel.'
      );

      return false;
    }

    if (
      form.repeatType === 'custom' &&
      form.repeatDays.length === 0
    ) {
      toast.error(
        'Select at least one custom day.'
      );

      return false;
    }

    return true;
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions()
          .timeZone || 'Asia/Kolkata';

      const payload = {
        time: form.time,

        timezone,

        repeatType:
          form.repeatType,

        repeatDays:
          form.repeatType === 'custom'
            ? form.repeatDays
            : [],

        channels: form.channels,

        snoozeMinutes:
          Number(form.snoozeMinutes),

        enabled:
          form.enabled,

        careerId:
          activeCareer?._id ||
          activeCareer?.id ||
          undefined,
      };


      if (isEditing) {
        const response =
          await studyReminderAPI.update(
            editingId,
            payload
          );

        const updated =
          response.data?.reminder;

        if (updated) {
          setReminders((previous) =>
            previous.map((item) =>
              item._id === editingId
                ? updated
                : item
            )
          );
        }

        toast.success(
          'Study reminder updated.'
        );
      } else {
        const response =
          await studyReminderAPI.create(
            payload
          );

        const created =
          response.data?.reminder;

        if (created) {
          setReminders((previous) => [
            created,
            ...previous,
          ]);
        }

        toast.success(
          'Study reminder created.'
        );
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error(
        'Study reminder save error:',
        error
      );

      toast.error(
        error.response?.data?.error ||
        'Failed to save study reminder.'
      );
    } finally {
      setSaving(false);
    }
  };


  const handleToggle = async (reminder) => {
    try {
      const response =
        await studyReminderAPI.toggle(
          reminder._id
        );

      const updated =
        response.data?.reminder;

      if (updated) {
        setReminders((previous) =>
          previous.map((item) =>
            item._id === reminder._id
              ? updated
              : item
          )
        );
      }

      toast.success(
        updated?.enabled
          ? 'Reminder enabled.'
          : 'Reminder disabled.'
      );
    } catch (error) {
      console.error(
        'Study reminder toggle error:',
        error
      );

      toast.error(
        error.response?.data?.error ||
        'Failed to update reminder.'
      );
    }
  };


  const handleDelete = async (reminder) => {
    const confirmed =
      window.confirm(
        'Delete this study reminder?'
      );

    if (!confirmed) {
      return;
    }

    try {
      await studyReminderAPI.delete(
        reminder._id
      );

      setReminders((previous) =>
        previous.filter(
          (item) =>
            item._id !== reminder._id
        )
      );

      toast.success(
        'Study reminder deleted.'
      );
    } catch (error) {
      console.error(
        'Study reminder delete error:',
        error
      );

      toast.error(
        error.response?.data?.error ||
        'Failed to delete reminder.'
      );
    }
  };


  if (loading) {
    return <FullPageSpinner />;
  }


  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Bell size={22} />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Study Reminders
              </h1>

            </div>

            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Set reminders to stay consistent with
              your career skill development.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <CalendarDays size={14} />

              Current career:
              <span className="font-semibold">
                {careerName}
              </span>
            </div>
          </div>


          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Reminder
          </button>

        </div>


        {/* ================================================== */}
        {/* INFO CARD */}
        {/* ================================================== */}

        <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30">

          <div className="flex gap-4">

            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900">
              <Clock3 size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Stay on track with your career
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Your reminder message will automatically
                be based on your selected career. You don't
                need to create a separate title for every
                reminder.
              </p>

              <p className="mt-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Example: “It's time to upgrade your skills
                for your {careerName} career.”
              </p>
            </div>

          </div>

        </div>


        {/* ================================================== */}
        {/* REMINDER FORM */}
        {/* ================================================== */}

        {showForm && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isEditing
                    ? 'Edit Study Reminder'
                    : 'Create Study Reminder'}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Configure when and how you want
                  to receive your reminder.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* TIME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Reminder time
                </label>

                <input
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    updateForm(
                      'time',
                      event.target.value
                    )
                  }
                  className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-indigo-900"
                  required
                />
              </div>


              {/* REPEAT */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Repeat
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  {[
                    ['once', 'Once'],
                    ['daily', 'Daily'],
                    ['weekdays', 'Weekdays'],
                    ['custom', 'Custom days'],
                  ].map(([value, label]) => (

                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateForm(
                          'repeatType',
                          value
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        form.repeatType === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>

                  ))}

                </div>
              </div>


              {/* CUSTOM DAYS */}

              {form.repeatType === 'custom' && (
                <div>

                  <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Select days
                  </label>

                  <div className="flex flex-wrap gap-2">

                    {CUSTOM_DAYS.map((day) => {
                      const selected =
                        form.repeatDays.includes(
                          day.value
                        );

                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            toggleCustomDay(
                              day.value
                            )
                          }
                          className={`flex h-10 min-w-12 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                            selected
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}

                  </div>

                </div>
              )}


              {/* CHANNELS */}

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notification channels
                </label>

                <div className="grid gap-3 sm:grid-cols-2">

                  {/* IN APP */}

                  <button
                    type="button"
                    onClick={() =>
                      toggleChannel('inApp')
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      form.channels.inApp
                        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <Bell size={18} />
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        In-app
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        CareerCraft notification
                      </p>
                    </div>

                    {form.channels.inApp && (
                      <Check
                        size={18}
                        className="text-indigo-600"
                      />
                    )}

                  </button>


                  {/* EMAIL */}

                  <button
                    type="button"
                    onClick={() =>
                      toggleChannel('email')
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      form.channels.email
                        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <Mail size={18} />
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Email
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Send to your account email
                      </p>
                    </div>

                    {form.channels.email && (
                      <Check
                        size={18}
                        className="text-indigo-600"
                      />
                    )}

                  </button>


                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Email reminders are sent to your registered
                  account email.
                </p>

              </div>


              {/* SNOOZE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Snooze duration
                </label>

                <select
                  value={form.snoozeMinutes}
                  onChange={(event) =>
                    updateForm(
                      'snoozeMinutes',
                      Number(event.target.value)
                    )
                  }
                  className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value={5}>
                    5 minutes
                  </option>

                  <option value={10}>
                    10 minutes
                  </option>

                  <option value={15}>
                    15 minutes
                  </option>
                </select>
              </div>


              {/* ENABLED */}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">

                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) =>
                    updateForm(
                      'enabled',
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Enable this reminder
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You can disable it later without
                    deleting it.
                  </p>
                </div>

              </label>


              {/* ACTIONS */}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} />

                  {saving
                    ? 'Saving...'
                    : isEditing
                      ? 'Save Changes'
                      : 'Create Reminder'}
                </button>

              </div>

            </form>

          </div>
        )}


        {/* ================================================== */}
        {/* REMINDERS LIST */}
        {/* ================================================== */}

        {reminders.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Bell size={25} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              No study reminders yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Create a reminder to build a consistent
              learning routine for your career.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus size={18} />
              Create your first reminder
            </button>

          </div>

        ) : (

          <div className="space-y-4">

            {reminders.map((reminder) => (

              <div
                key={reminder._id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900 ${
                  reminder.enabled
                    ? 'border-slate-200 dark:border-slate-700'
                    : 'border-slate-200 opacity-65 dark:border-slate-700'
                }`}
              >

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  {/* LEFT */}

                  <div className="flex min-w-0 items-start gap-4">

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        reminder.enabled
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      {reminder.enabled ? (
                        <Bell size={21} />
                      ) : (
                        <BellOff size={21} />
                      )}
                    </div>


                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-3">

                        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {formatTime(
                            reminder.time
                          )}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            reminder.enabled
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {reminder.enabled
                            ? 'Enabled'
                            : 'Disabled'}
                        </span>

                      </div>


                      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        It's time to upgrade your skills
                        for your{' '}
                        {getCareerName(
                          reminder,
                          activeCareer
                        )}{' '}
                        career.
                      </p>


                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                          {getRepeatLabel(
                            reminder
                          )}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                          Snooze:{' '}
                          {reminder.snoozeMinutes ||
                            10}
                          m
                        </span>

                        {reminder.channels?.inApp && (
                          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                            <Bell size={12} />
                            In-app
                          </span>
                        )}

                        {reminder.channels?.email && (
                          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                            <Mail size={12} />
                            Email
                          </span>
                        )}

                      </div>

                    </div>

                  </div>


                  {/* ACTIONS */}

                  <div className="flex shrink-0 items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        handleToggle(reminder)
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        reminder.enabled
                          ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      {reminder.enabled
                        ? 'Disable'
                        : 'Enable'}
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(reminder)
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Pencil size={15} />
                      <span className="hidden sm:inline">
                        Edit
                      </span>
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(reminder)
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                      aria-label="Delete reminder"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>
    </div>
  );
}