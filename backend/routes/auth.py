from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from models.user import User
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    existing_user = User.find_by_email(email)

    if existing_user:
        return {"message": "User already exists"}, 400

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    user_data = {
        "name": name,
        "email": email,
        "password": hashed_password
    }

    User.create_user(user_data)

    return {"message": "User registered successfully"}, 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    user = User.find_by_email(email)

    if not user:
        return {"message": "User not found"}, 404

    if bcrypt.check_password_hash(user["password"], password):
        token = create_access_token(identity=email)

        return {
            "message": "Login successful",
            "token": token
        }, 200

    return {"message": "Invalid password"}, 401