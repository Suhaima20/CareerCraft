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
        return {"message": "User not found"}, 404

    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "targetCareer": user.get("targetCareer"),
        "activeCareer": user.get("activeCareer"),
        "inputMethod": user.get("inputMethod"),
        "skills": user.get("skills", []),
        "resume": user.get("resume", {}),
        "roadmapProgress": user.get("roadmapProgress", []),
        "careerHistory": user.get("careerHistory", [])
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

