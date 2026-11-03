"""CareerCraft administration routes.

Master-data fields support both the current workbook schema and legacy API
field names. Assessment questions are managed per skill and proficiency level;
chapter-level quizzes and video-watch requirements are not used by the new flow.
"""

import io
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from bson import ObjectId
from flask import Blueprint, current_app, request, jsonify, g, send_file
from openpyxl import Workbook, load_workbook
from pymongo import DeleteOne, InsertOne

from db import get_collection
from utils.auth import admin_required
from utils.serialization import serialize_doc, to_objectid

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")
LEVELS = ("Beginner", "Intermediate", "Advanced")


def now_utc():
    return datetime.now(timezone.utc)


def _log_action(action, details=None):
    try:
        get_collection("admin_audit_logs").insert_one({
            "adminId": getattr(g, "current_user_id", None),
            "action": action, "details": details or {}, "createdAt": now_utc(),
        })
    except Exception:
        pass


def _create_notification(user_id, notification_type, title, message):
    if not user_id:
        return None
    try:
        doc = {"userId": user_id, "type": notification_type, "title": title,
               "message": message, "read": False, "createdAt": now_utc()}
        result = get_collection("notifications").insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
    except Exception:
        return None


def _cors_response():
    response = jsonify({"status": "ok"})
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,Accept,X-Requested-With"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return response, 200


# ============================================================
# CURRENT ADMIN PROFILE
# ============================================================

@admin_bp.route("/me", methods=["GET", "OPTIONS"])
@admin_required
def get_admin_profile():
    """
    Return the authenticated administrator's public profile.
    Used by the frontend to restore an admin session.
    """
    if request.method == "OPTIONS":
        return _cors_response()

    admin = g.current_user

    return jsonify({
        "user": {
            "_id": str(admin["_id"]),
            "name": admin.get("name", ""),
            "email": admin.get("email", ""),
            "role": admin.get("role", "admin"),
            "profession": admin.get("profession", ""),
            "age": admin.get("age"),
            "phone": admin.get("phone", ""),
        }
    }), 200


def _id_candidates(value):
    if value is None or str(value).strip() == "":
        return []
    value = str(value).strip()
    values = [value]
    try:
        if ObjectId.is_valid(value):
            values.append(ObjectId(value))
    except Exception:
        pass
    result, seen = [], set()
    for item in values:
        key = (type(item).__name__, str(item))
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _ref_query(value, fields):
    clauses = [{field: candidate} for field in fields for candidate in _id_candidates(value)]
    if not clauses:
        return {"_id": None}
    return clauses[0] if len(clauses) == 1 else {"$or": clauses}


def _find_ref(collection_name, value, fields):
    if value is None:
        return None
    return get_collection(collection_name).find_one(_ref_query(value, fields))


def _matches_ref(document, field, target):
    a = {str(x) for x in _id_candidates(document.get(field))}
    b = {str(x) for x in _id_candidates(target)}
    return bool(a & b)


def _pagination():
    try: page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError): page = 1
    try: limit = max(1, min(100, int(request.args.get("limit", 20))))
    except (TypeError, ValueError): limit = 20
    return page, limit


