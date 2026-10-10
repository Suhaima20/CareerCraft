from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone, timedelta

from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc, to_objectid
from services.reminder_scheduler import calculate_next_trigger


study_reminders_bp = Blueprint(
    "study_reminders",
    __name__,
    url_prefix="/study-reminders"
)


# =========================================================
# HELPERS
# =========================================================

def _utc_now():
    return datetime.now(timezone.utc)


def _get_reminder_collection():
    return get_collection("study_reminders")


def _validate_channels(channels):
    """
    Validate notification channel selection.

    Supported channels:
    - inApp
    - email

    At least one channel must be enabled.
    """

    if not isinstance(channels, dict):
        return None

    validated = {
        "inApp": bool(
            channels.get("inApp", False)
        ),
        "email": bool(
            channels.get("email", False)
        ),
    }

    if not any(validated.values()):
        return None

    return validated


def _validate_repeat(repeat_type, repeat_days):
    """
    Validate repeat configuration.

    Supported:
    - once
    - daily
    - weekdays
    - custom
    """

    allowed_types = {
        "once",
        "daily",
        "weekdays",
        "custom",
    }

    if repeat_type not in allowed_types:
        return None

    if repeat_type == "custom":

        if not isinstance(
            repeat_days,
            list
        ):
            return None

        valid_days = {
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        }

        cleaned_days = []

        for day in repeat_days:

            if not isinstance(
                day,
                str
            ):
                continue

            day = day.strip().lower()

            if (
                day in valid_days
                and day not in cleaned_days
            ):
                cleaned_days.append(day)

        if not cleaned_days:
            return None

        return cleaned_days

    return []


# =========================================================
# CREATE STUDY REMINDER
# =========================================================

@study_reminders_bp.route(
    "",
    methods=["POST"]
)
@token_required
def create_study_reminder():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        # -------------------------------------------------
        # TIME
        # -------------------------------------------------

        reminder_time = str(
            data.get("time") or ""
        ).strip()

        if not reminder_time:

            return jsonify({
                "error": "Reminder time is required"
            }), 400

        try:

            hour, minute = reminder_time.split(":")

            hour = int(hour)
            minute = int(minute)

            if (
                hour < 0
                or hour > 23
                or minute < 0
                or minute > 59
            ):
                raise ValueError

            reminder_time = (
                f"{hour:02d}:{minute:02d}"
            )

        except Exception:

            return jsonify({
                "error": "Time must be in HH:MM format"
            }), 400

        # -------------------------------------------------
        # TIMEZONE
        # -------------------------------------------------

        timezone_name = str(
            data.get("timezone")
            or "Asia/Kolkata"
        ).strip()

        # -------------------------------------------------
        # REPEAT
        # -------------------------------------------------

        repeat_type = str(
            data.get("repeatType")
            or "once"
        ).strip().lower()

        repeat_days = data.get(
            "repeatDays",
            []
        )

        validated_days = _validate_repeat(
            repeat_type,
            repeat_days
        )

        if validated_days is None:

            return jsonify({
                "error": (
                    "Invalid repeat configuration"
                )
            }), 400

        # -------------------------------------------------
        # CHANNELS
        # -------------------------------------------------

        channels = _validate_channels(
            data.get("channels")
        )

        if channels is None:

            return jsonify({
                "error": (
                    "Select at least one "
                    "notification channel"
                )
            }), 400

        # -------------------------------------------------
        # SNOOZE
        # -------------------------------------------------

        snooze_minutes = data.get(
            "snoozeMinutes",
            10
        )

        try:

            snooze_minutes = int(
                snooze_minutes
            )

        except Exception:

            return jsonify({
                "error": "Invalid snooze duration"
            }), 400

        if snooze_minutes not in {
            5,
            10,
            15
        }:

            return jsonify({
                "error": (
                    "Snooze duration must "
                    "be 5, 10, or 15 minutes"
                )
            }), 400

        # -------------------------------------------------
        # ENABLED
        # -------------------------------------------------

        enabled = data.get(
            "enabled",
            True
        )

        enabled = bool(enabled)

        # -------------------------------------------------
        # ACTIVE CAREER
        # -------------------------------------------------

        active_career = (
            data.get("careerId")
            or data.get("activeCareer")
        )

        career_id = None
        career_name = None

        if active_career:

            career_object_id = to_objectid(
                active_career
            )

            if career_object_id:

                career = get_collection(
                    "careers"
                ).find_one({
                    "_id": career_object_id
                })

                if career:

                    career_id = career["_id"]

                    career_name = (
                        career.get("name")
                        or career.get("title")
                    )

            else:

                career_name = str(
                    active_career
                ).strip()

        # -------------------------------------------------
        # CALCULATE FIRST TRIGGER
        # -------------------------------------------------

        next_trigger = None

        if enabled:

            next_trigger = calculate_next_trigger(
                {
                    "time": reminder_time,
                    "timezone": timezone_name,
                    "repeatType": repeat_type,
                    "repeatDays": validated_days,
                }
            )

        # -------------------------------------------------
        # CREATE DOCUMENT
        # -------------------------------------------------

        now = _utc_now()

        reminder = {

            "userId": g.current_user_id,

            "careerId": career_id,
            "careerName": career_name,

            "time": reminder_time,
            "timezone": timezone_name,

            "repeatType": repeat_type,
            "repeatDays": validated_days,

            "channels": channels,

            "enabled": enabled,

            "snoozeMinutes": snooze_minutes,

            "nextTriggerAt": next_trigger,
            "lastTriggeredAt": None,

            "createdAt": now,
            "updatedAt": now,
        }

        result = (
            _get_reminder_collection()
            .insert_one(reminder)
        )

        reminder["_id"] = result.inserted_id

        return jsonify({

            "message": (
                "Study reminder "
                "created successfully"
            ),

            "reminder": serialize_doc(
                reminder
            )

        }), 201

    except Exception as e:

        print(
            "Create study reminder error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to create study reminder"
        }), 500


