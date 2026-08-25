from flask import Blueprint, request, jsonify, g

from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc, to_objectid
from services.analysis import run_analysis
from services.streak import update_streak


analysis_bp = Blueprint("analysis", __name__)


# =========================================================
# RUN NEW SKILL GAP ANALYSIS
# =========================================================

@analysis_bp.route("", methods=["POST"])
@token_required
def analyze():

    data = request.get_json() or {}

    career_id = data.get("careerId")

    if not career_id:
        return jsonify({
            "error": "careerId is required"
        }), 400

    try:
        result = run_analysis(
            g.current_user_id,
            career_id
        )

        if result is None:
            return jsonify({
                "error": "Career not found"
            }), 404

        update_streak(g.current_user_id)

        return jsonify(
            serialize_doc(result)
        ), 200

    except Exception as e:

        print("ANALYSIS ERROR:", str(e))

        return jsonify({
            "error": "Failed to generate skill analysis",
            "details": str(e)
        }), 500


# =========================================================
# GET ANALYSIS FOR A CAREER
# =========================================================

@analysis_bp.route("/<career_id>", methods=["GET"])
@token_required
def get_result(career_id):

    try:

        # -------------------------------------------------
        # IMPORTANT:
        # Always regenerate the analysis.
        #
        # This prevents an old cached analysis document
        # from showing outdated known/missing skills.
        # -------------------------------------------------

        result = run_analysis(
            g.current_user_id,
            career_id
        )

        if result is None:
            return jsonify({
                "error": "Career not found"
            }), 404

        return jsonify(
            serialize_doc(result)
        ), 200

    except Exception as e:

        print("GET ANALYSIS ERROR:", str(e))

        return jsonify({
            "error": "Failed to fetch skill analysis",
            "details": str(e)
        }), 500


# =========================================================
# GET ANALYSIS HISTORY
# =========================================================

@analysis_bp.route("", methods=["GET"])
@token_required
def get_history():

    try:

        analyses = list(
            get_collection("skill_gap_analyses")
            .find({
                "userId": g.current_user_id
            })
            .sort([
                ("careerName", 1)
            ])
        )

        return jsonify({
            "analyses": serialize_doc(analyses)
        }), 200

    except Exception as e:

        print("ANALYSIS HISTORY ERROR:", str(e))

        return jsonify({
            "error": "Failed to fetch analysis history",
            "details": str(e)
        }), 500