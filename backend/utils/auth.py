import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import request, jsonify, g

from config import Config
from db import get_collection
from utils.serialization import to_objectid


# ============================================================
# GENERATE JWT TOKEN
# ============================================================

def generate_token(user_id, role="user"):
    payload = {
        "user_id": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }

    return jwt.encode(
        payload,
        Config.JWT_SECRET_KEY,
        algorithm="HS256"
    )


# ============================================================
# DECODE JWT TOKEN
# ============================================================

def decode_token(token):
    try:
        return jwt.decode(
            token,
            Config.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None


# ============================================================
# NORMAL USER AUTHENTICATION
# ============================================================

def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Authentication required"
            }), 401

        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({
                "error": "Authentication required"
            }), 401

        payload = decode_token(token)

        if payload is None:
            return jsonify({
                "error": "Invalid or expired token"
            }), 401

        # Admin tokens cannot access normal user APIs
        if payload.get("role") != "user":
            return jsonify({
                "error": "User access required"
            }), 403

        user_id = payload.get("user_id")

        if not user_id:
            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        try:
            object_id = to_objectid(user_id)
        except Exception:
            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        if object_id is None:
            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        users = get_collection("users")

        user = users.find_one({
            "_id": object_id
        })

        if user is None:
            return jsonify({
                "error": "User not found"
            }), 401

        # Database role must also be user
        if user.get("role", "user") != "user":
            return jsonify({
                "error": "User access required"
            }), 403

        g.current_user = user
        g.current_user_id = user["_id"]

        return f(*args, **kwargs)

    return decorated


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

def admin_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Admin authentication required"
            }), 401

        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({
                "error": "Admin authentication required"
            }), 401

        payload = decode_token(token)

        if payload is None:
            return jsonify({
                "error": "Invalid or expired token"
            }), 401

        # JWT must be an admin token
        if payload.get("role") != "admin":
            return jsonify({
                "error": "Admin access required"
            }), 403

        user_id = payload.get("user_id")

        if not user_id:
            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        try:
            object_id = to_objectid(user_id)
        except Exception:
            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        if object_id is None:
            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        users = get_collection("users")

        user = users.find_one({
            "_id": object_id
        })

        if user is None:
            return jsonify({
                "error": "Admin account not found"
            }), 403

        # Database role must also be admin
        if user.get("role") != "admin":
            return jsonify({
                "error": "Admin access required"
            }), 403

        g.current_user = user
        g.current_user_id = user["_id"]

        return f(*args, **kwargs)

    return decorated