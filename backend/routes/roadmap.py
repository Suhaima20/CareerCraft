from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone

from db import get_collection
from utils.auth import token_required
from utils.serialization import to_objectid

from services.roadmap import (
    build_roadmap,
    build_brush_up,
)

from services.achievements import (
    check_achievements,
)

from services.streak import update_streak


roadmap_bp = Blueprint("roadmap", __name__)


# ============================================================
# HELPER — GET CURRENT TIME
# ============================================================

def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# HELPER — SAVE CHAPTER COMPLETION
#
# This is used internally after a quiz is passed.
# Users cannot directly complete a chapter through the
# normal PUT progress endpoint anymore.
# ============================================================

def complete_roadmap_chapter(
    user_id,
    career_obj_id,
    chapter_obj_id,
    score=None
):
    progress_collection = get_collection(
        "roadmap_progress"
    )

    now = utc_now()

    existing = progress_collection.find_one({
        "userId": user_id,
        "careerId": career_obj_id,
        "chapterId": chapter_obj_id,
        "isBrushUp": {"$ne": True},
    })

    update_data = {
        "userId": user_id,
        "careerId": career_obj_id,
        "chapterId": chapter_obj_id,
        "completed": True,
        "isBrushUp": False,
        "updatedAt": now,
    }

    if score is not None:
        update_data["score"] = score

    if existing:
        progress_collection.update_one(
            {
                "_id": existing["_id"]
            },
            {
                "$set": update_data
            }
        )
    else:
        update_data["createdAt"] = now

        progress_collection.insert_one(
            update_data
        )

    # --------------------------------------------------------
    # UPDATE STREAK
    # --------------------------------------------------------

    update_streak(user_id)

    # --------------------------------------------------------
    # CHECK ACHIEVEMENTS
    # --------------------------------------------------------

    newly_unlocked = []

    achievement_result = check_achievements(
        user_id,
        career_obj_id
    )

    if isinstance(
        achievement_result,
        dict
    ):
        newly_unlocked = (
            achievement_result.get(
                "newlyUnlocked",
                []
            )
        )

    elif isinstance(
        achievement_result,
        list
    ):
        newly_unlocked = achievement_result

    return newly_unlocked


# ============================================================
# GET ROADMAP
# ============================================================

@roadmap_bp.route(
    "/<career_id>",
    methods=["GET"]
)
@token_required
def get_roadmap(career_id):

    roadmap = build_roadmap(
        g.current_user_id,
        career_id
    )

    if roadmap is None:

        return jsonify({
            "error": "Career not found"
        }), 404

    return jsonify(
        roadmap
    ), 200


# ============================================================
# GET ROADMAP PROGRESS
# ============================================================

@roadmap_bp.route(
    "/<career_id>/progress",
    methods=["GET"]
)
@token_required
def get_progress(career_id):

    roadmap = build_roadmap(
        g.current_user_id,
        career_id
    )

    if roadmap is None:

        return jsonify({
            "error": "Career not found"
        }), 404

    return jsonify({

        "completedChapters":
            roadmap[
                "completedChapters"
            ],

        "totalChapters":
            roadmap[
                "totalChapters"
            ],

        "progress":
            roadmap[
                "progress"
            ],

    }), 200


# ============================================================
# IMPORTANT:
# MANUAL ROADMAP COMPLETION IS NOW BLOCKED
#
# Chapters can ONLY become completed after:
#
# 1. Required video watch percentage reached
# 2. Quiz passed
#
# The old checkbox in Roadmap.jsx must also be removed.
# ============================================================

@roadmap_bp.route(
    "/<career_id>/progress",
    methods=["PUT"]
)
@token_required
def toggle_chapter(career_id):

    return jsonify({
        "error": (
            "Manual chapter completion is disabled. "
            "Watch the required video and pass the chapter quiz "
            "to complete this chapter."
        ),
        "requiresVideoAndQuiz": True,
    }), 403


# ============================================================
# VIDEO WATCH PROGRESS
#
# Stores progress separately for:
#
# user + career + chapter
#
# This means switching careers does NOT destroy progress.
# ============================================================

@roadmap_bp.route(
    "/<career_id>/chapter/<chapter_id>/watch",
    methods=["GET"]
)
@token_required
def get_watch_progress(
    career_id,
    chapter_id
):

    career_obj_id = to_objectid(
        career_id
    )

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if (
        career_obj_id is None
        or chapter_obj_id is None
    ):

        return jsonify({
            "error": "Invalid ID"
        }), 400

    progress = get_collection(
        "video_watch_progress"
    ).find_one({

        "userId":
            g.current_user_id,

        "careerId":
            career_obj_id,

        "chapterId":
            chapter_obj_id,

    })

    if not progress:

        return jsonify({

            "watchPercentage": 0,

            "watchedSeconds": 0,

            "durationSeconds": 0,

            "completed": False,

        }), 200

    return jsonify({

        "watchPercentage":
            progress.get(
                "watchPercentage",
                0
            ),

        "watchedSeconds":
            progress.get(
                "watchedSeconds",
                0
            ),

        "durationSeconds":
            progress.get(
                "durationSeconds",
                0
            ),

        "completed":
            progress.get(
                "completed",
                False
            ),

    }), 200