# =========================================================
# GET USER'S STUDY REMINDERS
# =========================================================

@study_reminders_bp.route(
    "",
    methods=["GET"]
)
@token_required
def list_study_reminders():

    try:

        reminders = list(
            _get_reminder_collection()
            .find({
                "userId": g.current_user_id
            })
            .sort(
                "createdAt",
                -1
            )
        )

        return jsonify({

            "reminders": serialize_doc(
                reminders
            )

        }), 200

    except Exception as e:

        print(
            "List study reminders error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to load study reminders"
        }), 500


# =========================================================
# GET ONE STUDY REMINDER
# =========================================================

@study_reminders_bp.route(
    "/<reminder_id>",
    methods=["GET"]
)
@token_required
def get_study_reminder(
    reminder_id
):

    try:

        reminder_object_id = to_objectid(
            reminder_id
        )

        if reminder_object_id is None:

            return jsonify({
                "error": "Invalid reminder ID"
            }), 400

        reminder = (
            _get_reminder_collection()
            .find_one({
                "_id": reminder_object_id,
                "userId": g.current_user_id
            })
        )

        if reminder is None:

            return jsonify({
                "error": "Study reminder not found"
            }), 404

        return jsonify({

            "reminder": serialize_doc(
                reminder
            )

        }), 200

    except Exception as e:

        print(
            "Get study reminder error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to load study reminder"
        }), 500


# =========================================================
# UPDATE STUDY REMINDER
# =========================================================

