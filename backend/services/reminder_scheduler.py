import threading
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from bson import ObjectId

from db import get_collection
from utils.email_service import send_email


# ============================================================
# SETTINGS
# ============================================================

CHECK_INTERVAL_SECONDS = 30

DEFAULT_TIMEZONE = "Asia/Kolkata"

_scheduler_thread = None
_scheduler_running = False


# ============================================================
# TIME HELPERS
# ============================================================

def _utc_now():
    return datetime.now(timezone.utc)


def _ensure_utc(value):
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc
        )

    return value.astimezone(
        timezone.utc
    )


def _get_timezone(timezone_name):
    """
    Safely load the user's timezone.

    On some Windows Python installations,
    the IANA timezone database may not be
    available. In that case we fall back
    to UTC+05:30 for India.
    """

    timezone_name = (
        str(timezone_name or DEFAULT_TIMEZONE)
        .strip()
    )

    try:
        return ZoneInfo(timezone_name)

    except ZoneInfoNotFoundError:

        print(
            f"Timezone '{timezone_name}' "
            "was not found. "
            "Using India Standard Time "
            "(UTC+05:30) fallback."
        )

        return timezone(
            timedelta(hours=5, minutes=30),
            name="Asia/Kolkata"
        )


# ============================================================
# CALCULATE NEXT TRIGGER
# ============================================================

def calculate_next_trigger(
    reminder,
    from_time=None
):

    if from_time is None:
        from_time = _utc_now()

    from_time = _ensure_utc(
        from_time
    )

    repeat_type = reminder.get(
        "repeatType",
        "once"
    )

    reminder_time = str(
        reminder.get("time", "")
    ).strip()

    if ":" not in reminder_time:
        return None

    try:

        hour, minute = (
            reminder_time.split(":")
        )

        hour = int(hour)
        minute = int(minute)

    except Exception:

        return None

    if (
        hour < 0
        or hour > 23
        or minute < 0
        or minute > 59
    ):

        return None

    timezone_name = reminder.get(
        "timezone",
        DEFAULT_TIMEZONE
    )

    local_timezone = _get_timezone(
        timezone_name
    )

    local_now = from_time.astimezone(
        local_timezone
    )


    # ========================================================
    # ONCE
    # ========================================================

    if repeat_type == "once":

        candidate = local_now.replace(
            hour=hour,
            minute=minute,
            second=0,
            microsecond=0
        )

        if candidate <= local_now:

            candidate += timedelta(
                days=1
            )

        return candidate.astimezone(
            timezone.utc
        )


    # ========================================================
    # DAILY
    # ========================================================

    if repeat_type == "daily":

        candidate = local_now.replace(
            hour=hour,
            minute=minute,
            second=0,
            microsecond=0
        )

        if candidate <= local_now:

            candidate += timedelta(
                days=1
            )

        return candidate.astimezone(
            timezone.utc
        )


    # ========================================================
    # WEEKDAYS
    # ========================================================

    if repeat_type == "weekdays":

        for offset in range(0, 8):

            candidate_date = (
                local_now.date()
                + timedelta(days=offset)
            )

            # Monday = 0
            # Sunday = 6

            if candidate_date.weekday() >= 5:
                continue

            candidate = datetime(
                candidate_date.year,
                candidate_date.month,
                candidate_date.day,
                hour,
                minute,
                tzinfo=local_timezone
            )

            if candidate <= local_now:
                continue

            return candidate.astimezone(
                timezone.utc
            )

        return None


    # ========================================================
    # CUSTOM DAYS
    # ========================================================

    if repeat_type == "custom":

        selected_days = {
            str(day)
            .strip()
            .lower()

            for day in reminder.get(
                "repeatDays",
                []
            )

            if isinstance(
                day,
                str
            )
        }

        if not selected_days:
            return None

        weekday_names = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]

        for offset in range(0, 8):

            candidate_date = (
                local_now.date()
                + timedelta(days=offset)
            )

            weekday_name = (
                weekday_names[
                    candidate_date.weekday()
                ]
            )

            if (
                weekday_name
                not in selected_days
            ):
                continue

            candidate = datetime(
                candidate_date.year,
                candidate_date.month,
                candidate_date.day,
                hour,
                minute,
                tzinfo=local_timezone
            )

            if candidate <= local_now:
                continue

            return candidate.astimezone(
                timezone.utc
            )

        return None


    return None


# ============================================================
# CREATE IN-APP NOTIFICATION
# ============================================================

def create_in_app_notification(
    reminder
):

    notifications = get_collection(
        "notifications"
    )

    user_id = reminder.get(
        "userId"
    )

    if not user_id:
        return False

    career_name = (
        reminder.get(
            "careerName"
        )
        or "your selected career"
    )

    now = _utc_now()

    notification = {

        "userId": user_id,

        "type": "study_reminder",

        "title": "Study Reminder",

        "message": (
            "It's time to upgrade your "
            f"skills for your {career_name} "
            "career."
        ),

        "read": False,

        "reminderId":
            reminder.get("_id"),

        "careerId":
            reminder.get("careerId"),

        "createdAt": now,

        "updatedAt": now,
    }

    notifications.insert_one(
        notification
    )

    return True


