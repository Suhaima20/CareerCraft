from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from bson import ObjectId

from db import get_collection
from utils.auth import token_required, admin_required
from utils.serialization import serialize_doc


# ============================================================
# APTITUDE PRACTICE BLUEPRINT
# ============================================================

aptitude_bp = Blueprint("aptitude", __name__)


# ============================================================
# STUDENT: LIST ACTIVE APTITUDE RESOURCES
# GET /api/aptitude-resources/
# GET /api/aptitude-resources/?category=Quantitative%20Aptitude
# ============================================================

@aptitude_bp.route("/", methods=["GET", "OPTIONS"])
@token_required
def list_aptitude_resources():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    category = str(request.args.get("category") or "").strip()

    query = {"active": True}

    if category:
        query["category"] = category

    resources = list(
        get_collection("aptitude_resources")
        .find(query)
        .sort([("category", 1), ("title", 1)])
    )

    return jsonify({
        "resources": serialize_doc(resources),
        "count": len(resources)
    }), 200


# ============================================================
# ADMIN: LIST ALL APTITUDE RESOURCES
# GET /api/aptitude-resources/admin
# ============================================================

@aptitude_bp.route("/admin", methods=["GET", "OPTIONS"])
@admin_required
def admin_list_aptitude_resources():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    resources = list(
        get_collection("aptitude_resources")
        .find({})
        .sort([("category", 1), ("title", 1)])
    )

    return jsonify({
        "resources": serialize_doc(resources),
        "count": len(resources)
    }), 200


# ============================================================
# ADMIN: CREATE APTITUDE RESOURCE
# POST /api/aptitude-resources/admin
# ============================================================

@aptitude_bp.route("/admin", methods=["POST", "OPTIONS"])
@admin_required
def create_aptitude_resource():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True) or {}

    title = str(data.get("title") or "").strip()
    description = str(data.get("description") or "").strip()
    category = str(data.get("category") or "").strip()
    url = str(data.get("url") or "").strip()
    active = data.get("active", True)

    if not title or not category or not url:
        return jsonify({
            "error": "Title, category, and URL are required."
        }), 400

    if not url.startswith(("https://", "http://")):
        return jsonify({
            "error": "Enter a valid HTTP or HTTPS URL."
        }), 400

    if not isinstance(active, bool):
        return jsonify({
            "error": "Active must be true or false."
        }), 400

    now = datetime.now(timezone.utc)

    resource = {
        "title": title,
        "description": description,
        "category": category,
        "url": url,
        "active": active,
        "created_at": now,
        "updated_at": now
    }

    result = get_collection("aptitude_resources").insert_one(resource)
    resource["_id"] = result.inserted_id

    return jsonify({
        "message": "Aptitude resource created successfully.",
        "resource": serialize_doc(resource)
    }), 201


# ============================================================
# ADMIN: UPDATE APTITUDE RESOURCE
# PUT /api/aptitude-resources/admin/<resource_id>
# ============================================================

@aptitude_bp.route(
    "/admin/<resource_id>",
    methods=["PUT", "OPTIONS"]
)
@admin_required
def update_aptitude_resource(resource_id):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        object_id = ObjectId(resource_id)
    except Exception:
        return jsonify({
            "error": "Invalid aptitude resource ID."
        }), 400

    data = request.get_json(silent=True) or {}

    allowed_fields = {
        "title",
        "description",
        "category",
        "url",
        "active"
    }

    updates = {
        key: data[key]
        for key in allowed_fields
        if key in data
    }

    if not updates:
        return jsonify({
            "error": "No valid fields supplied for update."
        }), 400

    for field in ("title", "category", "url"):
        if field in updates:
            updates[field] = str(updates[field] or "").strip()

            if not updates[field]:
                return jsonify({
                    "error": f"{field.capitalize()} cannot be empty."
                }), 400

    if "url" in updates and not updates["url"].startswith(
        ("https://", "http://")
    ):
        return jsonify({
            "error": "Enter a valid HTTP or HTTPS URL."
        }), 400

    if "active" in updates and not isinstance(updates["active"], bool):
        return jsonify({
            "error": "Active must be true or false."
        }), 400

    updates["updated_at"] = datetime.now(timezone.utc)

    collection = get_collection("aptitude_resources")

    result = collection.update_one(
        {"_id": object_id},
        {"$set": updates}
    )

    if result.matched_count == 0:
        return jsonify({
            "error": "Aptitude resource not found."
        }), 404

    resource = collection.find_one({"_id": object_id})

    return jsonify({
        "message": "Aptitude resource updated successfully.",
        "resource": serialize_doc(resource)
    }), 200


# ============================================================
# ADMIN: TOGGLE RESOURCE ACTIVE STATUS
# PUT /api/aptitude-resources/admin/<resource_id>/toggle
# ============================================================

@aptitude_bp.route(
    "/admin/<resource_id>/toggle",
    methods=["PUT", "OPTIONS"]
)
@admin_required
def toggle_aptitude_resource(resource_id):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        object_id = ObjectId(resource_id)
    except Exception:
        return jsonify({
            "error": "Invalid aptitude resource ID."
        }), 400

    collection = get_collection("aptitude_resources")
    resource = collection.find_one({"_id": object_id})

    if not resource:
        return jsonify({
            "error": "Aptitude resource not found."
        }), 404

    new_status = not resource.get("active", True)

    collection.update_one(
        {"_id": object_id},
        {
            "$set": {
                "active": new_status,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return jsonify({
        "message": "Aptitude resource status updated.",
        "active": new_status
    }), 200


# ============================================================
# ADMIN: DELETE APTITUDE RESOURCE
# DELETE /api/aptitude-resources/admin/<resource_id>
# ============================================================

@aptitude_bp.route(
    "/admin/<resource_id>",
    methods=["DELETE", "OPTIONS"]
)
@admin_required
def delete_aptitude_resource(resource_id):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        object_id = ObjectId(resource_id)
    except Exception:
        return jsonify({
            "error": "Invalid aptitude resource ID."
        }), 400

    result = get_collection("aptitude_resources").delete_one(
        {"_id": object_id}
    )

    if result.deleted_count == 0:
        return jsonify({
            "error": "Aptitude resource not found."
        }), 404

    return jsonify({
        "message": "Aptitude resource deleted successfully."
    }), 200