@study_reminders_bp.route(
    "/<reminder_id>",
    methods=["PUT"]
)
@token_required
def update_study_reminder(
    reminder_id
):

    try:

        reminder_object_id = to_objectid(
            reminder_id
        )

        if reminder_object_id is None:

            return jsonify({
                "error": "Invalid reminder ID"
            }), 400

        collection = (
            _get_reminder_collection()
        )

        existing = collection.find_one({
            "_id": reminder_object_id,
            "userId": g.current_user_id
        })

        if existing is None:

            return jsonify({
                "error": "Study reminder not found"
            }), 404

        data = request.get_json(
            silent=True
        ) or {}

        update_fields = {}

        # -------------------------------------------------
        # TIME
        # -------------------------------------------------

        if "time" in data:

            reminder_time = str(
                data.get("time") or ""
            ).strip()

            try:

                hour, minute = (
                    reminder_time.split(":")
                )

                hour = int(hour)
                minute = int(minute)

                if (
                    hour < 0
                    or hour > 23
                    or minute < 0
                    or minute > 59
                ):
                    raise ValueError

                update_fields["time"] = (
                    f"{hour:02d}:{minute:02d}"
                )

            except Exception:

                return jsonify({
                    "error": (
                        "Time must be in HH:MM format"
                    )
                }), 400

        # -------------------------------------------------
        # TIMEZONE
        # -------------------------------------------------

        if "timezone" in data:

            timezone_name = str(
                data.get("timezone") or ""
            ).strip()

            if not timezone_name:

                return jsonify({
                    "error": "Invalid timezone"
                }), 400

            update_fields[
                "timezone"
            ] = timezone_name

        # -------------------------------------------------
        # REPEAT
        # -------------------------------------------------

        if (
            "repeatType" in data
            or "repeatDays" in data
        ):

            repeat_type = str(
                data.get(
                    "repeatType",
                    existing.get(
                        "repeatType",
                        "once"
                    )
                )
                or "once"
            ).strip().lower()

            repeat_days = data.get(
                "repeatDays",
                existing.get(
                    "repeatDays",
                    []
                )
            )

            validated_days = _validate_repeat(
                repeat_type,
                repeat_days
            )

            if validated_days is None:

                return jsonify({
                    "error": (
                        "Invalid repeat configuration"
                    )
                }), 400

            update_fields[
                "repeatType"
            ] = repeat_type

            update_fields[
                "repeatDays"
            ] = validated_days

        # -------------------------------------------------
        # CHANNELS
        # -------------------------------------------------

        if "channels" in data:

            channels = _validate_channels(
                data.get("channels")
            )

            if channels is None:

                return jsonify({
                    "error": (
                        "Select at least one "
                        "notification channel"
                    )
                }), 400

            update_fields[
                "channels"
            ] = channels

        # -------------------------------------------------
        # SNOOZE
        # -------------------------------------------------

        if "snoozeMinutes" in data:

            try:

                snooze_minutes = int(
                    data.get(
                        "snoozeMinutes"
                    )
                )

            except Exception:

                return jsonify({
                    "error": "Invalid snooze duration"
                }), 400

            if snooze_minutes not in {
                5,
                10,
                15
            }:

                return jsonify({
                    "error": (
                        "Snooze duration must "
                        "be 5, 10, or 15 minutes"
                    )
                }), 400

            update_fields[
                "snoozeMinutes"
            ] = snooze_minutes

        # -------------------------------------------------
        # ENABLED
        # -------------------------------------------------

        if "enabled" in data:

            update_fields[
                "enabled"
            ] = bool(
                data.get("enabled")
            )

        # -------------------------------------------------
        # CAREER
        # -------------------------------------------------

        if (
            "careerId" in data
            or "activeCareer" in data
        ):

            active_career = (
                data.get("careerId")
                or data.get("activeCareer")
            )

            career_id = None
            career_name = None

            if active_career:

                career_object_id = (
                    to_objectid(
                        active_career
                    )
                )

                if career_object_id:

                    career = (
                        get_collection(
                            "careers"
                        ).find_one({
                            "_id":
                                career_object_id
                        })
                    )

                    if career:

                        career_id = (
                            career["_id"]
                        )

                        career_name = (
                            career.get("name")
                            or career.get("title")
                        )

                else:

                    career_name = str(
                        active_career
                    ).strip()

            update_fields[
                "careerId"
            ] = career_id

            update_fields[
                "careerName"
            ] = career_name

        # -------------------------------------------------
        # BUILD FINAL REMINDER
        # -------------------------------------------------

        final_reminder = dict(
            existing
        )

        final_reminder.update(
            update_fields
        )

        # -------------------------------------------------
        # RECALCULATE NEXT TRIGGER
        # -------------------------------------------------

        if final_reminder.get(
            "enabled",
            True
        ):

            update_fields[
                "nextTriggerAt"
            ] = calculate_next_trigger(
                final_reminder
            )

        else:

            update_fields[
                "nextTriggerAt"
            ] = None

        # -------------------------------------------------
        # SAVE
        # -------------------------------------------------

        update_fields[
            "updatedAt"
        ] = _utc_now()

        collection.update_one(

            {
                "_id": reminder_object_id,
                "userId": g.current_user_id
            },

            {
                "$set": update_fields
            }
        )

        updated = collection.find_one({

            "_id": reminder_object_id,
            "userId": g.current_user_id

        })

        return jsonify({

            "message": (
                "Study reminder "
                "updated successfully"
            ),

            "reminder": serialize_doc(
                updated
            )

        }), 200

    except Exception as e:

        print(
            "Update study reminder error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to update study reminder"
        }), 500


# =========================================================
# DELETE STUDY REMINDER
# =========================================================