# ============================================================
# SAVE VIDEO WATCH PROGRESS
# ============================================================

@roadmap_bp.route(
    "/<career_id>/chapter/<chapter_id>/watch",
    methods=["PUT"]
)
@token_required
def save_watch_progress(
    career_id,
    chapter_id
):

    data = request.get_json() or {}

    career_obj_id = to_objectid(
        career_id
    )

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if (
        career_obj_id is None
        or chapter_obj_id is None
    ):

        return jsonify({
            "error": "Invalid ID"
        }), 400

    # --------------------------------------------------------
    # RECEIVE WATCH DATA
    # --------------------------------------------------------

    try:
        watch_percentage = float(
            data.get(
                "watchPercentage",
                0
            )
        )
    except (
        TypeError,
        ValueError
    ):
        watch_percentage = 0

    try:
        watched_seconds = float(
            data.get(
                "watchedSeconds",
                0
            )
        )
    except (
        TypeError,
        ValueError
    ):
        watched_seconds = 0

    try:
        duration_seconds = float(
            data.get(
                "durationSeconds",
                0
            )
        )
    except (
        TypeError,
        ValueError
    ):
        duration_seconds = 0

    # --------------------------------------------------------
    # SAFETY LIMITS
    # --------------------------------------------------------

    watch_percentage = max(
        0,
        min(
            watch_percentage,
            100
        )
    )

    watched_seconds = max(
        0,
        watched_seconds
    )

    duration_seconds = max(
        0,
        duration_seconds
    )

    # --------------------------------------------------------
    # REQUIRED WATCH
    #
    # Default = 98%
    # Can be overridden by chapter quiz configuration.
    # --------------------------------------------------------

    quiz = get_collection(
        "quizzes"
    ).find_one({

        "chapterId":
            chapter_obj_id

    })

    required_percentage = 98

    if quiz:

        try:
            required_percentage = float(
                quiz.get(
                    "requiredWatchPercentage",
                    98
                )
            )
        except (
            TypeError,
            ValueError
        ):
            required_percentage = 98

    required_percentage = max(
        98,
        min(
            required_percentage,
            100
        )
    )

    completed = (
        watch_percentage >=
        required_percentage
    )

    now = utc_now()

    # --------------------------------------------------------
    # SAVE
    #
    # IMPORTANT:
    # Never reduce previously saved progress.
    # --------------------------------------------------------

    collection = get_collection(
        "video_watch_progress"
    )

    existing = collection.find_one({

        "userId":
            g.current_user_id,

        "careerId":
            career_obj_id,

        "chapterId":
            chapter_obj_id,

    })

    if existing:

        old_percentage = float(
            existing.get(
                "watchPercentage",
                0
            )
        )

        old_watched_seconds = float(
            existing.get(
                "watchedSeconds",
                0
            )
        )

        final_percentage = max(
            old_percentage,
            watch_percentage
        )

        final_watched_seconds = max(
            old_watched_seconds,
            watched_seconds
        )

        final_completed = (
            existing.get(
                "completed",
                False
            )
            or completed
        )

        collection.update_one(

            {
                "_id":
                    existing["_id"]
            },

            {
                "$set": {

                    "watchPercentage":
                        final_percentage,

                    "watchedSeconds":
                        final_watched_seconds,

                    "durationSeconds":
                        duration_seconds,

                    "completed":
                        final_completed,

                    "requiredPercentage":
                        required_percentage,

                    "updatedAt":
                        now,

                }
            }
        )

        completed = final_completed
        watch_percentage = final_percentage

    else:

        collection.insert_one({

            "userId":
                g.current_user_id,

            "careerId":
                career_obj_id,

            "chapterId":
                chapter_obj_id,

            "watchPercentage":
                watch_percentage,

            "watchedSeconds":
                watched_seconds,

            "durationSeconds":
                duration_seconds,

            "requiredPercentage":
                required_percentage,

            "completed":
                completed,

            "createdAt":
                now,

            "updatedAt":
                now,

        })

    return jsonify({

        "watchPercentage":
            round(
                watch_percentage,
                2
            ),

        "watchedSeconds":
            round(
                watched_seconds,
                2
            ),

        "durationSeconds":
            round(
                duration_seconds,
                2
            ),

        "requiredWatchPercentage":
            required_percentage,

        "completed":
            completed,

        "quizUnlocked":
            completed,

    }), 200