# ============================================================
# GET USER EMAIL
# ============================================================

def get_user_email(
    user_id
):
    """
    Find the registered email address
    belonging to the reminder owner.
    """

    if not user_id:
        return None

    users = get_collection(
        "users"
    )

    user = users.find_one(
        {
            "_id": user_id
        },
        {
            "email": 1
        }
    )

    if not user:
        print(
            "Study reminder email error: "
            f"user {user_id} was not found."
        )
        return None

    email = user.get(
        "email"
    )

    if not email:
        print(
            "Study reminder email error: "
            f"user {user_id} has no email address."
        )
        return None

    return str(email).strip()


# ============================================================
# CREATE EMAIL NOTIFICATION
# ============================================================

def send_study_reminder_email(
    reminder
):
    """
    Send the study reminder through Resend.

    Email failure is intentionally isolated
    from the reminder scheduler so that a
    failed email cannot break the reminder.
    """

    user_id = reminder.get(
        "userId"
    )

    if not user_id:
        return False

    recipient_email = get_user_email(
        user_id
    )

    if not recipient_email:
        return False

    career_name = (
        reminder.get(
            "careerName"
        )
        or "your selected career"
    )

    reminder_time = str(
        reminder.get(
            "time",
            ""
        )
    )

    snooze_minutes = int(
        reminder.get(
            "snoozeMinutes",
            10
        )
    )

    repeat_type = (
        reminder.get(
            "repeatType",
            "once"
        )
    )

    repeat_labels = {
        "once": "Once",
        "daily": "Daily",
        "weekdays": "Weekdays",
        "custom": "Custom days",
    }

    repeat_label = repeat_labels.get(
        repeat_type,
        "Scheduled"
    )

    subject = (
        f"CareerCraft Study Reminder - "
        f"{career_name}"
    )

    html = f"""
    <div
        style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            background: #f8f7fb;
            color: #222;
        "
    >

        <div
            style="
                background: #403D88;
                color: white;
                padding: 24px;
                border-radius: 14px 14px 0 0;
            "
        >
            <h1
                style="
                    margin: 0;
                    font-size: 24px;
                "
            >
                CareerCraft
            </h1>

            <p
                style="
                    margin: 8px 0 0;
                    opacity: 0.9;
                "
            >
                Smart Career & Skill Development
            </p>
        </div>

        <div
            style="
                background: white;
                padding: 28px;
                border-radius: 0 0 14px 14px;
                box-shadow: 0 4px 18px
                    rgba(0, 0, 0, 0.08);
            "
        >

            <h2
                style="
                    margin-top: 0;
                    color: #403D88;
                "
            >
                📚 Study Reminder
            </h2>

            <p>
                It's time to upgrade your
                skills for your
                <strong>{career_name}</strong>
                career.
            </p>

            <div
                style="
                    margin: 22px 0;
                    padding: 18px;
                    background: #f3e8df;
                    border-radius: 10px;
                "
            >

                <p style="margin: 6px 0;">
                    <strong>Career:</strong>
                    {career_name}
                </p>

                <p style="margin: 6px 0;">
                    <strong>Reminder time:</strong>
                    {reminder_time}
                </p>

                <p style="margin: 6px 0;">
                    <strong>Repeat:</strong>
                    {repeat_label}
                </p>

                <p style="margin: 6px 0;">
                    <strong>Snooze:</strong>
                    {snooze_minutes} minutes
                </p>

            </div>

            <p>
                Keep building your skills and
                making progress toward your
                career goal.
            </p>

            <p
                style="
                    margin-top: 28px;
                    color: #666;
                    font-size: 13px;
                "
            >
                This email was sent by CareerCraft
                because you enabled email
                notifications for a study reminder.
            </p>

        </div>

    </div>
    """

    try:

        success = send_email(
            to_email=recipient_email,
            subject=subject,
            html=html,
        )

        if success:

            print(
                "Study reminder email sent to:",
                recipient_email
            )

        else:

            print(
                "Study reminder email was not sent "
                "to:",
                recipient_email
            )

        return success

    except Exception as error:

        print(
            "Study reminder email error:",
            str(error)
        )

        return False


# ============================================================
# PROCESS ONE REMINDER
# ============================================================

