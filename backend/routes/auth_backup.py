from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from datetime import datetime
import re

from models.user import User


auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()


# Email validation
def is_valid_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email)


# Strong password validation
def is_strong_password(password):
    if len(password) < 8:
        return False

    if not re.search(r"[A-Z]", password):
        return False

    if not re.search(r"[a-z]", password):
        return False

    if not re.search(r"[0-9]", password):
        return False

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False

    return True


@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")


    # Required fields
    if not name or not email or not password:
        return {
            "message": "Name, email and password are required"
        }, 400


    # Email validation
    if not is_valid_email(email):
        return {
            "message": "Invalid email format"
        }, 400


    # Password strength validation
    if not is_strong_password(password):
        return {
            "message": "Password must contain minimum 8 characters, uppercase, lowercase, number and special character"
        }, 400


    # Existing user check
    existing_user = User.find_by_email(email)

    if existing_user:
        return {
            "message": "User already exists"
        }, 400



    # Password hashing
    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")


    user_data = {

        "name": name,
        "email": email,
        "password": hashed_password,


        # Career Information
        "targetCareer": None,
        "activeCareer": None,


        # Profile creation method
        "inputMethod": None,


        # Skills
        "skills": [],


        # Resume
        "resume": {
            "fileName": None,
            "fileUrl": None,
            "uploadedAt": None
        },


        # Learning
        "roadmapProgress": [],


        # Career history
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

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")


    if not email or not password:
        return {
            "message": "Email and password are required"
        }, 400



    user = User.find_by_email(email)


    # Security improvement:
    # Don't reveal whether email exists
    if not user:
        return {
            "message": "Invalid email or password"
        }, 401



    if not bcrypt.check_password_hash(user["password"], password):

        return {
            "message": "Invalid email or password"
        }, 401



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