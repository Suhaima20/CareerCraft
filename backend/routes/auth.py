import bcrypt

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify

from db import get_collection
from utils.auth import generate_token


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# ============================================================
# ACCOUNT STATUS
# ============================================================

def is_account_active(user):
    """
    Determine whether an account is active.

    Legacy accounts without an active-status field are treated
    as active.

    If any supported active-status field is explicitly False,
    the account is considered deactivated.
    """

    status_fields = ("is_active", "isActive", "active")

    for field in status_fields:
        if field in user and user[field] is False:
            return False

    return True


# ============================================================
# PUBLIC USER DATA
# ============================================================

def public_user(user):
    """
    Return safe account information without exposing password data.
    """

    return {
        "_id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "profession": user.get("profession", ""),
        "age": user.get("age"),
        "phone": user.get("phone", ""),

        "activeCareerId": (
            str(user["activeCareerId"])
            if user.get("activeCareerId")
            else None
        ),

        "activeCareerName": user.get("activeCareerName"),
        "streak": user.get("streak", 0),
        "onboardingStep": user.get("onboardingStep", "career"),

        "isActive": is_account_active(user),
    }


# ============================================================
# REQUEST VALIDATION
# ============================================================

def get_request_data():
    """
    Return a JSON object or None for invalid request bodies.
    """

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return None

    return data


def validate_credentials(data):
    """
    Validate email and password fields.
    """

    email = data.get("email", "")
    password = data.get("password", "")

    if not isinstance(email, str) or not isinstance(password, str):
        return None, None, (
            jsonify({
                "error": "Email and password must be strings"
            }),
            400,
        )

    email = email.strip().lower()

    if not email or "@" not in email:
        return None, None, (
            jsonify({
                "error": "Valid email is required"
            }),
            400,
        )

    if not password:
        return None, None, (
            jsonify({
                "error": "Password is required"
            }),
            400,
        )

    return email, password, None


def verify_password(password, password_hash):
    """
    Safely verify a password against a bcrypt hash.
    """

    if not isinstance(password_hash, str) or not password_hash:
        return False

    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )

    except (ValueError, TypeError):
        return False


# ============================================================
# USER REGISTRATION
# ============================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = get_request_data()

    if data is None:
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    name = data.get("name", "")
    email = data.get("email", "")
    password = data.get("password", "")
    age = data.get("age")
    phone = data.get("phone", "")
    profession = data.get("profession", "")

    # Validate field types.

    if not isinstance(name, str):
        return jsonify({
            "error": "Name must be a string"
        }), 400

    if not isinstance(email, str):
        return jsonify({
            "error": "Email must be a string"
        }), 400

    if not isinstance(password, str):
        return jsonify({
            "error": "Password must be a string"
        }), 400

    if not isinstance(phone, str):
        return jsonify({
            "error": "Phone must be a string"
        }), 400

    if not isinstance(profession, str):
        return jsonify({
            "error": "Profession must be a string"
        }), 400

    name = name.strip()
    email = email.strip().lower()
    phone = phone.strip()
    profession = profession.strip()

    if len(name) < 2:
        return jsonify({
            "error": "Name must be at least 2 characters"
        }), 400

    if not email or "@" not in email:
        return jsonify({
            "error": "Valid email is required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must be at least 8 characters"
        }), 400

    # Validate optional age.

    parsed_age = None

    if age not in (None, ""):

        try:
            if isinstance(age, bool):
                raise ValueError

            parsed_age = int(age)

            if parsed_age < 1 or parsed_age > 120:
                raise ValueError

        except (TypeError, ValueError, OverflowError):

            return jsonify({
                "error": "Age must be a valid number between 1 and 120"
            }), 400

    users = get_collection("users")

    if users.find_one({"email": email}):

        return jsonify({
            "error": "Email already registered"
        }), 409

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    now = datetime.now(timezone.utc)

    user_doc = {

        "name": name,
        "email": email,

        "password_hash": password_hash,

        "age": parsed_age,
        "phone": phone,
        "profession": profession,

        "role": "user",

        # New accounts are active by default.
        "is_active": True,
        "isActive": True,
        "active": True,

        "activeCareerId": None,
        "activeCareerName": None,

        "streak": 0,
        "lastActivityDate": None,

        "onboardingStep": "career",

        "createdAt": now,
    }

    result = users.insert_one(user_doc)

    user_doc["_id"] = result.inserted_id

    token = generate_token(
        result.inserted_id,
        "user",
    )

    return jsonify({
        "access_token": token,
        "user": public_user(user_doc),
    }), 201


# ============================================================
# REGULAR USER LOGIN
# ============================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = get_request_data()

    if data is None:
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    email, password, error = validate_credentials(data)

    if error is not None:
        return error

    users = get_collection("users")

    user = users.find_one({
        "email": email
    })

    if user is None:

        return jsonify({
            "error": "Invalid email or password"
        }), 401

    # Admins must use the admin login endpoint.

    if user.get("role", "user") != "user":

        return jsonify({
            "error": "Please use the admin login"
        }), 403

    password_hash = user.get("password_hash")

    if not password_hash:

        return jsonify({
            "error": "Account authentication data is incomplete"
        }), 500

    if not verify_password(password, password_hash):

        return jsonify({
            "error": "Invalid email or password"
        }), 401

    # --------------------------------------------------------
    # ACCOUNT DEACTIVATION CHECK
    # --------------------------------------------------------

    if not is_account_active(user):

        return jsonify({
            "error": (
                "Your account has been deactivated. "
                "Please contact the administrator."
            ),
            "accountDeactivated": True,
        }), 403

    # --------------------------------------------------------
    # GENERATE TOKEN
    # --------------------------------------------------------

    token = generate_token(
        user["_id"],
        "user",
    )

    return jsonify({
        "access_token": token,
        "user": public_user(user),
    }), 200


# ============================================================
# ADMIN LOGIN
# ============================================================

@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():

    data = get_request_data()

    if data is None:
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    email, password, error = validate_credentials(data)

    if error is not None:
        return error

    users = get_collection("users")

    user = users.find_one({
        "email": email
    })

    if user is None:

        return jsonify({
            "error": "Invalid credentials"
        }), 401

    # Only accounts explicitly assigned the admin role
    # may log in through this endpoint.

    if user.get("role") != "admin":

        return jsonify({
            "error": "This account does not have admin privileges"
        }), 403

    password_hash = user.get("password_hash")

    if not password_hash:

        return jsonify({
            "error": "Admin account authentication data is incomplete"
        }), 500

    if not verify_password(password, password_hash):

        return jsonify({
            "error": "Invalid credentials"
        }), 401

    token = generate_token(
        user["_id"],
        "admin",
    )

    return jsonify({
        "access_token": token,
        "user": public_user(user),
    }), 200