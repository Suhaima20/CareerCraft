from flask import Blueprint, jsonify, g

from db import get_collection
from utils.auth import token_required
from services.achievements import get_user_achievements


achievements_bp = Blueprint(
    "achievements",
    __name__,
    url_prefix="/achievements"
)


@achievements_bp.route("", methods=["GET"])
@token_required
def list_achievements():

    # ---------------------------------------------------------
    # GET CURRENT ACTIVE CAREER
    # ---------------------------------------------------------

    user = g.current_user

    career_id = user.get("activeCareerId")

    if not career_id:
        return jsonify({
            "achievements": [],
            "message": "No active career selected"
        }), 200

    # ---------------------------------------------------------
    # GET ACHIEVEMENTS ONLY FOR CURRENT CAREER
    # ---------------------------------------------------------

    achievements = get_user_achievements(
        g.current_user_id,
        career_id
    )

    # ---------------------------------------------------------
    # GET CURRENT CAREER PROGRESS
    # ---------------------------------------------------------

    from services.achievements import get_progress_percent

    percent, completed, total = get_progress_percent(
        g.current_user_id,
        career_id
    )

    # ---------------------------------------------------------
    # GET CAREER NAME
    # ---------------------------------------------------------

    career = get_collection("careers").find_one({
        "_id": career_id
    })

    career_name = ""

    if career:
        career_name = (
            career.get("name")
            or career.get("Career name")
            or ""
        )

    return jsonify({

        "achievements": achievements,

        "careerId": str(career_id),

        "careerName": career_name,

        "progress": {
            "percent": percent,
            "completedChapters": completed,
            "totalChapters": total
        }

    }), 200