def process_reminder(
    reminder
):

    reminder_id = reminder.get(
        "_id"
    )

    if not isinstance(
        reminder_id,
        ObjectId
    ):
        return

    reminders = get_collection(
        "study_reminders"
    )

    now = _utc_now()

    next_trigger = reminder.get(
        "nextTriggerAt"
    )

    next_trigger = _ensure_utc(
        next_trigger
    )


    # --------------------------------------------------------
    # If nextTriggerAt is missing, calculate it.
    # --------------------------------------------------------

    if next_trigger is None:

        next_trigger = (
            calculate_next_trigger(
                reminder,
                now
            )
        )

        if next_trigger is None:
            return

        reminders.update_one(
            {
                "_id": reminder_id,
                "enabled": True
            },
            {
                "$set": {
                    "nextTriggerAt":
                        next_trigger,
                    "updatedAt":
                        now
                }
            }
        )

        return


    # --------------------------------------------------------
    # Not due yet
    # --------------------------------------------------------

    if next_trigger > now:
        return


    # --------------------------------------------------------
    # ATOMIC CLAIM
    # --------------------------------------------------------

    claim = (
        reminders.find_one_and_update(

            {
                "_id": reminder_id,

                "enabled": True,

                "nextTriggerAt": {
                    "$lte": now
                }
            },

            {
                "$set": {

                    "lastTriggeredAt":
                        now,

                    # Temporary value prevents
                    # duplicate triggering while
                    # notification processing occurs.
                    "nextTriggerAt":
                        now
                        + timedelta(
                            minutes=1
                        ),

                    "updatedAt":
                        now,
                }
            }
        )
    )

    if claim is None:
        return


    # ========================================================
    # PROCESS NOTIFICATION CHANNELS
    # ========================================================

    try:

        channels = claim.get(
            "channels",
            {}
        )


        # ----------------------------------------------------
        # IN-APP
        # ----------------------------------------------------

        if channels.get(
            "inApp",
            False
        ):

            create_in_app_notification(
                claim
            )


        # ----------------------------------------------------
        # EMAIL
        # ----------------------------------------------------

        if channels.get(
            "email",
            False
        ):

            send_study_reminder_email(
                claim
            )


        # ----------------------------------------------------
        # REPEAT TYPE
        # ----------------------------------------------------

        repeat_type = claim.get(
            "repeatType",
            "once"
        )


        # ----------------------------------------------------
        # ONCE
        # ----------------------------------------------------

        if repeat_type == "once":

            reminders.update_one(

                {
                    "_id":
                        reminder_id
                },

                {
                    "$set": {

                        "enabled":
                            False,

                        "nextTriggerAt":
                            None,

                        "updatedAt":
                            _utc_now()
                    }
                }
            )


        # ----------------------------------------------------
        # RECURRING
        # ----------------------------------------------------

        else:

            next_occurrence = (
                calculate_next_trigger(
                    claim,
                    now
                )
            )

            reminders.update_one(

                {
                    "_id":
                        reminder_id
                },

                {
                    "$set": {

                        "nextTriggerAt":
                            next_occurrence,

                        "updatedAt":
                            _utc_now()
                    }
                }
            )


        print(
            "Study reminder triggered:",
            str(reminder_id)
        )


    except Exception as error:

        print(
            "Reminder processing error:",
            str(error)
        )

        # Try to restore the next occurrence
        # if notification processing failed.

        next_occurrence = (
            calculate_next_trigger(
                claim,
                now
            )
        )

        reminders.update_one(

            {
                "_id":
                    reminder_id
            },

            {
                "$set": {

                    "nextTriggerAt":
                        next_occurrence,

                    "updatedAt":
                        _utc_now()
                }
            }
        )


# ============================================================
# PROCESS ALL DUE REMINDERS
# ============================================================

def process_due_reminders():

    reminders = get_collection(
        "study_reminders"
    )

    now = _utc_now()

    cursor = reminders.find({

        "enabled": True,

        "nextTriggerAt": {
            "$ne": None,
            "$lte": now
        }

    })

    for reminder in cursor:

        try:

            process_reminder(
                reminder
            )

        except Exception as error:

            print(
                "Reminder processing failed:",
                str(error)
            )


# ============================================================
# SCHEDULER LOOP
# ============================================================

def _scheduler_loop():

    global _scheduler_running

    print(
        "CareerCraft Study Reminder "
        "Scheduler started."
    )

    while _scheduler_running:

        try:

            process_due_reminders()

        except Exception as error:

            print(
                "Study reminder scheduler error:",
                str(error)
            )

        time.sleep(
            CHECK_INTERVAL_SECONDS
        )

    print(
        "CareerCraft Study Reminder "
        "Scheduler stopped."
    )


# ============================================================
# START SCHEDULER
# ============================================================

def start_reminder_scheduler():

    global _scheduler_thread
    global _scheduler_running

    if (
        _scheduler_thread is not None
        and _scheduler_thread.is_alive()
    ):

        return

    _scheduler_running = True

    _scheduler_thread = (
        threading.Thread(

            target=_scheduler_loop,

            name=(
                "careercraft-reminder-scheduler"
            ),

            daemon=True
        )
    )

    _scheduler_thread.start()


# ============================================================
# STOP SCHEDULER
# ============================================================

def stop_reminder_scheduler():

    global _scheduler_running

    _scheduler_running = False