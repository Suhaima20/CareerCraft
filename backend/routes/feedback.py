from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone

from db import get_collection
from utils.auth import token_required, decode_token
from utils.serialization import serialize_doc, to_objectid


# ============================================================
# FEEDBACK BLUEPRINT
# ============================================================

feedback_bp = Blueprint(
    "feedback",
    __name__
)


# ============================================================
# OPTIONAL USER LOOKUP
# ============================================================

def _get_user_from_token():
    """
    Returns the logged-in user when a valid Bearer token
    is provided.

    Guest feedback is also allowed.
    """

    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return None

    payload = decode_token(token)

    if payload is None:
        return None

    try:
        user_id = payload.get("user_id")

        if not user_id:
            return None

        object_id = to_objectid(user_id)

        if object_id is None:
            return None

        user = get_collection("users").find_one({
            "_id": object_id
        })

        # Only treat normal users as logged-in users here.
        if user and user.get("role", "user") == "user":
            return user

        return None

    except Exception:
        return None


# ============================================================
# SUBMIT FEEDBACK
#
# POST /api/feedback
# ============================================================

@feedback_bp.route(
    "/feedback",
    methods=["POST", "OPTIONS"]
)
def submit_feedback():

    # --------------------------------------------------------
    # CORS preflight
    # --------------------------------------------------------

    if request.method == "OPTIONS":
        return jsonify({
            "status": "ok"
        }), 200

    # --------------------------------------------------------
    # Read JSON
    # --------------------------------------------------------

    data = request.get_json(silent=True) or {}

    message = str(
        data.get("message") or ""
    ).strip()

    name = str(
        data.get("name") or "Guest"
    ).strip()

    email = data.get("email")

    if email:
        email = str(email).strip().lower()

    # --------------------------------------------------------
    # Validation
    # --------------------------------------------------------

    if not message:
        return jsonify({
            "error": "Feedback message is required"
        }), 400

    if len(message) > 2000:
        return jsonify({
            "error": "Feedback must be under 2000 characters"
        }), 400

    # --------------------------------------------------------
    # Identify logged-in normal user
    # --------------------------------------------------------

    user = _get_user_from_token()

    user_id = user["_id"] if user else None

    # Use account details when available
    if user:
        name = user.get("name") or name
        email = user.get("email") or email

    # --------------------------------------------------------
    # Create feedback document
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    doc = {
        "userId": user_id,
        "name": name,
        "email": email,
        "message": message,

        # Feedback status
        "status": "pending",

        # Admin response fields
        "adminReply": None,
        "repliedAt": None,
        "repliedBy": None,

        # Timestamps
        "createdAt": now,
        "updatedAt": now,
    }

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    result = get_collection(
        "feedback"
    ).insert_one(doc)

    doc["_id"] = result.inserted_id

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return jsonify({
        "message": "Feedback submitted successfully",
        "feedback": serialize_doc(doc)
    }), 201


# ============================================================
# LIST CURRENT USER'S FEEDBACK
#
# GET /api/feedback
#
# IMPORTANT:
# A normal user can ONLY see their own feedback.
# ============================================================

@feedback_bp.route(
    "/feedback",
    methods=["GET", "OPTIONS"]
)
@token_required
def list_feedback():

    if request.method == "OPTIONS":
        return jsonify({
            "status": "ok"
        }), 200

    feedback = list(
        get_collection("feedback")
        .find({
            "userId": g.current_user_id
        })
        .sort("createdAt", -1)
        .limit(50)
    )

    return jsonify({
        "feedback": serialize_doc(feedback)
    }), 200


# ============================================================
# GET SINGLE USER FEEDBACK
#
# GET /api/feedback/<feedback_id>
#
# IMPORTANT:
# A normal user can ONLY access their own feedback.
# ============================================================

@feedback_bp.route(
    "/feedback/<feedback_id>",
    methods=["GET", "OPTIONS"]
)
@token_required
def get_feedback(feedback_id):

    if request.method == "OPTIONS":
        return jsonify({
            "status": "ok"
        }), 200

    # --------------------------------------------------------
    # Validate ID
    # --------------------------------------------------------

    feedback_object_id = to_objectid(feedback_id)

    if feedback_object_id is None:
        return jsonify({
            "error": "Invalid feedback ID"
        }), 400

    # --------------------------------------------------------
    # Find ONLY this user's feedback
    # --------------------------------------------------------

    feedback = get_collection("feedback").find_one({
        "_id": feedback_object_id,
        "userId": g.current_user_id
    })

    if not feedback:
        return jsonify({
            "error": "Feedback not found"
        }), 404

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return jsonify({
        "feedback": serialize_doc(feedback)
    }), 200