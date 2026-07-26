from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from datetime import datetime

from models.user import User

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    # Validate required fields
    if not name or not email or not password:
        return {"message": "Name, email and password are required"}, 400

    # Check if user already exists
    existing_user = User.find_by_email(email)

    if existing_user:
        return {"message": "User already exists"}, 400

    # Hash password
    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    # Create user document
    user_data = {
        "name": name,
        "email": email,
        "password": hashed_password,

        # Career Information
        "targetCareer": None,
        "activeCareer": None,

        # How the user creates their profile
        "inputMethod": None,

        # User Skills
        "skills": [],

        # Resume Information
        "resume": {
            "fileName": None,
            "fileUrl": None,
            "uploadedAt": None
        },

        # Learning Progress
        "roadmapProgress": [],

        # Career History
        "careerHistory": [],

        # Metadata
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    User.create_user(user_data)

    return {
        "message": "User registered successfully"
    }, 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # Validate required fields
    if not email or not password:
        return {"message": "Email and password are required"}, 400

    user = User.find_by_email(email)

    if not user:
        return {"message": "User not found"}, 404

    if bcrypt.check_password_hash(user["password"], password):
        token = create_access_token(identity=email)

        return {
            "message": "Login successful",
            "token": token,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "targetCareer": user.get("targetCareer"),
                "activeCareer": user.get("activeCareer"),
                "inputMethod": user.get("inputMethod")
            }
        }, 200

    return {"message": "Invalid password"}, 401