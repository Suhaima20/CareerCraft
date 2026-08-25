import bcrypt
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from db import get_collection
from utils.auth import generate_token, token_required
from utils.serialization import serialize_doc, to_objectid

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def public_user(user):
    return {
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
    }


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    age = data.get("age")
    phone = data.get("phone", "")
    profession = data.get("profession", "")

    if not name or len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400
    if not password or len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    users = get_collection("users")
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user_doc = {
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "age": int(age) if age else None,
        "phone": phone,
        "profession": profession,
        "role": "user",
        "activeCareerId": None,
        "activeCareerName": None,
        "streak": 0,
        "lastActivityDate": None,
        "onboardingStep": "career",
        "createdAt": datetime.now(timezone.utc),
    }
    result = users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    token = generate_token(result.inserted_id, "user")
    return jsonify({"access_token": token, "user": public_user(user_doc)}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    users = get_collection("users")
    user = users.find_one({"email": email})
    if user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user["_id"], user.get("role", "user"))
    return jsonify({"access_token": token, "user": public_user(user)}), 200


@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    users = get_collection("users")
    user = users.find_one({"email": email})
    if user is None:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid credentials"}), 401

    if user.get("role") != "admin":
        return jsonify({"error": "This account does not have admin privileges"}), 403

    token = generate_token(user["_id"], "admin")
    return jsonify({"access_token": token, "user": public_user(user)}), 200
