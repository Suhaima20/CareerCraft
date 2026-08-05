from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from database.db import careers_collection
from models.user import User
from services.career_recommendation import recommend_careers

career_bp = Blueprint("career", __name__)


# ======================================
# Get All Careers from MongoDB
# ======================================

@career_bp.route("/list", methods=["GET"])
def get_careers():

    try:

        careers = careers_collection.find()

        career_names = []

        for career in careers:

            career_names.append(
                career["Career name"]
            )

        return {
            "careers": career_names
        }, 200

    except Exception as e:

        return {
            "message": "Unable to load careers",
            "error": str(e)
        }, 500


# ======================================
# Select Career
# ======================================

@career_bp.route("/select", methods=["POST"])
@jwt_required()
def select_career():

    email = get_jwt_identity()

    user = User.find_by_email(email)

    if not user:
        return {
            "message": "User not found"
        }, 404

    data = request.get_json()

    career = data.get("career")

    if not career:
        return {
            "message": "Career is required"
        }, 400

    user_id = str(user["_id"])

    User.update_target_career(
        user_id,
        career
    )

    User.update_active_career(
        user_id,
        career
    )

    return {
        "message": "Career selected successfully",
        "targetCareer": career,
        "activeCareer": career
    }, 200


# ======================================
# Career Recommendation
# ======================================

@career_bp.route("/recommend", methods=["POST"])
@jwt_required()
def recommend():

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
            "message": "Skills required"
        }, 400

    result = recommend_careers(skills)

    return result, 200