# ============================================================
# CHECK WHETHER QUIZ IS UNLOCKED
# ============================================================

@roadmap_bp.route(
    "/<career_id>/chapter/<chapter_id>/unlock-status",
    methods=["GET"]
)
@token_required
def get_chapter_unlock_status(
    career_id,
    chapter_id
):

    career_obj_id = to_objectid(
        career_id
    )

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if (
        career_obj_id is None
        or chapter_obj_id is None
    ):

        return jsonify({
            "error": "Invalid ID"
        }), 400

    # --------------------------------------------------------
    # VIDEO
    # --------------------------------------------------------

    watch_progress = get_collection(
        "video_watch_progress"
    ).find_one({

        "userId":
            g.current_user_id,

        "careerId":
            career_obj_id,

        "chapterId":
            chapter_obj_id,

    })

    watch_percentage = 0

    if watch_progress:

        watch_percentage = float(
            watch_progress.get(
                "watchPercentage",
                0
            )
        )

    # --------------------------------------------------------
    # QUIZ
    # --------------------------------------------------------

    quiz = get_collection(
        "quizzes"
    ).find_one({

        "chapterId":
            chapter_obj_id

    })

    if not quiz:

        return jsonify({

            "hasQuiz":
                False,

            "watchPercentage":
                round(
                    watch_percentage,
                    2
                ),

            "requiredWatchPercentage":
                98,

            "videoCompleted":
                watch_percentage >= 98,

            "quizUnlocked":
                False,

            "message":
                "No quiz configured for this chapter."

        }), 200

    required_percentage = quiz.get(
        "requiredWatchPercentage",
        98
    )

    try:
        required_percentage = float(
            required_percentage
        )
    except (
        TypeError,
        ValueError
    ):
        required_percentage = 98

    video_completed = (
        watch_percentage >=
        required_percentage
    )

    return jsonify({

        "hasQuiz":
            bool(
                quiz.get(
                    "questions"
                )
            ),

        "quizActive":
            quiz.get(
                "active",
                True
            ),

        "watchPercentage":
            round(
                watch_percentage,
                2
            ),

        "requiredWatchPercentage":
            required_percentage,

        "videoCompleted":
            video_completed,

        "quizUnlocked":
            video_completed
            and bool(
                quiz.get(
                    "questions"
                )
            ),

        "passScore":
            quiz.get(
                "passScore",
                70
            ),

    }), 200


# ============================================================
# GET BRUSH-UP
# ============================================================

@roadmap_bp.route(
    "/<career_id>/brush-up",
    methods=["GET"]
)
@token_required
def get_brush_up(career_id):

    chapters = build_brush_up(
        g.current_user_id,
        career_id
    )

    return jsonify({
        "chapters": chapters
    }), 200


# ============================================================
# TOGGLE BRUSH-UP CHAPTER
#
# Brush-up remains manually checkable because it does NOT
# contribute to roadmap progress.
# ============================================================

@roadmap_bp.route(
    "/<career_id>/brush-up",
    methods=["PUT"]
)
@token_required
def toggle_brush_up(career_id):

    data = request.get_json() or {}

    chapter_id = data.get(
        "chapterId"
    )

    completed = data.get(
        "completed"
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if (
        not chapter_id
        or completed is None
    ):

        return jsonify({
            "error":
                "chapterId and completed are required"
        }), 400

    career_obj_id = to_objectid(
        career_id
    )

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if (
        career_obj_id is None
        or chapter_obj_id is None
    ):

        return jsonify({
            "error": "Invalid ID"
        }), 400

    # --------------------------------------------------------
    # SAVE BRUSH-UP PROGRESS
    # --------------------------------------------------------

    progress_collection = get_collection(
        "roadmap_progress"
    )

    now = utc_now()

    existing = progress_collection.find_one({

        "userId":
            g.current_user_id,

        "careerId":
            career_obj_id,

        "chapterId":
            chapter_obj_id,

        "isBrushUp":
            True,

    })

    if existing:

        progress_collection.update_one(

            {
                "_id":
                    existing["_id"]
            },

            {
                "$set": {

                    "completed":
                        bool(
                            completed
                        ),

                    "updatedAt":
                        now,

                }
            }
        )

    else:

        progress_collection.insert_one({

            "userId":
                g.current_user_id,

            "careerId":
                career_obj_id,

            "chapterId":
                chapter_obj_id,

            "completed":
                bool(
                    completed
                ),

            "isBrushUp":
                True,

            "createdAt":
                now,

            "updatedAt":
                now,

        })

    return jsonify({

        "completed":
            bool(
                completed
            )

    }), 200