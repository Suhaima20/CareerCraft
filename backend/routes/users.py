from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc, to_objectid

users_bp = Blueprint("users", __name__, url_prefix="/users")


@users_bp.route("/me", methods=["GET"])
@token_required
def get_profile():
    user = g.current_user
    return jsonify({"user": {
        "_id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "profession": user.get("profession", ""),
        "age": user.get("age"),
        "phone": user.get("phone", ""),
        "activeCareerId": str(user["activeCareerId"]) if user.get("activeCareerId") else None,
        "activeCareerName": user.get("activeCareerName"),
        "streak": user.get("streak", 0),
        "onboardingStep": user.get("onboardingStep", "career"),
    }}), 200


@users_bp.route("/me", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json() or {}
    allowed = ["name", "age", "phone", "profession"]
    update = {k: data[k] for k in allowed if k in data}
    if "age" in update and update["age"] is not None:
        update["age"] = int(update["age"])
    update["updatedAt"] = datetime.now(timezone.utc)

    users = get_collection("users")
    users.update_one({"_id": g.current_user_id}, {"$set": update})
    user = users.find_one({"_id": g.current_user_id})
    return jsonify({"user": {
        "_id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "profession": user.get("profession", ""),
        "age": user.get("age"),
        "phone": user.get("phone", ""),
        "activeCareerId": str(user["activeCareerId"]) if user.get("activeCareerId") else None,
        "activeCareerName": user.get("activeCareerName"),
        "streak": user.get("streak", 0),
        "onboardingStep": user.get("onboardingStep", "career"),
    }}), 200


@users_bp.route("/onboarding", methods=["GET"])
@token_required
def get_onboarding():
    user = g.current_user
    return jsonify({"step": user.get("onboardingStep", "career")}), 200


@users_bp.route("/onboarding", methods=["PUT"])
@token_required
def update_onboarding():
    data = request.get_json() or {}
    step = data.get("step")
    if not step:
        return jsonify({"error": "Step is required"}), 400

    users = get_collection("users")
    users.update_one({"_id": g.current_user_id}, {"$set": {"onboardingStep": step}})
    return jsonify({"step": step}), 200
