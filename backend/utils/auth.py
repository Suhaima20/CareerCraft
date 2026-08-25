import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from config import Config
from db import get_collection
from utils.serialization import to_objectid


def generate_token(user_id, role="user"):
    payload = {
        "user_id": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        users = get_collection("users")
        user = users.find_one({"_id": to_objectid(payload["user_id"])})
        if user is None:
            return jsonify({"error": "User not found"}), 401
        g.current_user = user
        g.current_user_id = user["_id"]
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Admin authentication required"}), 401
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        if payload.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        users = get_collection("users")
        user = users.find_one({"_id": to_objectid(payload["user_id"])})
        if user is None or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        g.current_user = user
        g.current_user_id = user["_id"]
        return f(*args, **kwargs)

    return decorated
