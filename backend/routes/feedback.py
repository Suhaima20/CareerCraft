from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from db import get_collection
from utils.auth import token_required, decode_token
from utils.serialization import serialize_doc, to_objectid

feedback_bp = Blueprint("feedback", __name__, url_prefix="/feedback")


def _get_user_from_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if payload is None:
        return None
    user = get_collection("users").find_one({"_id": to_objectid(payload["user_id"])})
    return user


@feedback_bp.route("", methods=["POST"])
def submit_feedback():
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    name = (data.get("name") or "Guest").strip()
    email = data.get("email")

    if not message:
        return jsonify({"error": "Feedback message is required"}), 400
    if len(message) > 2000:
        return jsonify({"error": "Feedback must be under 2000 characters"}), 400

    user = _get_user_from_token()
    user_id = user["_id"] if user else None

    doc = {
        "userId": user_id,
        "name": name,
        "email": email,
        "message": message,
        "status": "pending",
        "createdAt": datetime.now(timezone.utc),
    }
    result = get_collection("feedback").insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"feedback": serialize_doc(doc)}), 201


@feedback_bp.route("", methods=["GET"])
@token_required
def list_feedback():
    feedback = list(get_collection("feedback").find().sort("createdAt", -1).limit(50))
    return jsonify({"feedback": serialize_doc(feedback)}), 200
