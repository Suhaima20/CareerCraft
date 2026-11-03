import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import request, jsonify, g

from config import Config
from db import get_collection
from utils.serialization import to_objectid


# ============================================================
# TOKEN GENERATION
# ============================================================

def generate_token(user_id, role="user"):
    """Generate a signed JWT for a regular user or admin."""

    if role not in ("user", "admin"):
        raise ValueError("Invalid authentication role")

    now = datetime.now(timezone.utc)

    payload = {
        "user_id": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(
            hours=Config.JWT_EXPIRATION_HOURS
        ),
    }

    return jwt.encode(
        payload,
        Config.JWT_SECRET_KEY,
        algorithm="HS256",
    )


# ============================================================
# TOKEN DECODING
# ============================================================

def decode_token(token):
    """Decode a valid JWT. Return None if invalid or expired."""

    if not isinstance(token, str) or not token.strip():
        return None

    try:
        return jwt.decode(
            token.strip(),
            Config.JWT_SECRET_KEY,
            algorithms=["HS256"],
        )
    except (jwt.InvalidTokenError, ValueError, TypeError):
        return None


# ============================================================
# ACCOUNT STATUS
# ============================================================

def is_account_active(user):
    """
    Check regular-user account status.

    Legacy accounts without a status field remain active.
    An explicitly False value in any supported field
    means the account is deactivated.
    """

    for field in ("is_active", "isActive", "active"):
        if user.get(field) is False:
            return False

    return True


# ============================================================
# AUTHENTICATION RESPONSE HELPERS
# ============================================================

def _auth_error(message, status_code):
    return jsonify({"error": message}), status_code


def _get_bearer_token():
    """Extract the token from an Authorization Bearer header."""

    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[len("Bearer "):].strip()

    return token or None


# ============================================================
# REQUEST AUTHENTICATION
# ============================================================

def _authenticate_request(required_role):
    """
    Validate JWT, database account, role and account status.

    Regular users must have active accounts.
    Admin authentication is not affected by student deactivation.
    """

    token = _get_bearer_token()

    if not token:
        role_label = (
            "Admin authentication required"
            if required_role == "admin"
            else "Authentication required"
        )
        return None, _auth_error(role_label, 401)

    payload = decode_token(token)

    if payload is None:
        return None, _auth_error(
            "Invalid or expired token",
            401,
        )

    if payload.get("role") != required_role:
        return None, _auth_error(
            (
                "Admin access required"
                if required_role == "admin"
                else "User access required"
            ),
            403,
        )

    user_id = payload.get("user_id")

    if not user_id:
        return None, _auth_error(
            "Invalid authentication token",
            401,
        )

    try:
        object_id = to_objectid(user_id)
    except (TypeError, ValueError):
        object_id = None

    if object_id is None:
        return None, _auth_error(
            "Invalid authentication token",
            401,
        )

    user = get_collection("users").find_one({
        "_id": object_id
    })

    if user is None:
        return None, _auth_error(
            (
                "Admin account not found"
                if required_role == "admin"
                else "User not found"
            ),
            401,
        )

    database_role = user.get("role", "user")

    if database_role != required_role:
        return None, _auth_error(
            (
                "Admin access required"
                if required_role == "admin"
                else "User access required"
            ),
            403,
        )

    # Reject deactivated regular users, including users
    # presenting previously issued, unexpired JWTs.
    if required_role == "user" and not is_account_active(user):
        return None, _auth_error(
            "Your account has been deactivated. Please contact the administrator.",
            403,
        )

    return user, None


# ============================================================
# REGULAR-USER AUTHENTICATION
# ============================================================

def token_required(f):
    """Protect endpoints intended exclusively for regular users."""

    @wraps(f)
    def decorated(*args, **kwargs):

        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        user, error = _authenticate_request("user")

        if error is not None:
            return error

        g.current_user = user
        g.current_user_id = user["_id"]

        return f(*args, **kwargs)

    return decorated


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

def admin_required(f):
    """Protect endpoints intended exclusively for administrators."""

    @wraps(f)
    def decorated(*args, **kwargs):

        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        user, error = _authenticate_request("admin")

        if error is not None:
            return error

        g.current_user = user
        g.current_user_id = user["_id"]

        return f(*args, **kwargs)

    return decorated