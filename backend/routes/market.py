from flask import Blueprint, jsonify, g
from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc
from config import Config

market_bp = Blueprint("market", __name__, url_prefix="/market")


@market_bp.route("/status", methods=["GET"])
@token_required
def get_status():
    powerbi_configured = bool(Config.POWERBI_EMBED_URL and Config.POWERBI_REPORT_ID)
    trending_count = get_collection("market_data").count_documents({"type": {"$in": ["career", "skill", "trending_career", "trending_skill"]}})
    available = powerbi_configured or trending_count > 0

    trending_career = None
    if trending_count > 0:
        trending = get_collection("market_data").find_one({"type": {"$in": ["career", "trending_career"]}})
        if trending:
            trending_career = trending.get("name", "Data Analyst")

    return jsonify({
        "available": available,
        "trendingJob": trending_career,
        "powerBIConfigured": powerbi_configured,
    }), 200


@market_bp.route("/trends", methods=["GET"])
@token_required
def get_trends():
    trending_careers = list(get_collection("market_data").find({"type": "career"}).sort("order", 1))
    trending_skills = list(get_collection("market_data").find({"type": "skill"}).sort("order", 1))
    return jsonify({
        "trendingCareers": serialize_doc(trending_careers),
        "trendingSkills": serialize_doc(trending_skills),
    }), 200


@market_bp.route("/powerbi", methods=["GET"])
@token_required
def get_powerbi():
    embed_url = Config.POWERBI_EMBED_URL
    report_id = Config.POWERBI_REPORT_ID
    workspace_id = Config.POWERBI_WORKSPACE_ID

    if not embed_url or not report_id:
        return jsonify({"embedUrl": None, "reportId": None, "workspaceId": None}), 200

    return jsonify({
        "embedUrl": embed_url,
        "reportId": report_id,
        "workspaceId": workspace_id,
    }), 200
