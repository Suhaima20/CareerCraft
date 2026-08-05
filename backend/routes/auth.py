from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from datetime import datetime

from models.user import User

from utils.validators import Validator
from utils.response import success_response, error_response


auth_bp = Blueprint(
    "auth",
    __name__
)

bcrypt = Bcrypt()


# ==========================
# Register User
# ==========================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()


    if not data:
        return error_response(
            message="Request body is required",
            status_code=400
        )


    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )


    # Required fields

    missing_fields = Validator.validate_required_fields(
        data,
        [
            "name",
            "email",
            "password"
        ]
    )


    if missing_fields:

        return error_response(
            message="Required fields missing",
            errors=missing_fields,
            status_code=400
        )


    # Email validation

    if not Validator.validate_email(email):

        return error_response(
            message="Invalid email format",
            status_code=400
        )


    # Password validation

    if not Validator.validate_password(password):

        return error_response(
            message="Password must contain minimum 8 characters with uppercase, lowercase and number",
            status_code=400
        )


    # Existing user check

    existing_user = User.find_by_email(email)


    if existing_user:

        return error_response(
            message="User already exists",
            status_code=400
        )


    # Password hashing

    hashed_password = (
        bcrypt
        .generate_password_hash(password)
        .decode("utf-8")
    )


    user_data = {

        "name": name,

        "email": email,

        "password": hashed_password,


        "targetCareer": None,

        "activeCareer": None,


        "inputMethod": None,


        "skills": [],


        "resume": {

            "fileName": None,

            "fileUrl": None,

            "uploadedAt": None
        },


        "roadmapProgress": [],


        "careerHistory": [],


        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }


    User.create_user(
        user_data
    )


    return success_response(
        message="User registered successfully",
        status_code=201
    )



# ==========================
# Login User
# ==========================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()


    if not data:

        return error_response(
            message="Request body is required",
            status_code=400
        )


    email = data.get(
        "email",
        ""
    ).strip().lower()


    password = data.get(
        "password",
        ""
    )


    if not email or not password:

        return error_response(
            message="Email and password are required",
            status_code=400
        )


    user = User.find_by_email(
        email
    )


    if not user:

        return error_response(
            message="Invalid email or password",
            status_code=401
        )


    if not bcrypt.check_password_hash(
        user["password"],
        password
    ):

        return error_response(
            message="Invalid email or password",
            status_code=401
        )


    token = create_access_token(
        identity=email
    )


    return success_response(

        message="Login successful",

        data={

            "token": token,

            "user": {

                "name": user["name"],

                "email": user["email"],

                "targetCareer": user.get(
                    "targetCareer"
                ),

                "activeCareer": user.get(
                    "activeCareer"
                ),

                "inputMethod": user.get(
                    "inputMethod"
                )
            }
        },

        status_code=200
    )