def _pages(total, limit):
    return max(1, (total + limit - 1) // limit)


def _first(doc, *keys, default=None):
    for key in keys:
        if doc.get(key) is not None:
            return doc[key]
    return default


def _active(doc):
    return bool(_first(doc, "is_active", "isActive", "active", default=True))


def _name(doc, kind):
    fields = {"career": ("career_name", "name", "careerName"),
              "skill": ("skill_name", "name", "skillName"),
              "chapter": ("chapter_name", "title", "chapterName")}
    return _first(doc, *fields[kind], default="")


def _safe_regex(value):
    return re.escape(value.strip())


# ------------------------------ dashboard ------------------------------
@admin_bp.route("/stats", methods=["GET", "OPTIONS"])
@admin_required
def get_stats():
    if request.method == "OPTIONS": return _cors_response()
    users = get_collection("users")
    return jsonify({
        "totalUsers": users.count_documents({"role": {"$ne": "admin"}}),
        "activeUsers": users.count_documents({"role": {"$ne": "admin"}, "lastActivityDate": {"$ne": None}}),
        "totalCareers": get_collection("careers").count_documents({}),
        "totalSkills": get_collection("skills").count_documents({}),
        "totalChapters": get_collection("chapters").count_documents({}),
        "totalResumes": get_collection("resumes").count_documents({}),
        "totalFeedback": get_collection("feedback").count_documents({}),
        "totalQuestions": get_collection("questions").count_documents({}),
        "recentUsers": serialize_doc(list(users.find({"role": {"$ne": "admin"}}).sort("createdAt", -1).limit(5))),
    }), 200


# -------------------------------- users ---------------------------------

@admin_bp.route("/users", methods=["GET", "OPTIONS"])
@admin_required
def list_users():
    if request.method == "OPTIONS":
        return _cors_response()

    q = (request.args.get("q") or "").strip()
    page, limit = _pagination()

    query = {"role": {"$ne": "admin"}}

    if q:
        query["$or"] = [
            {
                "name": {
                    "$regex": _safe_regex(q),
                    "$options": "i"
                }
            },
            {
                "email": {
                    "$regex": _safe_regex(q),
                    "$options": "i"
                }
            }
        ]

    coll = get_collection("users")
    total = coll.count_documents(query)

    docs = list(
        coll.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    # Older accounts without a status field are treated as active.
    for user in docs:
        if (
            "is_active" not in user
            and "isActive" not in user
            and "active" not in user
        ):
            user["is_active"] = True

    return jsonify({
        "users": serialize_doc(docs),
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": _pages(total, limit)
    }), 200


@admin_bp.route(
    "/users/<user_id>",
    methods=["GET", "PUT", "OPTIONS"]
)
@admin_required
def user_by_id(user_id):
    if request.method == "OPTIONS":
        return _cors_response()

    if not ObjectId.is_valid(user_id):
        return jsonify({"error": "Invalid user ID"}), 400

    oid = ObjectId(user_id)
    coll = get_collection("users")
    user = coll.find_one({"_id": oid})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("role") == "admin":
        return jsonify({
            "error": "Admin accounts cannot be managed here"
        }), 403

    if request.method == "GET":
        user_skills = get_collection(
            "user_skills"
        ).find_one({"userId": oid}) or {}

        ids = [
            x.get("skillId") if isinstance(x, dict) else x
            for x in user_skills.get("skills", [])
        ]

        user["skills"] = (
            list(
                get_collection("skills").find(
                    _ref_query_many(
                        ids,
                        ["_id", "skill_id", "skillId"]
                    )
                )
            )
            if ids else []
        )

        career_id = user.get("activeCareerId")

        career = (
            _find_ref(
                "careers",
                career_id,
                ["_id", "career_id", "careerId"]
            )
            if career_id else None
        )

        user["activeCareerName"] = (
            _name(career, "career") if career else None
        )

        if (
            "is_active" not in user
            and "isActive" not in user
            and "active" not in user
        ):
            user["is_active"] = True

        return jsonify({
            "user": serialize_doc(user)
        }), 200

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}

        allowed = (
            "name",
            "age",
            "phone",
            "profession"
        )

        update = {
            key: data[key]
            for key in allowed
            if key in data
        }

        if not update:
            return jsonify({
                "error": "No valid fields to update"
            }), 400

        update["updatedAt"] = now_utc()

        coll.update_one(
            {"_id": oid},
            {"$set": update}
        )

        _log_action(
            "update_user",
            {
                "userId": user_id,
                "fields": list(update.keys())
            }
        )

        return jsonify({"updated": True}), 200


# ============================================================
# DEACTIVATE / REACTIVATE STUDENT ACCOUNT
# ============================================================

@admin_bp.route(
    "/users/<user_id>/status",
    methods=["PATCH", "OPTIONS"]
)
@admin_required
def update_user_status(user_id):
    if request.method == "OPTIONS":
        return _cors_response()

    if not ObjectId.is_valid(user_id):
        return jsonify({
            "error": "Invalid user ID"
        }), 400

    data = request.get_json(silent=True) or {}

    # Accept only an explicit boolean.
    if not isinstance(data.get("isActive"), bool):
        return jsonify({
            "error": "isActive must be true or false"
        }), 400

    oid = ObjectId(user_id)
    coll = get_collection("users")

    user = coll.find_one({"_id": oid})

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    # Never allow this endpoint to change administrator accounts.
    if user.get("role") == "admin":
        return jsonify({
            "error": "Administrator accounts cannot be changed here"
        }), 403

    is_active = data["isActive"]
    now = now_utc()

    coll.update_one(
        {"_id": oid},
        {
            "$set": {
                "is_active": is_active,
                "isActive": is_active,
                "active": is_active,
                "updatedAt": now,
                "accountStatusUpdatedAt": now
            }
        }
    )

    updated_user = coll.find_one({"_id": oid})

    _log_action(
        "reactivate_user" if is_active else "deactivate_user",
        {
            "userId": user_id
        }
    )

    return jsonify({
        "message": (
            "User account reactivated successfully"
            if is_active
            else "User account deactivated successfully"
        ),
        "user": serialize_doc(updated_user)
    }), 200

def _ref_query_many(values, fields):
    return _find_ref_many_query(values, fields)


# -------------------------- career/skill/chapter -------------------------
@admin_bp.route("/careers", methods=["GET", "POST", "OPTIONS"])
@admin_required
def careers_collection():
    if request.method == "OPTIONS": return _cors_response()
    coll = get_collection("careers")
    if request.method == "GET":
        q = (request.args.get("q") or "").strip(); query = {}
        if q: query["$or"] = [{k: {"$regex": _safe_regex(q), "$options": "i"}} for k in ("career_name", "name", "career_id", "careerId")]
        docs = list(coll.find(query))
        docs.sort(key=lambda d: _name(d, "career").lower())
        return jsonify({"careers": serialize_doc(docs)}), 200
    data = request.get_json(silent=True) or {}; name = (data.get("career_name") or data.get("name") or data.get("careerName") or "").strip()
    if not name: return jsonify({"error": "Career name is required"}), 400
    if coll.find_one({"$or": [{k: {"$regex": f"^{_safe_regex(name)}$", "$options": "i"}} for k in ("career_name", "name", "careerName")]}): return jsonify({"error": "Career already exists"}), 409
    now = now_utc(); active = bool(data.get("is_active", data.get("active", True)))
    doc = {"career_id": data.get("career_id") or data.get("careerId"), "career_name": name, "name": name, "description": data.get("description", ""), "is_active": active, "active": active, "createdAt": now, "updatedAt": now}
    res = coll.insert_one(doc); doc["_id"] = res.inserted_id; _log_action("create_career", {"careerId": str(res.inserted_id)})
    return jsonify(serialize_doc(doc)), 201


@admin_bp.route("/careers/<career_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@admin_required
def career_by_id(career_id):
    if request.method == "OPTIONS": return _cors_response()
    coll = get_collection("careers"); doc = _find_ref("careers", career_id, ["_id", "career_id", "careerId"])
    if not doc: return jsonify({"error": "Career not found"}), 404
    if request.method == "GET": return jsonify({"career": serialize_doc(doc)}), 200
    if request.method == "PUT":
        data = request.get_json(silent=True) or {}; update = {}
        career_id = _first(data, "career_id", "careerId")
        existing_career_id = _first(doc, "career_id", "careerId")
        if career_id is not None and str(career_id).strip() != str(existing_career_id or "").strip():
            return jsonify({"error": "Career ID cannot be changed after creation"}), 400
        if "description" in data: update["description"] = data["description"]
        if any(k in data for k in ("career_name", "careerName", "name")):
            value = (data.get("career_name") or data.get("careerName") or data.get("name") or "").strip()
            if not value: return jsonify({"error": "Career name cannot be empty"}), 400
            duplicate = coll.find_one({
                "_id": {"$ne": doc["_id"]},
                "$or": [{k: {"$regex": f"^{_safe_regex(value)}$", "$options": "i"}} for k in ("career_name", "name", "careerName")],
            })
            if duplicate: return jsonify({"error": "Career already exists"}), 409
            update.update({"career_name": value, "name": value})
        if "is_active" in data or "active" in data:
            value = bool(data.get("is_active", data.get("active"))); update.update({"is_active": value, "active": value})
        if not update: return jsonify({"error": "No valid fields to update"}), 400
        update["updatedAt"] = now_utc(); coll.update_one({"_id": doc["_id"]}, {"$set": update}); _log_action("update_career", {"careerId": str(doc["_id"])})
        return jsonify({"updated": True}), 200
    career_refs = [value for value in (doc.get("_id"), doc.get("career_id"), doc.get("careerId")) if value is not None]
    related_collections = (
        ("career_skill_mapping", ("careerId", "career_id")),
        ("career_chapter_mapping", ("careerId", "career_id")),
        ("career_progress", ("careerId", "career_id")),
        ("roadmap_progress", ("careerId", "career_id")),
        ("skill_assessments", ("careerId", "career_id")),
        ("assessment_attempts", ("careerId", "career_id")),
        ("users", ("activeCareerId",)),
    )
    if any(_has_related_reference(name, career_refs, fields) for name, fields in related_collections):
        return jsonify({"error": "Career has related mappings or learner progress. Deactivate it instead of deleting it."}), 409
    coll.delete_one({"_id": doc["_id"]})
    _log_action("delete_career", {"careerId": career_id}); return jsonify({"deleted": True}), 200


@admin_bp.route("/skills", methods=["GET", "POST", "OPTIONS"])
@admin_required
def skills_collection():
    if request.method == "OPTIONS": return _cors_response()
    coll = get_collection("skills")
    if request.method == "GET":
        q = (request.args.get("q") or "").strip(); query = {}
        if q: query["$or"] = [{k: {"$regex": _safe_regex(q), "$options": "i"}} for k in ("skill_name", "name", "skill_id", "skillId")]
        docs = list(coll.find(query)); docs.sort(key=lambda d: _name(d, "skill").lower())
        return jsonify({"skills": serialize_doc(docs)}), 200
    data = request.get_json(silent=True) or {}; name = (data.get("skill_name") or data.get("name") or data.get("skillName") or "").strip()
    if not name: return jsonify({"error": "Skill name is required"}), 400
    duplicate = coll.find_one({"$or": [{k: {"$regex": f"^{_safe_regex(name)}$", "$options": "i"}} for k in ("skill_name", "name", "skillName")]})
    if duplicate: return jsonify({"error": "Skill already exists"}), 409
    active = bool(data.get("is_active", data.get("active", True))); now = now_utc()
    doc = {"skill_id": data.get("skill_id") or data.get("skillId"), "skill_name": name, "name": name, "description": data.get("description", ""), "skill_category": data.get("skill_category", data.get("category", "")), "category": data.get("category", data.get("skill_category", "")), "is_active": active, "active": active, "createdAt": now, "updatedAt": now}
    result = coll.insert_one(doc); doc["_id"] = result.inserted_id; _log_action("create_skill", {"skillId": str(result.inserted_id)}); return jsonify(serialize_doc(doc)), 201


@admin_bp.route("/skills/<skill_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@admin_required
def skill_by_id(skill_id):
    if request.method == "OPTIONS": return _cors_response()
    coll = get_collection("skills"); doc = _find_ref("skills", skill_id, ["_id", "skill_id", "skillId"])
    if not doc: return jsonify({"error": "Skill not found"}), 404
    if request.method == "GET": return jsonify({"skill": serialize_doc(doc)}), 200
    if request.method == "PUT":
        data = request.get_json(silent=True) or {}; update = {}
        skill_id = _first(data, "skill_id", "skillId")
        existing_skill_id = _first(doc, "skill_id", "skillId")
        if skill_id is not None and str(skill_id).strip() != str(existing_skill_id or "").strip():
            return jsonify({"error": "Skill ID cannot be changed after creation"}), 400
        if any(k in data for k in ("skill_name", "skillName", "name")):
            name = (data.get("skill_name") or data.get("skillName") or data.get("name") or "").strip()
            if not name: return jsonify({"error": "Skill name cannot be empty"}), 400
            duplicate = coll.find_one({
                "_id": {"$ne": doc["_id"]},
                "$or": [{k: {"$regex": f"^{_safe_regex(name)}$", "$options": "i"}} for k in ("skill_name", "name", "skillName")],
            })
            if duplicate: return jsonify({"error": "Skill already exists"}), 409
            update.update({"skill_name": name, "name": name})
        if "description" in data: update["description"] = data["description"]
        if "skill_category" in data or "category" in data:
            value = data.get("skill_category", data.get("category", "")); update.update({"skill_category": value, "category": value})
        if "is_active" in data or "active" in data:
            value = bool(data.get("is_active", data.get("active"))); update.update({"is_active": value, "active": value})
        if not update: return jsonify({"error": "No valid fields to update"}), 400
        update["updatedAt"] = now_utc(); coll.update_one({"_id": doc["_id"]}, {"$set": update}); _log_action("update_skill", {"skillId": str(doc["_id"])})
        return jsonify({"updated": True}), 200
    skill_refs = [value for value in (doc.get("_id"), doc.get("skill_id"), doc.get("skillId")) if value is not None]
    related_collections = (
        ("skill_chapter_mapping", ("skillId", "skill_id")),
        ("career_skill_mapping", ("skillId", "skill_id")),
        ("chapters", ("skillId", "skill_id", "skillID")),
        ("questions", ("skillId", "skill_id")),
        ("skill_assessments", ("skillId", "skill_id")),
        ("assessment_attempts", ("skillId", "skill_id")),
        ("user_skills", ("skillId", "skill_id", "skills.skillId", "skills.skill_id", "skills")),
    )
    if any(_has_related_reference(name, skill_refs, fields) for name, fields in related_collections):
        return jsonify({"error": "Skill has chapters, mappings, or learner assessment data. Deactivate it instead of deleting it."}), 409
    coll.delete_one({"_id": doc["_id"]})
    _log_action("delete_skill", {"skillId": skill_id}); return jsonify({"deleted": True}), 200


@admin_bp.route("/chapters", methods=["GET", "POST", "OPTIONS"])
@admin_required
def chapters_collection():
    if request.method == "OPTIONS": return _cors_response()
    coll = get_collection("chapters")
    if request.method == "GET":
        q = (request.args.get("q") or "").strip(); query = {}
        if q: query["$or"] = [{k: {"$regex": _safe_regex(q), "$options": "i"}} for k in ("chapter_name", "title", "chapter_id", "chapterId", "skillName")]
        docs = list(coll.find(query))
        skills = list(get_collection("skills").find({}))
        skills_by_ref = {
            str(ref): skill
            for skill in skills
            for ref in (skill.get("_id"), skill.get("skill_id"), skill.get("skillId"))
            if ref is not None
        }
        chapter_skill_refs = {}
        for mapping in get_collection("skill_chapter_mapping").find({}):
            chapter_ref = _first(mapping, "chapterId", "chapter_id")
            skill_ref = _first(mapping, "skillId", "skill_id")
            if chapter_ref is not None and skill_ref is not None:
                chapter_skill_refs.setdefault(str(chapter_ref), skill_ref)
        for chapter in docs:
            skill_ref = _first(chapter, "skillId", "skill_id", "skillID")
            if skill_ref is None:
                skill_ref = next(
                    (
                        chapter_skill_refs[str(ref)]
                        for ref in (chapter.get("_id"), chapter.get("chapter_id"), chapter.get("chapterId"))
                        if ref is not None and str(ref) in chapter_skill_refs
                    ),
                    None,
                )
            skill = skills_by_ref.get(str(skill_ref))
            if skill:
                chapter["skillId"] = skill["_id"]
                chapter["skillName"] = _name(skill, "skill")
        docs.sort(key=lambda d: (_first(d, "chapter_order", "order", default=0) or 0, _name(d, "chapter").lower()))
        return jsonify({"chapters": serialize_doc(docs)}), 200
    data = request.get_json(silent=True) or {}; title = str(data.get("chapter_name") or data.get("title") or data.get("chapterName") or "").strip()
    if not title: return jsonify({"error": "Chapter title is required"}), 400
    skill_ref = data.get("skillId", data.get("skill_id"))
    skill = _find_ref("skills", skill_ref, ["_id", "skill_id", "skillId"]) if skill_ref is not None else None
    if not skill: return jsonify({"error": "A valid skillId is required for every chapter"}), 400
    level = _normalize_level(data.get("proficiency_level", data.get("proficiencyLevel", "Beginner")))
    if not level: return jsonify({"error": "Invalid proficiency level", "allowedLevels": list(LEVELS)}), 400
    active, error = _chapter_active(data.get("is_active", data.get("active", True)))
    if error: return jsonify({"error": error}), 400
    order, error = _chapter_order(data.get("chapter_order", data.get("order", 0)))
    if error: return jsonify({"error": error}), 400
    link, error = _chapter_link(data.get("link", data.get("youtubeUrl", "")))
    if error: return jsonify({"error": error}), 400
    now = now_utc()
    doc = {"chapter_id": data.get("chapter_id") or data.get("chapterId"), "chapter_name": title, "title": title, "description": data.get("description", ""), "link": link, "youtubeUrl": link, "chapter_order": order, "order": order, "skillId": skill["_id"], "skill_id": skill.get("skill_id", skill["_id"]), "skillName": _name(skill, "skill"), "proficiency_level": level.upper(), "proficiencyLevel": level, "is_active": active, "active": active, "createdAt": now, "updatedAt": now}
    res = coll.insert_one(doc); doc["_id"] = res.inserted_id
    _sync_skill_chapter_mapping(doc, skill, order)
    _log_action("create_chapter", {"chapterId": str(res.inserted_id), "skillId": str(skill["_id"]), "proficiencyLevel": level})
    return jsonify(serialize_doc(doc)), 201


def _chapter_order(value):
    if isinstance(value, bool):
        return None, "Chapter order must be a non-negative whole number"
    try:
        order = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, "Chapter order must be a non-negative whole number"
    if order < 0 or str(value).strip() not in (str(order), f"{order}.0"):
        return None, "Chapter order must be a non-negative whole number"
    return order, None


def _chapter_active(value):
    if isinstance(value, bool):
        return value, None
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ("true", "1"):
            return True, None
        if normalized in ("false", "0"):
            return False, None
    if value in (0, 1):
        return bool(value), None
    return None, "Chapter active status must be a boolean"


def _chapter_link(value):
    if value is None:
        return "", None
    if not isinstance(value, str):
        return None, "Chapter learning link must be a URL"
    link = value.strip()
    if not link:
        return "", None
    try:
        parsed = urlparse(link)
    except ValueError:
        return None, "Chapter learning link must be a valid http:// or https:// URL"
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None, "Chapter learning link must be a valid http:// or https:// URL"
    return link, None


def _sync_skill_chapter_mapping(chapter, skill, order):
    """Keep the workbook-era mapping collection aligned with the chapter owner."""
    collection = get_collection("skill_chapter_mapping")
    chapter_refs = [
        value for value in (chapter.get("_id"), chapter.get("chapter_id"), chapter.get("chapterId"))
        if value is not None
    ]
    query = _find_ref_many_query(chapter_refs, ["chapterId", "chapter_id"])
    mappings = list(collection.find(query))
    mapping_fields = {
        "skillId": skill["_id"],
        "chapterId": chapter["_id"],
        "skill_id": skill.get("skill_id", skill["_id"]),
        "chapter_id": chapter.get("chapter_id", chapter["_id"]),
        "order": order,
        "updatedAt": now_utc(),
    }
    if mappings:
        for mapping in mappings:
            collection.update_one({"_id": mapping["_id"]}, {"$set": mapping_fields})
        return
    mapping_fields["createdAt"] = mapping_fields["updatedAt"]
    collection.insert_one(mapping_fields)


@admin_bp.route("/chapters/<chapter_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@admin_required
def chapter_by_id(chapter_id):
    if request.method == "OPTIONS": return _cors_response()
    coll = get_collection("chapters"); doc = _find_ref("chapters", chapter_id, ["_id", "chapter_id", "chapterId"])
    if not doc: return jsonify({"error": "Chapter not found"}), 404
    if request.method == "GET": return jsonify({"chapter": serialize_doc(doc)}), 200
    if request.method == "PUT":
        data = request.get_json(silent=True) or {}; update = {}
        if any(k in data for k in ("chapter_name", "chapterName", "title")):
            title = str(data.get("chapter_name") or data.get("chapterName") or data.get("title") or "").strip()
            if not title: return jsonify({"error": "Chapter title cannot be empty"}), 400
            update.update({"chapter_name": title, "title": title})
        chapter_id = _first(data, "chapter_id", "chapterId")
        existing_chapter_id = _first(doc, "chapter_id", "chapterId")
        if chapter_id is not None and str(chapter_id).strip() != str(existing_chapter_id or "").strip():
            return jsonify({"error": "Chapter ID cannot be changed after creation"}), 400
        for key in ("description", "start_timestamp"):
            if key in data: update[key] = data[key]
        if "skillId" in data or "skill_id" in data:
            skill = _find_ref("skills", data.get("skillId", data.get("skill_id")), ["_id", "skill_id", "skillId"])
            if not skill: return jsonify({"error": "Skill not found"}), 400
            update.update({"skillId": skill["_id"], "skill_id": skill.get("skill_id", skill["_id"]), "skillName": _name(skill, "skill")})
        if "link" in data or "youtubeUrl" in data:
            value, error = _chapter_link(data.get("link", data.get("youtubeUrl", "")))
            if error: return jsonify({"error": error}), 400
            update.update({"link": value, "youtubeUrl": value})
        if "chapter_order" in data or "order" in data:
            value, error = _chapter_order(data.get("chapter_order", data.get("order", 0)))
            if error: return jsonify({"error": error}), 400
            update.update({"chapter_order": value, "order": value})
        if "proficiency_level" in data or "proficiencyLevel" in data:
            level = _normalize_level(data.get("proficiency_level", data.get("proficiencyLevel")))
            if not level: return jsonify({"error": "Invalid proficiency level", "allowedLevels": list(LEVELS)}), 400
            update.update({"proficiency_level": level.upper(), "proficiencyLevel": level})
        if "is_active" in data or "active" in data:
            value, error = _chapter_active(data.get("is_active", data.get("active")))
            if error: return jsonify({"error": error}), 400
            update.update({"is_active": value, "active": value})
        if not update: return jsonify({"error": "No valid fields to update"}), 400
        update["updatedAt"] = now_utc(); coll.update_one({"_id": doc["_id"]}, {"$set": update})
        updated_chapter = {**doc, **update}
        skill = _find_ref("skills", _first(updated_chapter, "skillId", "skill_id", "skillID"), ["_id", "skill_id", "skillId"])
        if skill and updated_chapter.get("_id") is not None:
            _sync_skill_chapter_mapping(
                updated_chapter,
                skill,
                _first(updated_chapter, "chapter_order", "order", default=0),
            )
        _log_action("update_chapter", {"chapterId": str(doc["_id"])})
        return jsonify({"updated": True}), 200
    chapter_refs = [value for value in (doc.get("_id"), doc.get("chapter_id"), doc.get("chapterId")) if value is not None]
    related_collections = (
        ("skill_chapter_mapping", ("chapterId", "chapter_id")),
        ("career_chapter_mapping", ("chapterId", "chapter_id")),
        ("questions", ("chapterId", "chapter_id")),
        ("roadmap_progress", ("chapterId", "chapter_id")),
        ("assessment_attempts", ("chapterId", "chapter_id")),
    )
    if any(_has_related_reference(name, chapter_refs, fields) for name, fields in related_collections):
        return jsonify({"error": "Chapter has mappings, assessment questions, or learner progress. Deactivate it instead of deleting it."}), 409
    coll.delete_one({"_id": doc["_id"]})
    _log_action("delete_chapter", {"chapterId": chapter_id}); return jsonify({"deleted": True}), 200


# ------------------------------ mappings --------------------------------
@admin_bp.route("/mappings/career-skills/<career_id>", methods=["GET", "PUT", "OPTIONS"])
@admin_required
def career_skill_mapping(career_id):
    if request.method == "OPTIONS": return _cors_response()
    career = _find_ref("careers", career_id, ["_id", "career_id", "careerId"])
    if not career: return jsonify({"error": "Career not found"}), 404
    coll = get_collection("career_skill_mapping")
    refs = [x for x in (career.get("_id"), career.get("career_id"), career.get("careerId"), career_id) if x is not None]
    query = _find_ref_many_query(refs, ["careerId", "career_id"])
    if request.method == "GET":
        mappings = list(coll.find(query).sort([("order", 1), ("_id", 1)])); skills = []; seen = set()
        for mapping in mappings:
            ref = _first(mapping, "skillId", "skill_id")
            skill = _find_ref("skills", ref, ["_id", "skill_id", "skillId"]) if ref is not None else None
            if skill and str(skill.get("_id")) not in seen: skills.append(skill); seen.add(str(skill.get("_id")))
        return jsonify({"skills": serialize_doc(skills), "skillIds": [str(s["_id"]) for s in skills]}), 200
    data = request.get_json(silent=True) or {}; ids = data.get("skillIds", [])
    if not isinstance(ids, list): return jsonify({"error": "skillIds must be an array"}), 400
    resolved, invalid, seen = [], [], set()
    for value in ids:
        skill = _find_ref("skills", value, ["_id", "skill_id", "skillId"]) if value is not None else None
        if not skill: invalid.append(value); continue
        key = str(skill["_id"])
        if key not in seen: resolved.append(skill); seen.add(key)
    if invalid: return jsonify({"error": "One or more skills were not found. No mappings were changed.", "invalidSkillIds": invalid}), 400
    existing = list(coll.find(query, {"_id": 1})); ops = [DeleteOne({"_id": x["_id"]}) for x in existing]; now = now_utc()
    ops += [InsertOne({"careerId": career["_id"], "skillId": s["_id"], "order": i, "is_active": True, "createdAt": now, "updatedAt": now}) for i, s in enumerate(resolved, 1)]
    if ops: coll.bulk_write(ops, ordered=True)
    _log_action("set_career_skills", {"careerId": str(career["_id"]), "skillCount": len(resolved)})
    return jsonify({"success": True, "mapped": len(resolved), "skillIds": [str(s["_id"]) for s in resolved]}), 200


@admin_bp.route("/mappings/skill-chapters/<skill_id>", methods=["GET", "PUT", "OPTIONS"])
@admin_required
def skill_chapter_mapping(skill_id):
    if request.method == "OPTIONS": return _cors_response()
    skill = _find_ref("skills", skill_id, ["_id", "skill_id", "skillId"])
    if not skill: return jsonify({"error": "Skill not found"}), 404
    coll = get_collection("skill_chapter_mapping"); refs = [x for x in (skill.get("_id"), skill.get("skill_id"), skill.get("skillId"), skill_id) if x is not None]
    query = _find_ref_many_query(refs, ["skillId", "skill_id"])
    if request.method == "GET":
        mappings = list(coll.find(query).sort([("order", 1), ("_id", 1)])); chapters = []; seen = set()
        for m in mappings:
            ref = _first(m, "chapterId", "chapter_id"); ch = _find_ref("chapters", ref, ["_id", "chapter_id", "chapterId"]) if ref is not None else None
            if ch and str(ch["_id"]) not in seen: chapters.append(ch); seen.add(str(ch["_id"]))
        direct_query = _find_ref_many_query(refs, ["skillId", "skill_id"])
        for chapter in get_collection("chapters").find(direct_query):
            if str(chapter["_id"]) not in seen:
                chapters.append(chapter)
                seen.add(str(chapter["_id"]))
        return jsonify({"chapters": serialize_doc(chapters), "chapterIds": [str(c["_id"]) for c in chapters]}), 200
    data = request.get_json(silent=True) or {}; ids = data.get("chapterIds", [])
    if not isinstance(ids, list): return jsonify({"error": "chapterIds must be an array"}), 400
    resolved, invalid, seen = [], [], set()
    for value in ids:
        ch = _find_ref("chapters", value, ["_id", "chapter_id", "chapterId"]) if value is not None else None
        if not ch: invalid.append(value); continue
        if str(ch["_id"]) not in seen: resolved.append(ch); seen.add(str(ch["_id"]))
    if invalid: return jsonify({"error": "One or more chapters were not found. No mappings were changed.", "invalidChapterIds": invalid}), 400
    old_mappings = list(coll.find(query))
    old_chapters = []
    requested_chapter_ids = {str(chapter["_id"]) for chapter in resolved}
    for mapping in old_mappings:
        chapter_ref = _first(mapping, "chapterId", "chapter_id")
        chapter = _find_ref("chapters", chapter_ref, ["_id", "chapter_id", "chapterId"]) if chapter_ref is not None else None
        if chapter:
            old_chapters.append(chapter)
        if chapter and str(chapter["_id"]) not in requested_chapter_ids:
            coll.delete_one({"_id": mapping["_id"]})
    direct_query = _find_ref_many_query(refs, ["skillId", "skill_id"])
    old_chapter_ids = {str(item["_id"]) for item in old_chapters}
    for chapter in get_collection("chapters").find(direct_query):
        if str(chapter["_id"]) not in old_chapter_ids:
            old_chapters.append(chapter)
            old_chapter_ids.add(str(chapter["_id"]))
    now = now_utc()
    for index, chapter in enumerate(resolved, start=1):
        chapter_refs = [
            value for value in (chapter.get("_id"), chapter.get("chapter_id"), chapter.get("chapterId"))
            if value is not None
        ]
        chapter_query = _find_ref_many_query(chapter_refs, ["chapterId", "chapter_id"])
        chapter_mappings = list(coll.find(chapter_query))
        mapping_fields = {
            "skillId": skill["_id"],
            "chapterId": chapter["_id"],
            "skill_id": skill.get("skill_id", skill["_id"]),
            "chapter_id": chapter.get("chapter_id", chapter["_id"]),
            "order": index,
            "updatedAt": now,
        }
        if chapter_mappings:
            for mapping in chapter_mappings:
                coll.update_one({"_id": mapping["_id"]}, {"$set": mapping_fields})
        else:
            mapping_fields["createdAt"] = now
            coll.insert_one(mapping_fields)
    desired_ids = {str(chapter["_id"]) for chapter in resolved}
    for chapter in {str(ch["_id"]): ch for ch in old_chapters}.values():
        direct_skill_refs = [
            str(chapter[field])
            for field in ("skillId", "skill_id", "skillID")
            if chapter.get(field) is not None
        ]
        selected_skill_refs = {
            str(value)
            for value in (skill.get("_id"), skill.get("skill_id"), skill.get("skillId"))
            if value is not None
        }
        if str(chapter["_id"]) not in desired_ids and (
            not direct_skill_refs or any(ref in selected_skill_refs for ref in direct_skill_refs)
        ):
            get_collection("chapters").update_one(
                {"_id": chapter["_id"]},
                {"$set": {"skillId": None, "skill_id": None, "skillName": "", "updatedAt": now}},
            )
    for index, chapter in enumerate(resolved, start=1):
        get_collection("chapters").update_one(
            {"_id": chapter["_id"]},
            {"$set": {
                "skillId": skill["_id"],
                "skill_id": skill.get("skill_id", skill["_id"]),
                "skillName": _name(skill, "skill"),
                "chapter_order": _first(chapter, "chapter_order", "order", default=index),
                "order": _first(chapter, "chapter_order", "order", default=index),
                "updatedAt": now,
            }},
        )
    _log_action("set_skill_chapters", {"skillId": str(skill["_id"]), "chapterCount": len(resolved)})
    return jsonify({"mapped": len(resolved), "chapterIds": [str(c["_id"]) for c in resolved]}), 200


@admin_bp.route("/careers/<career_id>/overview", methods=["GET", "OPTIONS"])
@admin_required
def career_overview(career_id):
    if request.method == "OPTIONS": return _cors_response()
    career = _find_ref("careers", career_id, ["_id", "career_id", "careerId"])
    if not career: return jsonify({"error": "Career not found"}), 404
    mappings = list(get_collection("career_skill_mapping").find(_find_ref_many_query([career.get("_id"), career.get("career_id"), career_id], ["careerId", "career_id"])).sort("order", 1))
    skills = []
    for m in mappings:
        skill = _find_ref("skills", _first(m, "skillId", "skill_id"), ["_id", "skill_id", "skillId"])
        if not skill: continue
        cmaps = list(get_collection("skill_chapter_mapping").find(_find_ref_many_query([skill.get("_id"), skill.get("skill_id")], ["skillId", "skill_id"])).sort("order", 1))
        chapters = []
        for cm in cmaps:
            ch = _find_ref("chapters", _first(cm, "chapterId", "chapter_id"), ["_id", "chapter_id", "chapterId"])
            if ch: chapters.append(ch)
        skills.append({"_id": skill.get("_id"), "skill_id": _first(skill, "skill_id", "skillId"), "name": _name(skill, "skill"), "category": _first(skill, "skill_category", "category", default=""), "description": skill.get("description", ""), "active": _active(skill), "chapters": serialize_doc(chapters)})
    overview = {"_id": career.get("_id"), "career_id": _first(career, "career_id", "careerId"), "name": _name(career, "career"), "description": career.get("description", ""), "active": _active(career), "skills": skills, "summary": {"totalSkills": len(skills), "totalChapters": sum(len(s["chapters"]) for s in skills), "totalQuizzes": 0, "totalQuestions": get_collection("questions").count_documents({})}}
    return jsonify({"career": serialize_doc(overview)}), 200


# ------------------------- assessment question bank ----------------------
def _normalize_level(value):
    if value is None:
        return None
    normalized = str(value).strip().lower()
    aliases = {
        "beginner": "Beginner", "basic": "Beginner",
        "intermediate": "Intermediate", "medium": "Intermediate",
        "advanced": "Advanced", "expert": "Advanced",
    }
    return aliases.get(normalized)


def _question_skill(skill_id):
    return _find_ref("skills", skill_id, ["_id", "skill_id", "skillId"])


def _question_chapter(chapter_id):
    if chapter_id is None or str(chapter_id).strip() == "":
        return None
    return _find_ref("chapters", chapter_id, ["_id", "chapter_id", "chapterId"])


def _chapter_belongs_to_skill(chapter, skill):
    """Support both direct chapter.skill_id references and legacy mapping rows."""
    direct_refs = [chapter.get(k) for k in ("skillId", "skill_id", "skillID") if chapter.get(k) is not None]
    if direct_refs:
        return any(
            str(ref) in {str(x) for x in (skill.get("_id"), skill.get("skill_id"), skill.get("skillId")) if x is not None}
            or any(isinstance(ref, ObjectId) and ref == skill.get("_id") for _ in [0])
            for ref in direct_refs
        )
    chapter_refs = [x for x in (chapter.get("_id"), chapter.get("chapter_id"), chapter.get("chapterId")) if x is not None]
    skill_refs = [x for x in (skill.get("_id"), skill.get("skill_id"), skill.get("skillId")) if x is not None]
    mapping = get_collection("skill_chapter_mapping")
    for row in mapping.find({}):
        chapter_ref = _first(row, "chapterId", "chapter_id")
        skill_ref = _first(row, "skillId", "skill_id")
        if any(str(chapter_ref) == str(x) for x in chapter_refs) and any(str(skill_ref) == str(x) for x in skill_refs):
            return True
    return False


def _question_query(skill=None, level=None, chapter=None):
    clauses = []
    if skill:
        skill_refs = [x for x in (skill.get("_id"), skill.get("skill_id"), skill.get("skillId")) if x is not None]
        skill_clauses = []
        for ref in skill_refs:
            for candidate in _id_candidates(ref):
                skill_clauses.extend([{"skillId": candidate}, {"skill_id": candidate}])
        clauses.append({"$or": skill_clauses} if skill_clauses else {"_id": None})
    if level:
        level_values = [level, level.upper(), level.lower()]
        clauses.append({"$or": [{field: {"$in": level_values}} for field in ("proficiencyLevel", "proficiency_level", "level", "category")]})
    if chapter:
        chapter_refs = [x for x in (chapter.get("_id"), chapter.get("chapter_id"), chapter.get("chapterId")) if x is not None]
        chapter_clauses = []
        for ref in chapter_refs:
            for candidate in _id_candidates(ref):
                chapter_clauses.extend([{"chapterId": candidate}, {"chapter_id": candidate}])
        clauses.append({"$or": chapter_clauses} if chapter_clauses else {"_id": None})
    if not clauses:
        return {}
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def _clean_question_payload(data, creating=True):
    if not isinstance(data, dict):
        return None, "A question object is required"
    question_text = str(_first(data, "question", "text", "questionText", default="") or "").strip()
    if not question_text:
        return None, "Question text is required"
    options = data.get("options", data.get("choices", []))
    if not isinstance(options, list):
        return None, "options must be an array"
    options = [str(x.get("text", "") if isinstance(x, dict) else x).strip() for x in options]
    if len(options) < 2 or any(not x for x in options):
        return None, "Provide at least two non-empty answer options"
    if len(options) > 6:
        return None, "A maximum of six answer options is supported"
    raw_correct = _first(data, "correctOption", "correct_option", "correctAnswer", "correct_answer", default=None)
    correct = None
    if isinstance(raw_correct, bool):
        return None, "correctOption must be a valid zero-based option index"
    if isinstance(raw_correct, int) or (isinstance(raw_correct, str) and raw_correct.strip().isdigit()):
        candidate = int(raw_correct)
        if 0 <= candidate < len(options):
            correct = candidate
    elif raw_correct is not None:
        raw_text = str(raw_correct).strip()
        for i, option in enumerate(options):
            if option == raw_text:
                correct = i
                break
    if correct is None:
        return None, "correctOption must be a valid zero-based option index"
    explanation = str(data.get("explanation") or "").strip()
    active, active_error = _chapter_active(
        _first(data, "isActive", "is_active", "active", default=True)
    )
    if active_error:
        return None, active_error
    doc = {
        "question": question_text, "text": question_text,
        "options": options, "correctOption": correct, "correctAnswer": correct,
        "explanation": explanation, "isActive": active,
        "is_active": active, "active": active, "updatedAt": now_utc(),
    }
    return doc, None


def _question_level_for_chapter(chapter):
    return _normalize_level(_first(chapter, "proficiencyLevel", "proficiency_level", "level"))


def _question_coverage_summary(questions):
    from routes.quiz import (
        is_active as quiz_question_is_active,
        question_identity,
        valid_question_data,
    )

    active_questions = [
        question for question in questions if quiz_question_is_active(question)
    ]
    identities = set()
    valid_unique_count = 0
    for question in active_questions:
        if not valid_question_data(question):
            continue
        identity = question_identity(question)
        if identity in identities:
            continue
        identities.add(identity)
        valid_unique_count += 1

    return {
        "totalStoredQuestions": len(questions),
        "activeQuestionCount": len(active_questions),
        "validUniqueQuestionCount": valid_unique_count,
    }


@admin_bp.route("/question-bank", methods=["GET", "POST", "OPTIONS"])
@admin_required
def question_bank():
    if request.method == "OPTIONS":
        return _cors_response()
    coll = get_collection("questions")
    if request.method == "GET":
        skill_id = (request.args.get("skillId") or request.args.get("skill_id") or "").strip()
        chapter_id = (request.args.get("chapterId") or request.args.get("chapter_id") or "").strip()
        level_raw = request.args.get("level") or request.args.get("proficiencyLevel") or request.args.get("proficiency_level")
        q = (request.args.get("q") or "").strip()
        page, limit = _pagination()
        query_parts = []
        skill = None
        chapter = None
        if skill_id:
            skill = _question_skill(skill_id)
            if not skill:
                return jsonify({"error": "Skill not found"}), 404
            query_parts.append(_question_query(skill=skill))
        if chapter_id:
            chapter = _question_chapter(chapter_id)
            if not chapter:
                return jsonify({"error": "Chapter not found"}), 404
            if skill and not _chapter_belongs_to_skill(chapter, skill):
                return jsonify({"error": "The selected chapter does not belong to the selected skill"}), 400
            query_parts.append(_question_query(chapter=chapter))
        if level_raw:
            level = _normalize_level(level_raw)
            if not level:
                return jsonify({"error": "Invalid level", "allowedLevels": list(LEVELS)}), 400
            query_parts.append(_question_query(level=level))
        if q:
            query_parts.append({"$or": [{k: {"$regex": _safe_regex(q), "$options": "i"}} for k in ("question", "text", "questionText")]})
        query = query_parts[0] if len(query_parts) == 1 else ({"$and": query_parts} if query_parts else {})
        total = coll.count_documents(query)
        docs = list(coll.find(query).sort([("createdAt", -1), ("_id", 1)]).skip((page - 1) * limit).limit(limit))
        return jsonify({"questions": serialize_doc(docs), "total": total, "page": page, "limit": limit, "totalPages": _pages(total, limit), "levels": list(LEVELS)}), 200

    data = request.get_json(silent=True) or {}
    skill_id = data.get("skillId", data.get("skill_id"))
    chapter_id = data.get("chapterId", data.get("chapter_id"))
    skill = _question_skill(skill_id) if skill_id is not None else None
    if not skill:
        return jsonify({"error": "A valid skillId is required"}), 400
    chapter = _question_chapter(chapter_id)
    if not chapter:
        return jsonify({"error": "A valid chapterId is required. Questions must be assigned to a chapter."}), 400
    if not _chapter_belongs_to_skill(chapter, skill):
        return jsonify({"error": "The selected chapter does not belong to the selected skill"}), 400
    chapter_level = _question_level_for_chapter(chapter)
    if not chapter_level:
        return jsonify({"error": "The selected chapter has no valid proficiency level. Update the chapter first."}), 400
    requested_level = _normalize_level(data.get("proficiencyLevel", data.get("proficiency_level", data.get("level"))))
    if requested_level and requested_level != chapter_level:
        return jsonify({"error": "Question proficiency level must match its chapter", "chapterLevel": chapter_level}), 400
    cleaned, error = _clean_question_payload(data)
    if error:
        return jsonify({"error": error}), 400
    cleaned.update({
        "skillId": skill["_id"], "skill_id": skill.get("skill_id", skill["_id"]),
        "skillName": _name(skill, "skill"),
        "chapterId": chapter["_id"], "chapter_id": chapter.get("chapter_id", chapter["_id"]),
        "chapterName": _name(chapter, "chapter"),
        "proficiencyLevel": chapter_level, "proficiency_level": chapter_level,
        "level": chapter_level, "createdAt": now_utc(),
        "createdBy": getattr(g, "current_user_id", None),
    })
    normalized_question = " ".join(cleaned["question"].split()).casefold()
    existing_questions = coll.find({
        "$and": [
            _question_query(skill=skill, chapter=chapter),
            {"$or": [{"question": {"$exists": True}}, {"text": {"$exists": True}}, {"questionText": {"$exists": True}}]},
        ]
    })
    for existing in existing_questions:
        existing_text = str(_first(existing, "question", "text", "questionText", default="") or "")
        if " ".join(existing_text.split()).casefold() == normalized_question:
            return jsonify({"error": "An identical question already exists for this chapter"}), 409
    result = coll.insert_one(cleaned)
    cleaned["_id"] = result.inserted_id
    _log_action("create_assessment_question", {"questionId": str(result.inserted_id), "skillId": str(skill["_id"]), "chapterId": str(chapter["_id"]), "level": chapter_level})
    return jsonify({"success": True, "question": serialize_doc(cleaned)}), 201


@admin_bp.route("/question-bank/summary/<skill_id>", methods=["GET", "OPTIONS"])
@admin_required
def question_bank_summary(skill_id):
    if request.method == "OPTIONS":
        return _cors_response()
    skill = _question_skill(skill_id)
    if not skill:
        return jsonify({"error": "Skill not found"}), 404
    from routes.quiz import (
        LEVELS as ASSESSMENT_LEVELS,
        initial_assessment_targets,
        post_learning_question_target,
    )

    coll = get_collection("questions")
    skill_query = _question_query(skill=skill)
    counts = {}
    level_coverage = {}
    for level in ASSESSMENT_LEVELS:
        level_query = {"$and": [skill_query, _question_query(level=level)]}
        level_questions = list(coll.find(level_query))
        coverage = _question_coverage_summary(level_questions)
        counts[level] = coverage["validUniqueQuestionCount"]
        level_coverage[level] = {
            **coverage,
            "initialQuestionTarget": 0,
            "postLearningQuestionTarget": post_learning_question_target(counts[level]),
        }
    initial_plan = initial_assessment_targets(counts)
    for level in ASSESSMENT_LEVELS:
        level_coverage[level]["initialQuestionTarget"] = initial_plan["levelTargets"].get(level, 0)
        level_coverage[level]["assessmentReady"] = (
            level_coverage[level]["initialQuestionTarget"] > 0
            or level_coverage[level]["postLearningQuestionTarget"] > 0
        )
    chapter_counts = []
    chapters = list(get_collection("chapters").find({}))
    chapters.sort(key=lambda ch: (_question_level_for_chapter(ch) or "", _first(ch, "chapter_order", "order", default=0) or 0, _name(ch, "chapter").lower()))
    for chapter in chapters:
        if not _chapter_belongs_to_skill(chapter, skill):
            continue
        level = _question_level_for_chapter(chapter)
        chapter_query = {"$and": [skill_query, _question_query(chapter=chapter)]}
        eligible_query = (
            {"$and": [chapter_query, _question_query(level=level)]}
            if level
            else {"_id": None}
        )
        eligible_questions = list(coll.find(eligible_query)) if level else []
        coverage = _question_coverage_summary(eligible_questions)
        chapter_counts.append({
            "chapterId": str(chapter.get("_id")),
            "chapter_id": _first(chapter, "chapter_id", "chapterId", default=str(chapter.get("_id"))),
            "chapterName": _name(chapter, "chapter"),
            "proficiencyLevel": level,
            "questionCount": coverage["validUniqueQuestionCount"],
            **coverage,
        })
    return jsonify({
        "skillId": str(skill.get("skill_id", skill["_id"])),
        "skillName": _name(skill, "skill"),
        "counts": counts,
        "levelCoverage": level_coverage,
        "initialAssessmentTotalTarget": initial_plan["totalTarget"],
        "chapters": chapter_counts,
        "total": sum(counts.values()),
    }), 200


@admin_bp.route("/question-bank/<question_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@admin_required
def question_by_id(question_id):
    if request.method == "OPTIONS":
        return _cors_response()
    coll = get_collection("questions")
    doc = _find_ref("questions", question_id, ["_id", "questionId", "question_id"])
    if not doc:
        return jsonify({"error": "Question not found"}), 404
    if request.method == "GET":
        return jsonify({"question": serialize_doc(doc)}), 200
    if request.method == "PUT":
        data = request.get_json(silent=True) or {}
        update = {}
        content_fields = ("question", "text", "questionText", "options", "choices", "correctOption", "correct_option", "correctAnswer", "correct_answer", "explanation", "active", "isActive", "is_active")
        if any(key in data for key in content_fields):
            cleaned, error = _clean_question_payload({**doc, **data})
            if error:
                return jsonify({"error": error}), 400
            update.update(cleaned)

        requested_skill_id = data.get("skillId", data.get("skill_id", doc.get("skillId", doc.get("skill_id"))))
        requested_chapter_id = data.get("chapterId", data.get("chapter_id", doc.get("chapterId", doc.get("chapter_id"))))
        skill = _question_skill(requested_skill_id) if requested_skill_id is not None else None
        chapter = _question_chapter(requested_chapter_id) if requested_chapter_id is not None else None
        if not skill:
            return jsonify({"error": "A valid skillId is required"}), 400
        if not chapter:
            return jsonify({"error": "A valid chapterId is required"}), 400
        if not _chapter_belongs_to_skill(chapter, skill):
            return jsonify({"error": "The selected chapter does not belong to the selected skill"}), 400
        chapter_level = _question_level_for_chapter(chapter)
        if not chapter_level:
            return jsonify({"error": "The selected chapter has no valid proficiency level"}), 400
        requested_level_raw = data.get("proficiencyLevel", data.get("proficiency_level", data.get("level")))
        if requested_level_raw is not None:
            requested_level = _normalize_level(requested_level_raw)
            if not requested_level:
                return jsonify({"error": "Invalid level", "allowedLevels": list(LEVELS)}), 400
            if requested_level != chapter_level:
                return jsonify({"error": "Question proficiency level must match its chapter", "chapterLevel": chapter_level}), 400
        update.update({
            "skillId": skill["_id"], "skill_id": skill.get("skill_id", skill["_id"]),
            "skillName": _name(skill, "skill"),
            "chapterId": chapter["_id"], "chapter_id": chapter.get("chapter_id", chapter["_id"]),
            "chapterName": _name(chapter, "chapter"),
            "proficiencyLevel": chapter_level, "proficiency_level": chapter_level,
            "level": chapter_level, "updatedAt": now_utc(),
        })
        coll.update_one({"_id": doc["_id"]}, {"$set": update})
        updated = coll.find_one({"_id": doc["_id"]})
        _log_action("update_assessment_question", {"questionId": str(doc["_id"]), "fields": list(update)})
        return jsonify({"success": True, "question": serialize_doc(updated)}), 200
    coll.delete_one({"_id": doc["_id"]})
    _log_action("delete_assessment_question", {"questionId": question_id})
    return jsonify({"deleted": True}), 200


# ------------------------------- resumes --------------------------------
@admin_bp.route("/resumes", methods=["GET", "OPTIONS"])
@admin_required
def list_resumes():
    if request.method == "OPTIONS": return _cors_response()
    page, limit = _pagination(); coll = get_collection("resumes"); total = coll.count_documents({})
    docs = list(coll.find({}).sort("createdAt", -1).skip((page-1)*limit).limit(limit))
    return jsonify({"resumes": serialize_doc(docs), "total": total, "page": page, "limit": limit, "totalPages": _pages(total, limit)}), 200


@admin_bp.route("/resumes/<resume_id>", methods=["GET", "OPTIONS"])
@admin_required
def resume_by_id(resume_id):
    if request.method == "OPTIONS": return _cors_response()
    if not ObjectId.is_valid(resume_id): return jsonify({"error": "Invalid resume ID"}), 400
    doc = get_collection("resumes").find_one({"_id": ObjectId(resume_id)})
    if not doc: return jsonify({"error": "Resume not found"}), 404
    return jsonify(serialize_doc(doc)), 200


# -------------------------------- feedback -------------------------------
@admin_bp.route("/feedback", methods=["GET", "OPTIONS"])
@admin_required
def list_feedback():
    if request.method == "OPTIONS": return _cors_response()
    status = (request.args.get("status") or "").strip().lower(); page, limit = _pagination(); query = {"status": status} if status else {}
    coll = get_collection("feedback"); total = coll.count_documents(query); docs = list(coll.find(query).sort("createdAt", -1).skip((page-1)*limit).limit(limit))
    return jsonify({"feedback": serialize_doc(docs), "total": total, "page": page, "limit": limit, "totalPages": _pages(total, limit)}), 200


def _reply_feedback(feedback_id, require_nonempty=True):
    if not ObjectId.is_valid(feedback_id): return jsonify({"error": "Invalid feedback ID"}), 400
    coll = get_collection("feedback"); doc = coll.find_one({"_id": ObjectId(feedback_id)})
    if not doc: return jsonify({"error": "Feedback not found"}), 404
    data = request.get_json(silent=True) or {}; reply = data.get("adminReply", data.get("reply", "")); reply = str(reply or "").strip()
    if require_nonempty and not reply: return jsonify({"error": "Admin reply cannot be empty"}), 400
    update = {"adminReply": reply, "status": "answered" if reply else data.get("status", doc.get("status", "pending")), "updatedAt": now_utc()}
    if reply: update.update({"repliedAt": now_utc(), "repliedBy": getattr(g, "current_user_id", None)})
    coll.update_one({"_id": doc["_id"]}, {"$set": update}); notified = False
    if reply and doc.get("userId"):
        notified = _create_notification(doc.get("userId"), "feedback_reply", "Feedback Response", "Your feedback has received a response from the admin.") is not None
    _log_action("reply_to_feedback", {"feedbackId": feedback_id, "notificationCreated": notified})
    return jsonify({"updated": True, "feedback": serialize_doc(coll.find_one({"_id": doc["_id"]})), "notificationCreated": notified}), 200


@admin_bp.route("/feedback/<feedback_id>", methods=["PUT", "OPTIONS"])
@admin_required
def update_feedback(feedback_id):
    if request.method == "OPTIONS": return _cors_response()
    data = request.get_json(silent=True) or {}
    if "adminReply" in data or "reply" in data: return _reply_feedback(feedback_id, require_nonempty=False)
    if not ObjectId.is_valid(feedback_id): return jsonify({"error": "Invalid feedback ID"}), 400
    coll = get_collection("feedback"); doc = coll.find_one({"_id": ObjectId(feedback_id)})
    if not doc: return jsonify({"error": "Feedback not found"}), 404
    status = str(data.get("status", "")).strip().lower()
    allowed = {"pending", "reviewed", "answered", "resolved", "replied"}
    if status not in allowed: return jsonify({"error": "Invalid feedback status", "allowedStatuses": sorted(allowed)}), 400
    if status == "replied": status = "answered"
    coll.update_one({"_id": doc["_id"]}, {"$set": {"status": status, "updatedAt": now_utc()}}); _log_action("update_feedback", {"feedbackId": feedback_id, "status": status})
    return jsonify({"updated": True, "feedback": serialize_doc(coll.find_one({"_id": doc["_id"]}))}), 200


@admin_bp.route("/feedback/<feedback_id>/reply", methods=["PUT", "OPTIONS"])
@admin_required
def reply_feedback(feedback_id):
    if request.method == "OPTIONS": return _cors_response()
    return _reply_feedback(feedback_id, require_nonempty=True)


# ------------------------------ exports/import --------------------------
@admin_bp.route("/export/users", methods=["GET", "OPTIONS"])
@admin_required
def export_users():
    if request.method == "OPTIONS": return _cors_response()
    wb = Workbook(); ws = wb.active; ws.title = "Users"; ws.append(["ID", "Name", "Email", "Age", "Phone", "Profession", "Active Career", "Streak", "Joined"])
    for user in get_collection("users").find({"role": {"$ne": "admin"}}).sort("createdAt", -1):
        career = _find_ref("careers", user.get("activeCareerId"), ["_id", "career_id", "careerId"]) if user.get("activeCareerId") else None
        created = user.get("createdAt"); ws.append([str(user.get("_id", "")), user.get("name", ""), user.get("email", ""), user.get("age", ""), user.get("phone", ""), user.get("profession", ""), _name(career, "career") if career else "", user.get("streak", 0), created.isoformat() if hasattr(created, "isoformat") else created or ""])
    buffer = io.BytesIO(); wb.save(buffer); buffer.seek(0); _log_action("export_users")
    return send_file(buffer, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name="users.xlsx")


@admin_bp.route("/export/feedback", methods=["GET", "OPTIONS"])
@admin_required
def export_feedback():
    if request.method == "OPTIONS": return _cors_response()
    wb = Workbook(); ws = wb.active; ws.title = "Feedback"; ws.append(["ID", "Name", "Email", "Message", "Status", "Admin Reply", "Created", "Updated"])
    for item in get_collection("feedback").find({}).sort("createdAt", -1):
        def fmt(v): return v.isoformat() if hasattr(v, "isoformat") else v or ""
        ws.append([str(item.get("_id", "")), item.get("name", ""), item.get("email", ""), item.get("message", ""), item.get("status", ""), item.get("adminReply", ""), fmt(item.get("createdAt")), fmt(item.get("updatedAt"))])
    buffer = io.BytesIO(); wb.save(buffer); buffer.seek(0); _log_action("export_feedback")
    return send_file(buffer, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name="feedback.xlsx")


@admin_bp.route("/import", methods=["POST", "OPTIONS"])
@admin_required
def import_excel():
    if request.method == "OPTIONS": return _cors_response()
    if "file" not in request.files: return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file.filename: return jsonify({"error": "No file selected"}), 400
    if not file.filename.lower().endswith(".xlsx"): return jsonify({"error": "Only .xlsx files are supported"}), 400
    try: workbook = load_workbook(file, data_only=True)
    except Exception as exc: return jsonify({"error": "Failed to read Excel file", "details": str(exc)}), 400
    try:
        from scripts.import_excel import import_workbook
        result = import_workbook(workbook)
    except Exception as exc:
        return jsonify({"error": "Excel import failed", "details": str(exc)}), 500
    _log_action("import_excel", result); return jsonify(result), 200


@admin_bp.route("/audit-logs", methods=["GET", "OPTIONS"])
@admin_required
def audit_logs():
    if request.method == "OPTIONS": return _cors_response()
    page, limit = _pagination(); action = (request.args.get("action") or "").strip(); query = {"action": {"$regex": _safe_regex(action), "$options": "i"}} if action else {}
    coll = get_collection("admin_audit_logs"); total = coll.count_documents(query); docs = list(coll.find(query).sort("createdAt", -1).skip((page-1)*limit).limit(limit))
    return jsonify({"logs": serialize_doc(docs), "total": total, "page": page, "limit": limit, "totalPages": _pages(total, limit)}), 200

# ------------------------- career-specific chapters ----------------------
@admin_bp.route("/mappings/career-chapters/<career_id>", methods=["GET", "PUT", "OPTIONS"])
@admin_required
def career_chapter_mapping(career_id):
    """Manage explicit Career_Chapter_Mapping rows from the current workbook schema."""
    if request.method == "OPTIONS":
        return _cors_response()

    career = _find_ref("careers", career_id, ["_id", "career_id", "careerId"])
    if not career:
        return jsonify({"error": "Career not found"}), 404

    coll = get_collection("career_chapter_mapping")
    career_refs = [value for value in (career.get("_id"), career.get("career_id"), career.get("careerId"), career_id) if value is not None]
    query = _find_ref_many_query(career_refs, ["careerId", "career_id"])

    if request.method == "GET":
        mappings = list(coll.find(query).sort([("order", 1), ("_id", 1)]))
        chapters, seen = [], set()
        for mapping in mappings:
            chapter_ref = _first(mapping, "chapterId", "chapter_id")
            chapter = _find_ref("chapters", chapter_ref, ["_id", "chapter_id", "chapterId"]) if chapter_ref is not None else None
            if chapter and str(chapter.get("_id")) not in seen:
                chapters.append(chapter)
                seen.add(str(chapter["_id"]))
        return jsonify({"chapters": serialize_doc(chapters), "chapterIds": [str(chapter["_id"]) for chapter in chapters]}), 200

    data = request.get_json(silent=True) or {}
    chapter_ids = data.get("chapterIds", [])
    if not isinstance(chapter_ids, list):
        return jsonify({"error": "chapterIds must be an array"}), 400

    resolved, invalid, seen = [], [], set()
    for requested_id in chapter_ids:
        chapter = _find_ref("chapters", requested_id, ["_id", "chapter_id", "chapterId"]) if requested_id is not None else None
        if not chapter:
            invalid.append(requested_id)
            continue
        key = str(chapter["_id"])
        if key not in seen:
            resolved.append(chapter)
            seen.add(key)

    if invalid:
        return jsonify({"error": "One or more chapters were not found. No mappings were changed.", "invalidChapterIds": invalid}), 400

    old = list(coll.find(query, {"_id": 1}))
    operations = [DeleteOne({"_id": row["_id"]}) for row in old]
    now = now_utc()
    operations.extend(InsertOne({
        "careerId": career["_id"],
        "chapterId": chapter["_id"],
        "order": index,
        "is_active": True,
        "createdAt": now,
        "updatedAt": now,
    }) for index, chapter in enumerate(resolved, start=1))
    if operations:
        coll.bulk_write(operations, ordered=True)

    _log_action("set_career_chapters", {"careerId": str(career["_id"]), "chapterCount": len(resolved)})
    return jsonify({"success": True, "mapped": len(resolved), "chapterIds": [str(chapter["_id"]) for chapter in resolved]}), 200
