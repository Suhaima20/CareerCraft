from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.user import User

user_bp = Blueprint("user", __name__)


# ============================
# GET USER PROFILE
# ============================

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():

    email = get_jwt_identity()

    user = User.find_by_email(email)

    if not user:
        return {
            "message": "User not found"
        }, 404

    return {
        "name": user.get("name"),
        "email": user.get("email"),

        # Basic Profile
        "age": user.get("age"),
        "gender": user.get("gender"),
        "qualification": user.get("qualification"),
        "college": user.get("college"),
        "branch": user.get("branch"),
        "graduationYear": user.get("graduationYear"),
        "currentStatus": user.get("currentStatus"),

        # Career
        "targetCareer": user.get("targetCareer"),
        "activeCareer": user.get("activeCareer"),

        # Profile Creation Method
        "inputMethod": user.get("inputMethod"),

        # Skills
        "skills": user.get("skills", []),

        # Resume
        "resume": user.get("resume", {}),

        # Progress
        "roadmapProgress": user.get("roadmapProgress", []),

        # Career History
        "careerHistory": user.get("careerHistory", [])
    }, 200


# ============================
# SAVE BASIC PROFILE
# ============================

@user_bp.route("/profile", methods=["POST"])
@jwt_required()
def save_profile():

    email = get_jwt_identity()

    user = User.find_by_email(email)

    if not user:
        return {
            "message": "User not found"
        }, 404

    data = request.get_json()

    profile_data = {
        "age": data.get("age"),
        "gender": data.get("gender"),
        "qualification": data.get("qualification"),
        "college": data.get("college"),
        "branch": data.get("branch"),
        "graduationYear": data.get("graduationYear"),
        "currentStatus": data.get("currentStatus")
    }

    user_id = str(user["_id"])

    User.update_profile(
        user_id,
        profile_data
    )

    return {
        "message": "Profile saved successfully",
        "profile": profile_data
    }, 200


# ============================
# SAVE MANUAL SKILLS
# ============================

@user_bp.route("/skills", methods=["POST"])
@jwt_required()
def save_skills():

    email = get_jwt_identity()

    user = User.find_by_email(email)

    if not user:
        return {
            "message": "User not found"
        }, 404

    data = request.get_json()

    skills = data.get("skills")

    if not skills:
        return {
            "message": "Skills are required"
        }, 400

    user_id = str(user["_id"])

    User.update_skills(
        user_id,
        skills
    )

    return {
        "message": "Skills saved successfully",
        "skills": skills
    }, 200