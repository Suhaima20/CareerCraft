import json
import os

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.user import User
from services.career_recommendation import recommend_careers

career_bp = Blueprint("career", __name__)

# Path to careers.json
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAREERS_FILE = os.path.join(BASE_DIR, "data", "careers.json")


@career_bp.route("/list", methods=["GET"])
def get_careers():
    try:
        with open(CAREERS_FILE, "r", encoding="utf-8") as file:
            careers = json.load(file)

        career_names = [
            career["career"]
            for career in careers
        ]

        return {
            "careers": career_names
        }, 200

    except Exception as e:
        return {
            "message": "Unable to load careers",
            "error": str(e)
        }, 500


@career_bp.route("/select", methods=["POST"])
@jwt_required()
def select_career():

    email = get_jwt_identity()
    print("JWT Identity:", email)

    user = User.find_by_email(email)

    if not user:
        return {"message": "User not found"}, 404

    data = request.get_json()

    career = data.get("career")

    if not career:
        return {"message": "Career is required"}, 400

    user_id = str(user["_id"])

    User.update_target_career(user_id, career)
    User.update_active_career(user_id, career)

    return {
        "message": "Career selected successfully",
        "targetCareer": career,
        "activeCareer": career
    }, 200

@career_bp.route("/recommend", methods=["POST"])
@jwt_required()
def recommend():

    email = get_jwt_identity()

    user = User.find_by_email(email)

    if not user:
        return {
            "message": "User not found"
        },404


    data = request.get_json()

    skills = data.get("skills")


    if not skills:
        return {
            "message":"Skills required"
        },400


    result = recommend_careers(skills)


    return result,200