@study_reminders_bp.route(
    "/<reminder_id>",
    methods=["DELETE"]
)
@token_required
def delete_study_reminder(
    reminder_id
):

    try:

        reminder_object_id = to_objectid(
            reminder_id
        )

        if reminder_object_id is None:

            return jsonify({
                "error": "Invalid reminder ID"
            }), 400

        result = (
            _get_reminder_collection()
            .delete_one({
                "_id": reminder_object_id,
                "userId": g.current_user_id
            })
        )

        if result.deleted_count == 0:

            return jsonify({
                "error": "Study reminder not found"
            }), 404

        return jsonify({

            "message": (
                "Study reminder "
                "deleted successfully"
            ),

            "deleted": True

        }), 200

    except Exception as e:

        print(
            "Delete study reminder error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to delete study reminder"
        }), 500


# =========================================================
# ENABLE / DISABLE STUDY REMINDER
# =========================================================

@study_reminders_bp.route(
    "/<reminder_id>/toggle",
    methods=["PUT"]
)
@token_required
def toggle_study_reminder(
    reminder_id
):

    try:

        reminder_object_id = to_objectid(
            reminder_id
        )

        if reminder_object_id is None:

            return jsonify({
                "error": "Invalid reminder ID"
            }), 400

        collection = (
            _get_reminder_collection()
        )

        reminder = collection.find_one({

            "_id": reminder_object_id,

            "userId": g.current_user_id

        })

        if reminder is None:

            return jsonify({
                "error": "Study reminder not found"
            }), 404

        new_enabled = not bool(
            reminder.get(
                "enabled",
                True
            )
        )

        # -------------------------------------------------
        # CALCULATE NEXT TRIGGER WHEN ENABLED
        # -------------------------------------------------

        if new_enabled:

            next_trigger = (
                calculate_next_trigger(
                    reminder
                )
            )

        else:

            next_trigger = None

        # -------------------------------------------------
        # UPDATE
        # -------------------------------------------------

        collection.update_one(

            {
                "_id": reminder_object_id,

                "userId": g.current_user_id
            },

            {
                "$set": {

                    "enabled": new_enabled,

                    "nextTriggerAt":
                        next_trigger,

                    "updatedAt":
                        _utc_now()

                }
            }
        )

        updated = collection.find_one({

            "_id": reminder_object_id,

            "userId": g.current_user_id

        })

        return jsonify({

            "message": (
                "Study reminder "
                + (
                    "enabled"
                    if new_enabled
                    else "disabled"
                )
            ),

            "reminder": serialize_doc(
                updated
            )

        }), 200

    except Exception as e:

        print(
            "Toggle study reminder error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to update study reminder"
        }), 500


# =========================================================
# SNOOZE STUDY REMINDER
# =========================================================

@study_reminders_bp.route(
    "/<reminder_id>/snooze",
    methods=["PUT"]
)
@token_required
def snooze_study_reminder(
    reminder_id
):

    try:

        reminder_object_id = to_objectid(
            reminder_id
        )

        if reminder_object_id is None:

            return jsonify({
                "error": "Invalid reminder ID"
            }), 400

        collection = (
            _get_reminder_collection()
        )

        reminder = collection.find_one({
            "_id": reminder_object_id,
            "userId": g.current_user_id
        })

        if reminder is None:

            return jsonify({
                "error": "Study reminder not found"
            }), 404

        # -------------------------------------------------
        # SNOOZE DURATION
        # -------------------------------------------------

        snooze_minutes = int(
            reminder.get(
                "snoozeMinutes",
                10
            )
        )

        if snooze_minutes not in {
            5,
            10,
            15
        }:

            snooze_minutes = 10

        # -------------------------------------------------
        # NEW TRIGGER TIME
        # -------------------------------------------------

        now = _utc_now()

        next_trigger = (
            now +
            timedelta(
                minutes=snooze_minutes
            )
        )

        # -------------------------------------------------
        # ENABLE REMINDER AGAIN
        # -------------------------------------------------

        collection.update_one(

            {
                "_id": reminder_object_id,
                "userId": g.current_user_id
            },

            {
                "$set": {

                    "enabled": True,

                    "nextTriggerAt":
                        next_trigger,

                    "updatedAt":
                        now

                }
            }
        )

        updated = collection.find_one({

            "_id": reminder_object_id,

            "userId": g.current_user_id

        })

        return jsonify({

            "message": (
                f"Reminder snoozed for "
                f"{snooze_minutes} minutes"
            ),

            "reminder": serialize_doc(
                updated
            )

        }), 200

    except Exception as e:

        print(
            "Snooze study reminder error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to snooze study reminder"
        }), 500