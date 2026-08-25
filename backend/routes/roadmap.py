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
# GET ROADMAP
# ============================================================

@roadmap_bp.route("/<career_id>", methods=["GET"])
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

    return jsonify(roadmap), 200


# ============================================================
# GET ROADMAP PROGRESS
# ============================================================

@roadmap_bp.route("/<career_id>/progress", methods=["GET"])
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
            roadmap["completedChapters"],

        "totalChapters":
            roadmap["totalChapters"],

        "progress":
            roadmap["progress"],

    }), 200


# ============================================================
# TOGGLE ROADMAP CHAPTER
# ============================================================

@roadmap_bp.route(
    "/<career_id>/progress",
    methods=["PUT"]
)
@token_required
def toggle_chapter(career_id):

    data = request.get_json() or {}

    chapter_id = data.get("chapterId")
    completed = data.get("completed")

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not chapter_id or completed is None:

        return jsonify({
            "error":
                "chapterId and completed are required"
        }), 400


    career_obj_id = to_objectid(career_id)
    chapter_obj_id = to_objectid(chapter_id)

    if (
        career_obj_id is None
        or chapter_obj_id is None
    ):

        return jsonify({
            "error": "Invalid ID"
        }), 400


    # --------------------------------------------------------
    # SAVE PROGRESS
    # --------------------------------------------------------

    progress_collection = get_collection(
        "roadmap_progress"
    )

    now = datetime.now(timezone.utc)


    existing = progress_collection.find_one({

        "userId":
            g.current_user_id,

        "careerId":
            career_obj_id,

        "chapterId":
            chapter_obj_id,

        "isBrushUp":
            {"$ne": True},

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
                        bool(completed),

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
                bool(completed),

            "isBrushUp":
                False,

            "createdAt":
                now,

            "updatedAt":
                now,

        })


    # --------------------------------------------------------
    # UPDATE STREAK
    # --------------------------------------------------------

    update_streak(
        g.current_user_id
    )


    # --------------------------------------------------------
    # CHECK ACHIEVEMENTS
    #
    # IMPORTANT:
    # Only normal roadmap chapters count.
    # Brush-up chapters do NOT count.
    # --------------------------------------------------------

    newly_unlocked = []

    if completed:

        achievement_result = check_achievements(

            g.current_user_id,

            career_obj_id

        )

        # New version of check_achievements()
        # returns a dictionary.

        if isinstance(
            achievement_result,
            dict
        ):

            newly_unlocked = (
                achievement_result
                .get("newlyUnlocked", [])
            )

        # Backward compatibility
        elif isinstance(
            achievement_result,
            list
        ):

            newly_unlocked = (
                achievement_result
            )


    # --------------------------------------------------------
    # REBUILD ROADMAP
    #
    # This gives the frontend the latest percentage.
    # --------------------------------------------------------

    roadmap = build_roadmap(

        g.current_user_id,

        career_id

    )


    if roadmap is None:

        return jsonify({
            "error":
                "Career not found"
        }), 404


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "completed":
            bool(completed),

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

        "newlyUnlockedAchievements":
            newly_unlocked,

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
# ============================================================

@roadmap_bp.route(
    "/<career_id>/brush-up",
    methods=["PUT"]
)
@token_required
def toggle_brush_up(career_id):

    data = request.get_json() or {}

    chapter_id = data.get("chapterId")
    completed = data.get("completed")

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not chapter_id or completed is None:

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

    now = datetime.now(
        timezone.utc
    )


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
                        bool(completed),

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
                bool(completed),

            "isBrushUp":
                True,

            "createdAt":
                now,

            "updatedAt":
                now,

        })


    return jsonify({

        "completed":
            bool(completed)

    }), 200