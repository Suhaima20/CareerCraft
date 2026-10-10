import io
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g, send_file
from openpyxl import Workbook, load_workbook

from db import get_collection
from utils.auth import admin_required
from utils.serialization import serialize_doc, to_objectid


# ============================================================
# ADMIN BLUEPRINT
# ============================================================

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


# ============================================================
# HELPERS
# ============================================================

def now_utc():
    return datetime.now(timezone.utc)


def _log_action(action, details=None):
    try:
        get_collection("admin_audit_logs").insert_one({
            "adminId": getattr(g, "current_user_id", None),
            "action": action,
            "details": details or {},
            "createdAt": now_utc(),
        })
    except Exception:
        pass


def _create_notification(user_id, notification_type, title, message):
    if not user_id:
        return None

    try:
        notification = {
            "userId": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "read": False,
            "createdAt": now_utc(),
        }
        result = get_collection("notifications").insert_one(notification)
        notification["_id"] = result.inserted_id
        return notification
    except Exception:
        return None


def _cors_response():
    response = jsonify({"status": "ok"})
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type,Authorization,Accept,X-Requested-With"
    )
    response.headers["Access-Control-Allow-Methods"] = (
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    )
    return response, 200


def _valid_object_id(value):
    if not value:
        return None
    try:
        return to_objectid(value)
    except Exception:
        return None


def _id_candidates(value):
    """
    Support MongoDB ObjectIds and string business IDs
    such as CA001, SK0101, and CH0101.
    """
    candidates = []

    if value is None:
        return candidates

    value = str(value).strip()
    if not value:
        return candidates

    candidates.append(value)

    obj_id = _valid_object_id(value)
    if obj_id is not None:
        candidates.append(obj_id)

    # Preserve candidates of different types.
    # A string ID and its ObjectId representation are not duplicates.
    unique = []
    seen = set()

    for item in candidates:
        key = (type(item), str(item))

        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique

def _reference_query(value, fields):
    """
    Build a Mongo query that supports both:
      - ObjectId references
      - string business IDs

    Example:
      _reference_query(career_id, ["_id", "career_id"])
    """
    candidates = _id_candidates(value)

    if not candidates:
        return {"_id": None}

    clauses = []

    for field in fields:
        for candidate in candidates:
            clauses.append({field: candidate})

    if len(clauses) == 1:
        return clauses[0]

    return {"$or": clauses}


def _find_by_reference(collection_name, value, fields):
    if value is None:
        return None

    return get_collection(collection_name).find_one(
        _reference_query(value, fields)
    )


def _pagination():
    try:
        page = int(request.args.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    try:
        limit = int(request.args.get("limit", 20))
    except (TypeError, ValueError):
        limit = 20

    page = max(page, 1)
    limit = max(min(limit, 100), 1)

    return page, limit


def _total_pages(total, limit):
    return max(1, (total + limit - 1) // limit)


def _extract_ref_ids(documents, field_names):
    """
    Extract mapping references regardless of whether they are stored as
    ObjectIds or strings.
    """
    values = []

    for doc in documents:
        for field in field_names:
            value = doc.get(field)
            if value is not None and value != "":
                values.append(value)
                break

    return values


def _find_many_by_references(collection_name, values, fields):
    """
    Find documents using ObjectId OR business-ID references.
    """
    if not values:
        return []

    clauses = []

    for value in values:
        candidates = _id_candidates(value)

        for field in fields:
            for candidate in candidates:
                clauses.append({field: candidate})

    if not clauses:
        return []

    return list(
        get_collection(collection_name).find(
            {"$or": clauses}
        )
    )


def _mapping_reference_matches(mapping, field, target_value):
    """
    Used for compatibility with old and new mapping documents.
    """
    mapping_value = mapping.get(field)

    if mapping_value is None:
        return False

    target_candidates = {
        str(value) for value in _id_candidates(target_value)
    }

    mapping_candidates = {
        str(value) for value in _id_candidates(mapping_value)
    }

    return bool(target_candidates.intersection(mapping_candidates))


# ============================================================
# DASHBOARD STATS
# ============================================================

@admin_bp.route("/stats", methods=["GET", "OPTIONS"])
@admin_required
def get_stats():
    if request.method == "OPTIONS":
        return _cors_response()

    users = get_collection("users")

    total_users = users.count_documents({
        "role": {"$ne": "admin"}
    })

    active_users = users.count_documents({
        "role": {"$ne": "admin"},
        "lastActivityDate": {"$ne": None}
    })

    total_careers = get_collection("careers").count_documents({})
    total_skills = get_collection("skills").count_documents({})
    total_chapters = get_collection("chapters").count_documents({})
    total_resumes = get_collection("resumes").count_documents({})
    total_feedback = get_collection("feedback").count_documents({})
    recent_users = list(
        users.find({"role": {"$ne": "admin"}})
        .sort("createdAt", -1)
        .limit(5)
    )

    return jsonify({
        "totalUsers": total_users,
        "activeUsers": active_users,
        "totalCareers": total_careers,
        "totalSkills": total_skills,
        "totalChapters": total_chapters,
        "totalResumes": total_resumes,
        "totalFeedback": total_feedback,
        "recentUsers": serialize_doc(recent_users),
    }), 200


# ============================================================
# USERS
# ============================================================

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
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]

    users_collection = get_collection("users")
    total = users_collection.count_documents(query)

    users = list(
        users_collection.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    return jsonify({
        "users": serialize_doc(users),
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": _total_pages(total, limit),
    }), 200


@admin_bp.route(
    "/users/<user_id>",
    methods=["GET", "PUT", "DELETE", "OPTIONS"]
)
@admin_required
def handle_user_by_id(user_id):
    if request.method == "OPTIONS":
        return _cors_response()

    user_obj_id = _valid_object_id(user_id)

    if user_obj_id is None:
        return jsonify({"error": "Invalid user ID"}), 400

    users = get_collection("users")
    user = users.find_one({"_id": user_obj_id})

    if user is None:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        user_skills_doc = get_collection("user_skills").find_one({
            "userId": user_obj_id
        })

        skill_ids = []

        if user_skills_doc:
            for entry in user_skills_doc.get("skills", []):
                if isinstance(entry, dict):
                    skill_id = entry.get("skillId")
                    if skill_id:
                        skill_ids.append(skill_id)
                else:
                    skill_ids.append(entry)

        skills = _find_many_by_references(
            "skills",
            skill_ids,
            ["_id", "skill_id", "skillId"]
        )

        user["skills"] = skills

        active_career_id = user.get("activeCareerId")

        if active_career_id:
            career = _find_by_reference(
                "careers",
                active_career_id,
                ["_id", "career_id", "careerId"]
            )
            print("\n========== CAREER LOOKUP DEBUG ==========")
            print("Requested career ID:", repr(active_career_id))
            print("Database name:", get_collection("careers").database.name)
            print("Career found:", career is not None)

            if career is not None:
                print("Career document ID:", repr(career.get("_id")))
                print("Career name:", career.get("name"))

            print("=========================================\n")
            user["activeCareerName"] = (
                career.get("name") if career else None
            )

        return jsonify({"user": serialize_doc(user)}), 200

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}

        allowed = ["name", "age", "phone", "profession", "role"]
        update = {}

        for key in allowed:
            if key not in data:
                continue

            if key == "role" and data[key] != "user":
                continue

            update[key] = data[key]

        if not update:
            return jsonify({
                "error": "No valid fields to update"
            }), 400

        update["updatedAt"] = now_utc()

        users.update_one(
            {"_id": user_obj_id},
            {"$set": update}
        )

        _log_action(
            "update_user",
            {"userId": user_id, "fields": list(update.keys())}
        )

        return jsonify({"updated": True}), 200

    if user.get("role") == "admin":
        return jsonify({
            "error": "Admin accounts cannot be deleted here"
        }), 403

    users.delete_one({"_id": user_obj_id})

    user_related_collections = [
        "user_skills",
        "roadmap_progress",
        "skill_gap_analyses",
        "resume_analysis",
        "resumes",
        "achievements",
        "notifications",
        "study_reminders",
        "saved_jobs",
        "resume_builder",
        "career_progress",
    ]

    for collection_name in user_related_collections:
        try:
            get_collection(collection_name).delete_many({
                "userId": user_obj_id
            })
        except Exception:
            pass

    _log_action("delete_user", {"userId": user_id})

    return jsonify({"deleted": True}), 200


# ============================================================
# CAREERS
# ============================================================

@admin_bp.route("/careers", methods=["GET", "POST", "OPTIONS"])
@admin_required
def handle_careers():
    if request.method == "OPTIONS":
        return _cors_response()

    careers = get_collection("careers")

    if request.method == "GET":
        q = (request.args.get("q") or "").strip()
        query = {}

        if q:
            query["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"career_id": {"$regex": q, "$options": "i"}},
                {"careerId": {"$regex": q, "$options": "i"}},
            ]

        data = list(
            careers.find(query).sort("name", 1)
        )

        return jsonify({
            "careers": serialize_doc(data)
        }), 200

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Career name is required"}), 400

    existing = careers.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"}
    })

    if existing:
        return jsonify({"error": "Career already exists"}), 409

    now = now_utc()

    doc = {
        "name": name,
        "career_id": data.get("career_id") or data.get("careerId"),
        "description": data.get("description", ""),
        "active": bool(data.get("active", True)),
        "status": data.get("status") or ("published" if data.get("active", True) else "draft"),
        "createdAt": now,
        "updatedAt": now,
    }

    result = careers.insert_one(doc)
    doc["_id"] = result.inserted_id

    _log_action(
        "create_career",
        {"careerId": str(result.inserted_id)}
    )

    return jsonify(serialize_doc(doc)), 201


@admin_bp.route(
    "/careers/<career_id>",
    methods=["GET", "PUT", "DELETE", "OPTIONS"]
)
@admin_required
def handle_career_by_id(career_id):
    if request.method == "OPTIONS":
        return _cors_response()

    career = _find_by_reference(
        "careers",
        career_id,
        ["_id", "career_id", "careerId"]
    )

    if career is None:
        return jsonify({"error": "Career not found"}), 404

    if request.method == "GET":
        return jsonify({
            "career": serialize_doc(career)
        }), 200

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}

        allowed = [
            "name",
            "career_id",
            "description",
            "active",
            "status"
        ]

        update = {
            key: data[key]
            for key in allowed
            if key in data
        }
        if "active" in update and "status" not in update:
            update["status"] = "published" if update["active"] else "draft"
        if "status" in update and "active" not in update:
            update["active"] = update["status"] == "published"

        if not update:
            return jsonify({
                "error": "No valid fields to update"
            }), 400

        update["updatedAt"] = now_utc()

        get_collection("careers").update_one(
            {"_id": career["_id"]},
            {"$set": update}
        )

        _log_action(
            "update_career",
            {"careerId": str(career["_id"])}
        )

        return jsonify({"updated": True}), 200

    get_collection("careers").delete_one({
        "_id": career["_id"]
    })

    # Remove mappings regardless of whether old mappings use ObjectId
    # or business-ID strings.
    mappings = list(
        get_collection("career_skill_mapping").find({})
    )

    for mapping in mappings:
        if _mapping_reference_matches(
            mapping,
            "careerId",
            career.get("_id")
        ) or _mapping_reference_matches(
            mapping,
            "careerId",
            career.get("career_id")
        ):
            get_collection("career_skill_mapping").delete_one({
                "_id": mapping["_id"]
            })

    _log_action(
        "delete_career",
        {"careerId": career_id}
    )

    return jsonify({"deleted": True}), 200


# ============================================================
# SKILLS
# ============================================================

@admin_bp.route("/skills", methods=["GET", "POST", "OPTIONS"])
@admin_required
def handle_skills():
    if request.method == "OPTIONS":
        return _cors_response()

    skills = get_collection("skills")

    if request.method == "GET":
        q = (request.args.get("q") or "").strip()
        query = {}

        if q:
            query["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"skill_id": {"$regex": q, "$options": "i"}},
                {"skillId": {"$regex": q, "$options": "i"}},
            ]

        data = list(
            skills.find(query).sort("name", 1)
        )

        return jsonify({
            "skills": serialize_doc(data)
        }), 200

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Skill name is required"}), 400

    existing = skills.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"}
    })

    if existing:
        return jsonify({"error": "Skill already exists"}), 409

    now = now_utc()

    doc = {
        "name": name,
        "skill_id": data.get("skill_id") or data.get("skillId"),
        "category": data.get("category", ""),
        "description": data.get("description", ""),
        "active": data.get("active", True),
        "createdAt": now,
        "updatedAt": now,
    }

    result = skills.insert_one(doc)
    doc["_id"] = result.inserted_id

    _log_action(
        "create_skill",
        {"skillId": str(result.inserted_id)}
    )

    return jsonify(serialize_doc(doc)), 201


@admin_bp.route(
    "/skills/<skill_id>",
    methods=["PUT", "DELETE", "OPTIONS"]
)
@admin_required
def handle_skill_by_id(skill_id):
    if request.method == "OPTIONS":
        return _cors_response()

    skill = _find_by_reference(
        "skills",
        skill_id,
        ["_id", "skill_id", "skillId"]
    )

    if skill is None:
        return jsonify({"error": "Skill not found"}), 404

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}

        allowed = [
            "name",
            "skill_id",
            "category",
            "description",
            "active"
        ]

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

        get_collection("skills").update_one(
            {"_id": skill["_id"]},
            {"$set": update}
        )

        _log_action(
            "update_skill",
            {"skillId": str(skill["_id"])}
        )

        return jsonify({"updated": True}), 200

    get_collection("skills").delete_one({
        "_id": skill["_id"]
    })

    for collection_name, field in [
        ("skill_chapter_mapping", "skillId"),
        ("career_skill_mapping", "skillId"),
    ]:
        mappings = list(
            get_collection(collection_name).find({})
        )

        for mapping in mappings:
            if (
                _mapping_reference_matches(
                    mapping,
                    field,
                    skill.get("_id")
                )
                or _mapping_reference_matches(
                    mapping,
                    field,
                    skill.get("skill_id")
                )
            ):
                get_collection(collection_name).delete_one({
                    "_id": mapping["_id"]
                })

    _log_action(
        "delete_skill",
        {"skillId": skill_id}
    )

    return jsonify({"deleted": True}), 200


# ============================================================
# CHAPTERS
# ============================================================

@admin_bp.route("/chapters", methods=["GET", "POST", "OPTIONS"])
@admin_required
def handle_chapters():
    if request.method == "OPTIONS":
        return _cors_response()

    chapters = get_collection("chapters")

    if request.method == "GET":
        q = (request.args.get("q") or "").strip()
        query = {}

        if q:
            query["$or"] = [
                {"title": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"chapter_id": {"$regex": q, "$options": "i"}},
                {"chapterId": {"$regex": q, "$options": "i"}},
            ]

        data = list(
            chapters.find(query).sort([
                ("order", 1),
                ("createdAt", 1)
            ])
        )

        return jsonify({
            "chapters": serialize_doc(data)
        }), 200

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "error": "Chapter title is required"
        }), 400

    now = now_utc()

    doc = {
        "title": title,
        "chapter_id": data.get("chapter_id") or data.get("chapterId"),
        "description": data.get("description", ""),
        "youtubeUrl": data.get("youtubeUrl", ""),
        "duration": data.get("duration", ""),
        "order": data.get("order", 0),
        "active": data.get("active", True),
        "createdAt": now,
        "updatedAt": now,
    }

    result = chapters.insert_one(doc)
    doc["_id"] = result.inserted_id

    _log_action(
        "create_chapter",
        {"chapterId": str(result.inserted_id)}
    )

    return jsonify(serialize_doc(doc)), 201


@admin_bp.route(
    "/chapters/<chapter_id>",
    methods=["PUT", "DELETE", "OPTIONS"]
)
@admin_required
def handle_chapter_by_id(chapter_id):
    if request.method == "OPTIONS":
        return _cors_response()

    chapter = _find_by_reference(
        "chapters",
        chapter_id,
        ["_id", "chapter_id", "chapterId"]
    )

    if chapter is None:
        return jsonify({"error": "Chapter not found"}), 404

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}

        allowed = [
            "title",
            "chapter_id",
            "description",
            "youtubeUrl",
            "duration",
            "order",
            "active"
        ]

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

        get_collection("chapters").update_one(
            {"_id": chapter["_id"]},
            {"$set": update}
        )

        _log_action(
            "update_chapter",
            {"chapterId": str(chapter["_id"])}
        )

        return jsonify({"updated": True}), 200

    get_collection("chapters").delete_one({
        "_id": chapter["_id"]
    })

    mappings = list(
        get_collection("skill_chapter_mapping").find({})
    )

    for mapping in mappings:
        if (
            _mapping_reference_matches(
                mapping,
                "chapterId",
                chapter.get("_id")
            )
            or _mapping_reference_matches(
                mapping,
                "chapterId",
                chapter.get("chapter_id")
            )
        ):
            get_collection("skill_chapter_mapping").delete_one({
                "_id": mapping["_id"]
            })

    quizzes = list(
        get_collection("quizzes").find({})
    )

    for quiz in quizzes:
        if (
            _mapping_reference_matches(
                quiz,
                "chapterId",
                chapter.get("_id")
            )
            or _mapping_reference_matches(
                quiz,
                "chapterId",
                chapter.get("chapter_id")
            )
        ):
            get_collection("quizzes").delete_one({
                "_id": quiz["_id"]
            })

    _log_action(
        "delete_chapter",
        {"chapterId": chapter_id}
    )

    return jsonify({"deleted": True}), 200


# ============================================================
# CHAPTER QUIZ
# ============================================================

@admin_bp.route(
    "/chapters/<chapter_id>/quiz",
    methods=["GET", "PUT", "OPTIONS"]
)
@admin_required
def handle_chapter_quiz(chapter_id):
    if request.method == "OPTIONS":
        return _cors_response()

    chapter = _find_by_reference(
        "chapters",
        chapter_id,
        ["_id", "chapter_id", "chapterId"]
    )

    if chapter is None:
        return jsonify({
            "error": "Chapter not found"
        }), 404

    quizzes = get_collection("quizzes")

    chapter_ref_values = [
        chapter.get("_id"),
        chapter.get("chapter_id"),
        chapter.get("chapterId"),
    ]

    chapter_ref_values = [
        value for value in chapter_ref_values
        if value is not None and value != ""
    ]

    quiz_clauses = []

    for value in chapter_ref_values:
        for candidate in _id_candidates(value):
            quiz_clauses.append({"chapterId": candidate})

    quiz_query = (
        {"$or": quiz_clauses}
        if quiz_clauses
        else {"chapterId": None}
    )

    if request.method == "GET":
        quiz = quizzes.find_one(quiz_query)

        if quiz is None:
            return jsonify({
                "quiz": {
                    "chapterId": str(
                        chapter.get("_id", chapter_id)
                    ),
                    "title": "",
                    "questions": [],
                    "passScore": 70,
                    "requiredWatchPercentage": 98,
                    "active": True
                }
            }), 200

        return jsonify({
            "quiz": serialize_doc(quiz)
        }), 200

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    questions = data.get("questions", [])

    if not isinstance(questions, list):
        return jsonify({
            "error": "questions must be an array"
        }), 400

    try:
        pass_score = int(data.get("passScore", 70))
    except (TypeError, ValueError):
        return jsonify({
            "error": "passScore must be a number"
        }), 400

    try:
        required_watch_percentage = int(
            data.get("requiredWatchPercentage", 98)
        )
    except (TypeError, ValueError):
        return jsonify({
            "error": "requiredWatchPercentage must be a number"
        }), 400

    pass_score = max(70, min(pass_score, 100))
    required_watch_percentage = max(
        98,
        min(required_watch_percentage, 100)
    )

    cleaned_questions = []

    for question in questions:
        if not isinstance(question, dict):
            continue

        question_text = (
            question.get("question")
            or question.get("text")
            or ""
        ).strip()

        options = question.get("options", [])

        if not isinstance(options, list):
            options = []

        # Preserve the four-option editor contract.
        options = [str(option).strip() for option in options[:4]]

        while len(options) < 4:
            options.append("")

        try:
            correct_option = int(
                question.get("correctOption", 0)
            )
        except (TypeError, ValueError):
            correct_option = 0

        correct_option = max(
            0,
            min(correct_option, 3)
        )

        explanation = (
            question.get("explanation") or ""
        ).strip()

        if not question_text:
            continue

        cleaned_questions.append({
            "question": question_text,
            "options": options,
            "correctOption": correct_option,
            "explanation": explanation,
        })

    # IMPORTANT:
    # Store chapterId in the same canonical form as the chapter _id.
    # This makes the normal user/admin lookup deterministic.
    canonical_chapter_id = chapter.get("_id")

    quiz_doc = {
        "chapterId": canonical_chapter_id,
        "chapterBusinessId": (
            chapter.get("chapter_id")
            or chapter.get("chapterId")
        ),
        "title": title,
        "questions": cleaned_questions,
        "passScore": pass_score,
        "requiredWatchPercentage": required_watch_percentage,
        "active": bool(data.get("active", True)),
        "updatedAt": now_utc(),
    }

    existing = quizzes.find_one({
        "chapterId": canonical_chapter_id
    })

    # If the existing quiz was saved using a business ID, find it too.
    if existing is None:
        existing = quizzes.find_one(quiz_query)

    if existing:
        quizzes.update_one(
            {"_id": existing["_id"]},
            {"$set": quiz_doc}
        )
        quiz_doc["_id"] = existing["_id"]
    else:
        quiz_doc["createdAt"] = now_utc()
        result = quizzes.insert_one(quiz_doc)
        quiz_doc["_id"] = result.inserted_id

    _log_action(
        "update_chapter_quiz",
        {
            "chapterId": str(canonical_chapter_id),
            "questionCount": len(cleaned_questions),
            "passScore": pass_score,
            "requiredWatchPercentage": required_watch_percentage,
        }
    )

    return jsonify({
        "success": True,
        "message": "Quiz saved successfully",
        "quiz": serialize_doc(quiz_doc)
    }), 200

# ============================================================
# CAREER <-> SKILLS MAPPING
# ============================================================

@admin_bp.route(
    "/mappings/career-skills/<career_id>",
    methods=["GET", "PUT", "OPTIONS"]
)
@admin_required
def handle_career_skills_mapping(career_id):
    """
    Manage Career <-> Skill mappings.

    GET:
        Returns skills explicitly assigned to a career.

    PUT:
        Replaces the selected career's skill mappings with
        validated skill IDs.

    Rules:
        - MongoDB ObjectIds and supported business IDs are accepted.
        - Every skill must exist before any mapping is changed.
        - Skill names alone never establish a mapping.
        - Skills are assigned only through explicit career mappings.
        - Duplicate skill mappings are prevented.
        - Existing mappings remain unchanged if validation fails.
    """

    from bson import ObjectId
    from pymongo import DeleteOne, InsertOne
    from datetime import datetime, timezone

    # --------------------------------------------------------
    # OPTIONS / CORS
    # --------------------------------------------------------
    if request.method == "OPTIONS":
        return _cors_response()

    careers_collection = get_collection("careers")
    skills_collection = get_collection("skills")
    mappings_collection = get_collection("career_skill_mapping")

    requested_career_id = str(career_id).strip()

    if not requested_career_id:
        return jsonify({
            "error": "Career ID is required"
        }), 400

    # --------------------------------------------------------
    # HELPER: RESOLVE A DOCUMENT BY ITS SUPPORTED IDENTIFIERS
    # --------------------------------------------------------
    def resolve_document(collection, value, identifier_fields):
        """
        Resolve a document by MongoDB ObjectId, string _id,
        or a supported business identifier.

        A field containing None is not treated as an identifier.
        """
        if value is None:
            return None

        normalized_value = str(value).strip()

        if not normalized_value:
            return None

        clauses = []

        # MongoDB ObjectId lookup.
        if ObjectId.is_valid(normalized_value):
            clauses.append({
                "_id": ObjectId(normalized_value)
            })

        # Legacy string _id and business identifier lookups.
        for field in identifier_fields:
            clauses.append({
                field: normalized_value
            })

        if not clauses:
            return None

        query = clauses[0] if len(clauses) == 1 else {
            "$or": clauses
        }

        return collection.find_one(query)

    # --------------------------------------------------------
    # RESOLVE THE CAREER
    # --------------------------------------------------------
    career = resolve_document(
        careers_collection,
        requested_career_id,
        ["career_id", "careerId"]
    )

    if career is None:
        return jsonify({
            "error": "Career not found",
            "requestedCareerId": requested_career_id
        }), 404

    canonical_career_id = career.get("_id")

    if canonical_career_id is None:
        return jsonify({
            "error": "The career does not have a valid MongoDB _id"
        }), 500

    # --------------------------------------------------------
    # BUILD THE CAREER MAPPING QUERY
    # --------------------------------------------------------
    #
    # Existing mapping documents may store careerId as either
    # a MongoDB ObjectId or a string.
    #
    # Include the canonical ID and existing business IDs.
    # Do not match skills by name.
    # --------------------------------------------------------
    career_reference_values = [
        canonical_career_id,
        career.get("career_id"),
        career.get("careerId"),
        requested_career_id
    ]

    career_mapping_clauses = []
    seen_career_references = set()

    for value in career_reference_values:
        if value is None:
            continue

        normalized_value = str(value).strip()

        if not normalized_value:
            continue

        candidates = [normalized_value]

        if ObjectId.is_valid(normalized_value):
            candidates.append(ObjectId(normalized_value))

        for candidate in candidates:
            candidate_key = (
                type(candidate).__name__,
                str(candidate)
            )

            if candidate_key in seen_career_references:
                continue

            seen_career_references.add(candidate_key)

            career_mapping_clauses.append({
                "careerId": candidate
            })

    career_mapping_query = (
        {"$or": career_mapping_clauses}
        if career_mapping_clauses
        else {"_id": None}
    )

    # --------------------------------------------------------
    # GET: FETCH SKILLS EXPLICITLY MAPPED TO THIS CAREER
    # --------------------------------------------------------
    if request.method == "GET":

        mappings = list(
            mappings_collection.find(
                career_mapping_query
            ).sort([
                ("order", 1),
                ("_id", 1)
            ])
        )

        ordered_skills = []
        seen_skill_document_ids = set()

        for mapping in mappings:
            skill_reference = (
                mapping.get("skillId")
                if mapping.get("skillId") is not None
                else mapping.get("skill_id")
            )

            if skill_reference is None:
                continue

            skill = resolve_document(
                skills_collection,
                skill_reference,
                ["skill_id", "skillId"]
            )

            if skill is None:
                # Ignore dangling legacy references in GET.
                # They are not treated as valid skills.
                continue

            skill_document_id = skill.get("_id")

            if skill_document_id is None:
                continue

            normalized_skill_id = str(skill_document_id)

            if normalized_skill_id in seen_skill_document_ids:
                continue

            seen_skill_document_ids.add(normalized_skill_id)
            ordered_skills.append(skill)

        serialized_skills = serialize_doc(ordered_skills)

        return jsonify({
            "skills": serialized_skills,
            "skillIds": [
                str(skill["_id"])
                for skill in ordered_skills
                if skill.get("_id") is not None
            ]
        }), 200

    # --------------------------------------------------------
    # PUT: VALIDATE THE REQUEST BODY
    # --------------------------------------------------------
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    skill_ids = data.get("skillIds", [])

    if not isinstance(skill_ids, list):
        return jsonify({
            "error": "skillIds must be an array"
        }), 400

    # --------------------------------------------------------
    # RESOLVE AND VALIDATE ALL SKILLS
    # --------------------------------------------------------
    #
    # Validate every ID before changing any mapping.
    # A skill's name does not make it valid for a career;
    # the mapping is an explicit administrative assignment.
    # --------------------------------------------------------
    resolved_skills = []
    seen_resolved_skill_ids = set()
    invalid_skill_ids = []

    for requested_skill_id in skill_ids:

        if requested_skill_id is None:
            invalid_skill_ids.append(requested_skill_id)
            continue

        normalized_skill_id = str(requested_skill_id).strip()

        if not normalized_skill_id:
            invalid_skill_ids.append(requested_skill_id)
            continue

        skill = resolve_document(
            skills_collection,
            normalized_skill_id,
            ["skill_id", "skillId"]
        )

        if skill is None:
            invalid_skill_ids.append(normalized_skill_id)
            continue

        skill_document_id = skill.get("_id")

        if skill_document_id is None:
            invalid_skill_ids.append(normalized_skill_id)
            continue

        unique_key = str(skill_document_id)

        if unique_key in seen_resolved_skill_ids:
            continue

        seen_resolved_skill_ids.add(unique_key)
        resolved_skills.append(skill)

    # --------------------------------------------------------
    # REJECT INVALID REQUESTS WITHOUT CHANGING DATA
    # --------------------------------------------------------
    if invalid_skill_ids:
        return jsonify({
            "error": (
                "One or more skills could not be found. "
                "No mappings were changed."
            ),
            "invalidSkillIds": invalid_skill_ids
        }), 400

    # --------------------------------------------------------
    # PREPARE THE REPLACEMENT MAPPINGS
    # --------------------------------------------------------
    #
    # All IDs have now been validated.
    # Store canonical MongoDB ObjectIds for consistent references.
    # --------------------------------------------------------
    now = datetime.now(timezone.utc)

    new_mappings = []

    for order_index, skill in enumerate(resolved_skills, start=1):
        new_mappings.append({
            "careerId": canonical_career_id,
            "skillId": skill["_id"],
            "order": order_index,
            "createdAt": now,
            "updatedAt": now
        })

    # --------------------------------------------------------
    # REPLACE MAPPINGS
    # --------------------------------------------------------
    #
    # Use a MongoDB bulk write to perform the deletion and
    # insertion operations together.
    #
    # Validation errors above never reach this section.
    # --------------------------------------------------------
    existing_mappings = list(
        mappings_collection.find(
            career_mapping_query,
            {"_id": 1}
        )
    )

    operations = []

    for mapping in existing_mappings:
        operations.append(
            DeleteOne({
                "_id": mapping["_id"]
            })
        )

    for mapping in new_mappings:
        operations.append(
            InsertOne(mapping)
        )

    if operations:
        mappings_collection.bulk_write(
            operations,
            ordered=True
        )

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------
    _log_action(
        "set_career_skills",
        {
            "careerId": str(canonical_career_id),
            "skillCount": len(new_mappings),
            "deletedMappingCount": len(existing_mappings)
        }
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------
    return jsonify({
        "success": True,
        "message": "Career skills mapped successfully",
        "careerId": str(canonical_career_id),
        "mapped": len(new_mappings),
        "skillIds": [
            str(skill["_id"])
            for skill in resolved_skills
        ]
    }), 200


# ============================================================
# SKILL ↔ CHAPTERS MAPPING
# ============================================================

@admin_bp.route(
    "/mappings/skill-chapters/<skill_id>",
    methods=["GET", "PUT", "OPTIONS"]
)
@admin_required
def handle_skill_chapters_mapping(skill_id):
    if request.method == "OPTIONS":
        return _cors_response()

    skill = _find_by_reference(
        "skills",
        skill_id,
        ["_id", "skill_id", "skillId"]
    )

    if skill is None:
        return jsonify({
            "error": "Skill not found"
        }), 404

    mappings_collection = get_collection(
        "skill_chapter_mapping"
    )

    skill_reference_values = [
        skill.get("_id"),
        skill.get("skill_id"),
        skill.get("skillId"),
        skill_id,
    ]

    skill_reference_values = [
        value for value in skill_reference_values
        if value is not None and value != ""
    ]

    if request.method == "GET":
        clauses = []

        for value in skill_reference_values:
            for candidate in _id_candidates(value):
                clauses.append({
                    "skillId": candidate
                })

        mappings = list(
            mappings_collection.find(
                {"$or": clauses}
            ).sort("order", 1)
        ) if clauses else []

        chapter_refs = _extract_ref_ids(
            mappings,
            ["chapterId", "chapter_id"]
        )

        chapters = _find_many_by_references(
            "chapters",
            chapter_refs,
            ["_id", "chapter_id", "chapterId"]
        )

        chapter_lookup = {}

        for chapter in chapters:
            for key in [
                chapter.get("_id"),
                chapter.get("chapter_id"),
                chapter.get("chapterId"),
            ]:
                if key is not None:
                    chapter_lookup[str(key)] = chapter

        ordered_chapters = []

        for ref in chapter_refs:
            chapter = None

            for candidate in _id_candidates(ref):
                chapter = chapter_lookup.get(str(candidate))
                if chapter:
                    break

            if chapter:
                ordered_chapters.append(chapter)

        ordered_chapters.sort(
            key=lambda item: (
                item.get("order", 0),
                item.get("createdAt", datetime.min)
                if isinstance(
                    item.get("createdAt"),
                    datetime
                )
                else datetime.min
            )
        )

        return jsonify({
            "chapters": serialize_doc(ordered_chapters)
        }), 200

    data = request.get_json(silent=True) or {}
    chapter_ids = data.get("chapterIds", [])

    if not isinstance(chapter_ids, list):
        return jsonify({
            "error": "chapterIds must be an array"
        }), 400

    resolved_chapter_ids = []

    for chapter_id in chapter_ids:
        chapter = _find_by_reference(
            "chapters",
            chapter_id,
            ["_id", "chapter_id", "chapterId"]
        )

        if chapter:
            resolved_chapter_ids.append(chapter["_id"])

    old_mappings = list(
        mappings_collection.find({})
    )

    for mapping in old_mappings:
        matches = False

        for value in skill_reference_values:
            if _mapping_reference_matches(
                mapping,
                "skillId",
                value
            ):
                matches = True
                break

        if matches:
            mappings_collection.delete_one({
                "_id": mapping["_id"]
            })

    now = now_utc()

    for order_index, chapter_obj_id in enumerate(resolved_chapter_ids, start=1):
        mappings_collection.insert_one({
            "skillId": skill["_id"],
            "chapterId": chapter_obj_id,
            "order": order_index,
            "createdAt": now,
        })

    _log_action(
        "set_skill_chapters",
        {
            "skillId": str(skill["_id"]),
            "chapterCount": len(resolved_chapter_ids)
        }
    )

    return jsonify({
        "mapped": len(resolved_chapter_ids)
    }), 200


# ============================================================
# CAREER FULL HIERARCHY / OVERVIEW
# ============================================================

@admin_bp.route(
    "/careers/<career_id>/overview",
    methods=["GET", "OPTIONS"]
)
@admin_required
def get_career_overview(career_id):
    if request.method == "OPTIONS":
        return _cors_response()

    career = _find_by_reference(
        "careers",
        career_id,
        ["_id", "career_id", "careerId"]
    )

    if career is None:
        return jsonify({
            "error": "Career not found"
        }), 404

    career_skill_collection = get_collection(
        "career_skill_mapping"
    )
    skill_chapter_collection = get_collection(
        "skill_chapter_mapping"
    )
    skills_collection = get_collection("skills")
    chapters_collection = get_collection("chapters")
    quizzes_collection = get_collection("quizzes")

    # --------------------------------------------------------
    # CAREER → SKILLS
    # --------------------------------------------------------

    career_refs = [
        career.get("_id"),
        career.get("career_id"),
        career.get("careerId"),
        career_id,
    ]

    career_refs = [
        value for value in career_refs
        if value is not None and value != ""
    ]

    career_skill_clauses = []

    for value in career_refs:
        for candidate in _id_candidates(value):
            career_skill_clauses.append({
                "careerId": candidate
            })

    career_skill_mappings = list(
        career_skill_collection.find(
            {"$or": career_skill_clauses}
        )
    ) if career_skill_clauses else []

    skill_refs = _extract_ref_ids(
        career_skill_mappings,
        ["skillId", "skill_id"]
    )

    skill_documents = _find_many_by_references(
        "skills",
        skill_refs,
        ["_id", "skill_id", "skillId"]
    )

    skill_lookup = {}

    for skill in skill_documents:
        for key in [
            skill.get("_id"),
            skill.get("skill_id"),
            skill.get("skillId"),
        ]:
            if key is not None:
                skill_lookup[str(key)] = skill

    skills = []

    # --------------------------------------------------------
    # PRESERVE CAREER → SKILL MAPPING ORDER
    # --------------------------------------------------------

    for skill_ref in skill_refs:
        skill = None

        for candidate in _id_candidates(skill_ref):
            skill = skill_lookup.get(str(candidate))
            if skill:
                break

        if not skill:
            continue

        # ----------------------------------------------------
        # SKILL → CHAPTERS
        # ----------------------------------------------------

        skill_refs_for_mapping = [
            skill.get("_id"),
            skill.get("skill_id"),
            skill.get("skillId"),
        ]

        skill_refs_for_mapping = [
            value for value in skill_refs_for_mapping
            if value is not None and value != ""
        ]

        skill_chapter_clauses = []

        for value in skill_refs_for_mapping:
            for candidate in _id_candidates(value):
                skill_chapter_clauses.append({
                    "skillId": candidate
                })

        chapter_mappings = list(
            skill_chapter_collection.find(
                {"$or": skill_chapter_clauses}
            )
        ) if skill_chapter_clauses else []

        chapter_refs = _extract_ref_ids(
            chapter_mappings,
            ["chapterId", "chapter_id"]
        )

        chapter_documents = _find_many_by_references(
            "chapters",
            chapter_refs,
            ["_id", "chapter_id", "chapterId"]
        )

        chapter_lookup = {}

        for chapter in chapter_documents:
            for key in [
                chapter.get("_id"),
                chapter.get("chapter_id"),
                chapter.get("chapterId"),
            ]:
                if key is not None:
                    chapter_lookup[str(key)] = chapter

        chapters = []

        for chapter_ref in chapter_refs:
            chapter = None

            for candidate in _id_candidates(chapter_ref):
                chapter = chapter_lookup.get(str(candidate))
                if chapter:
                    break

            if not chapter:
                continue

            # ------------------------------------------------
            # CHAPTER → QUIZ
            # ------------------------------------------------

            quiz_refs = [
                chapter.get("_id"),
                chapter.get("chapter_id"),
                chapter.get("chapterId"),
            ]

            quiz_clauses = []

            for value in quiz_refs:
                if value is None or value == "":
                    continue

                for candidate in _id_candidates(value):
                    quiz_clauses.append({
                        "chapterId": candidate
                    })

            quiz = (
                quizzes_collection.find_one({
                    "$or": quiz_clauses
                })
                if quiz_clauses
                else None
            )

            chapter_data = {
                "_id": chapter.get("_id"),
                "chapter_id": (
                    chapter.get("chapter_id")
                    or chapter.get("chapterId")
                ),
                "title": chapter.get("title", ""),
                "description": chapter.get("description", ""),
                "youtubeUrl": chapter.get("youtubeUrl", ""),
                "duration": chapter.get("duration", ""),
                "order": chapter.get("order", 0),
                "active": chapter.get("active", True),
                "quiz": None,
            }

            if quiz:
                chapter_data["quiz"] = {
                    "_id": quiz.get("_id"),
                    "chapterId": quiz.get("chapterId"),
                    "title": quiz.get("title", ""),
                    "questions": quiz.get("questions", []),
                    "passScore": quiz.get("passScore", 70),
                    "requiredWatchPercentage": quiz.get(
                        "requiredWatchPercentage",
                        98
                    ),
                    "active": quiz.get("active", True),
                }

            chapters.append(chapter_data)

        # Always sort chapters by curriculum order.
        chapters.sort(
            key=lambda item: item.get("order", 0)
        )

        skills.append({
            "_id": skill.get("_id"),
            "skill_id": (
                skill.get("skill_id")
                or skill.get("skillId")
            ),
            "name": skill.get("name", ""),
            "category": skill.get("category", ""),
            "description": skill.get("description", ""),
            "active": skill.get("active", True),
            "chapters": chapters,
        })

    total_chapters = sum(
        len(skill.get("chapters", []))
        for skill in skills
    )

    total_quizzes = 0
    total_questions = 0

    for skill in skills:
        for chapter in skill.get("chapters", []):
            quiz = chapter.get("quiz")

            if quiz:
                total_quizzes += 1
                total_questions += len(
                    quiz.get("questions", [])
                )

    overview = {
        "_id": career.get("_id"),
        "career_id": (
            career.get("career_id")
            or career.get("careerId")
        ),
        "name": career.get("name", ""),
        "description": career.get("description", ""),
        "active": career.get("active", True),
        "skills": skills,
        "summary": {
            "totalSkills": len(skills),
            "totalChapters": total_chapters,
            "totalQuizzes": total_quizzes,
            "totalQuestions": total_questions,
        },
    }

    return jsonify({
        "career": serialize_doc(overview)
    }), 200


# ============================================================
# RESUMES
# ============================================================

@admin_bp.route("/resumes", methods=["GET", "OPTIONS"])
@admin_required
def list_resumes():
    if request.method == "OPTIONS":
        return _cors_response()

    page, limit = _pagination()
    resumes_collection = get_collection("resumes")

    total = resumes_collection.count_documents({})

    resumes = list(
        resumes_collection.find({})
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    return jsonify({
        "resumes": serialize_doc(resumes),
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": _total_pages(total, limit),
    }), 200


@admin_bp.route("/resumes/<resume_id>", methods=["GET", "OPTIONS"])
@admin_required
def get_resume(resume_id):
    if request.method == "OPTIONS":
        return _cors_response()

    resume_obj_id = _valid_object_id(resume_id)

    if resume_obj_id is None:
        return jsonify({"error": "Invalid resume ID"}), 400

    resume = get_collection("resumes").find_one({
        "_id": resume_obj_id
    })

    if resume is None:
        return jsonify({"error": "Resume not found"}), 404

    return jsonify(serialize_doc(resume)), 200


# ============================================================
# FEEDBACK
# ============================================================

@admin_bp.route("/feedback", methods=["GET", "OPTIONS"])
@admin_required
def list_feedback():
    if request.method == "OPTIONS":
        return _cors_response()

    status = (
        request.args.get("status") or ""
    ).strip().lower()

    page, limit = _pagination()
    query = {}

    if status:
        query["status"] = status

    feedback_collection = get_collection("feedback")

    total = feedback_collection.count_documents(query)

    feedback = list(
        feedback_collection.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    return jsonify({
        "feedback": serialize_doc(feedback),
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": _total_pages(total, limit),
    }), 200


@admin_bp.route(
    "/feedback/<feedback_id>",
    methods=["PUT", "OPTIONS"]
)
@admin_required
def update_feedback_status(feedback_id):
    if request.method == "OPTIONS":
        return _cors_response()

    feedback_obj_id = _valid_object_id(feedback_id)

    if feedback_obj_id is None:
        return jsonify({"error": "Invalid feedback ID"}), 400

    feedback_collection = get_collection("feedback")

    feedback = feedback_collection.find_one({
        "_id": feedback_obj_id
    })

    if feedback is None:
        return jsonify({"error": "Feedback not found"}), 404

    data = request.get_json(silent=True) or {}
    update = {}

    if "status" in data:
        status = str(data.get("status")).strip().lower()

        allowed_statuses = {
            "pending",
            "reviewed",
            "answered",
            "replied",
            "resolved"
        }

        if status not in allowed_statuses:
            return jsonify({
                "error": "Invalid feedback status",
                "allowedStatuses": sorted(allowed_statuses)
            }), 400

        if status == "replied":
            status = "answered"

        update["status"] = status

    if "adminReply" in data:
        reply = data.get("adminReply")

        if reply is None:
            reply = ""

        reply = str(reply).strip()
        update["adminReply"] = reply

        if reply:
            update["status"] = "answered"
            update["repliedAt"] = now_utc()
            update["repliedBy"] = getattr(
                g,
                "current_user_id",
                None
            )

    if not update:
        return jsonify({
            "error": "Provide status or adminReply"
        }), 400

    update["updatedAt"] = now_utc()

    feedback_collection.update_one(
        {"_id": feedback_obj_id},
        {"$set": update}
    )

    notification_created = False

    if update.get("adminReply") and feedback.get("userId"):
        notification = _create_notification(
            user_id=feedback.get("userId"),
            notification_type="feedback_reply",
            title="Feedback Response",
            message=(
                "Your feedback has received a response "
                "from the admin."
            )
        )
        notification_created = notification is not None

    _log_action(
        "update_feedback",
        {
            "feedbackId": feedback_id,
            "fields": list(update.keys()),
            "notificationCreated": notification_created,
        }
    )

    updated_feedback = feedback_collection.find_one({
        "_id": feedback_obj_id
    })

    return jsonify({
        "updated": True,
        "feedback": serialize_doc(updated_feedback),
        "notificationCreated": notification_created,
    }), 200


@admin_bp.route(
    "/feedback/<feedback_id>/reply",
    methods=["PUT", "OPTIONS"]
)
@admin_required
def reply_to_feedback(feedback_id):
    if request.method == "OPTIONS":
        return _cors_response()

    feedback_obj_id = _valid_object_id(feedback_id)

    if feedback_obj_id is None:
        return jsonify({"error": "Invalid feedback ID"}), 400

    feedback_collection = get_collection("feedback")

    feedback = feedback_collection.find_one({
        "_id": feedback_obj_id
    })

    if feedback is None:
        return jsonify({"error": "Feedback not found"}), 404

    data = request.get_json(silent=True) or {}

    reply = (
        data.get("adminReply")
        if "adminReply" in data
        else data.get("reply")
    )

    if reply is None:
        reply = ""

    reply = str(reply).strip()

    if not reply:
        return jsonify({
            "error": "Admin reply cannot be empty"
        }), 400

    admin_id = getattr(g, "current_user_id", None)
    now = now_utc()

    update = {
        "adminReply": reply,
        "status": "answered",
        "repliedAt": now,
        "repliedBy": admin_id,
        "updatedAt": now,
    }

    feedback_collection.update_one(
        {"_id": feedback_obj_id},
        {"$set": update}
    )

    notification_created = False
    user_id = feedback.get("userId")

    if user_id:
        notification = _create_notification(
            user_id=user_id,
            notification_type="feedback_reply",
            title="Feedback Response",
            message=(
                "Your feedback has received a response "
                "from the admin."
            )
        )
        notification_created = notification is not None

    _log_action(
        "reply_to_feedback",
        {
            "feedbackId": feedback_id,
            "notificationCreated": notification_created,
        }
    )

    updated_feedback = feedback_collection.find_one({
        "_id": feedback_obj_id
    })

    return jsonify({
        "message": "Feedback reply sent successfully",
        "feedback": serialize_doc(updated_feedback),
        "notificationCreated": notification_created,
    }), 200
# ============================================================
# EXPORT USERS
# ============================================================

@admin_bp.route(
    "/export/users",
    methods=["GET", "OPTIONS"]
)
@admin_required
def export_users():
    if request.method == "OPTIONS":
        return _cors_response()

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Users"

    worksheet.append([
        "ID",
        "Name",
        "Email",
        "Age",
        "Phone",
        "Profession",
        "Active Career",
        "Streak",
        "Joined"
    ])

    users = list(
        get_collection("users")
        .find({"role": {"$ne": "admin"}})
        .sort("createdAt", -1)
    )

    careers_collection = get_collection("careers")

    for user in users:
        active_career_name = user.get(
            "activeCareerName",
            ""
        ) or ""

        if not active_career_name:
            career_id = user.get("activeCareerId")

            if career_id:
                career = _find_by_reference(
                    "careers",
                    career_id,
                    ["_id", "career_id", "careerId"]
                )

                if career:
                    active_career_name = career.get(
                        "name",
                        ""
                    )

        created_at = user.get("createdAt")

        if hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()

        worksheet.append([
            str(user.get("_id", "")),
            user.get("name", ""),
            user.get("email", ""),
            user.get("age", ""),
            user.get("phone", ""),
            user.get("profession", ""),
            active_career_name,
            user.get("streak", 0),
            created_at or ""
        ])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    _log_action("export_users")

    return send_file(
        buffer,
        mimetype=(
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),
        as_attachment=True,
        download_name="users.xlsx"
    )


# ============================================================
# EXPORT FEEDBACK
# ============================================================

@admin_bp.route(
    "/export/feedback",
    methods=["GET", "OPTIONS"]
)
@admin_required
def export_feedback():
    if request.method == "OPTIONS":
        return _cors_response()

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Feedback"

    worksheet.append([
        "ID",
        "Name",
        "Email",
        "Message",
        "Status",
        "Admin Reply",
        "Created",
        "Updated"
    ])

    feedback = list(
        get_collection("feedback")
        .find({})
        .sort("createdAt", -1)
    )

    for item in feedback:
        created_at = item.get("createdAt")
        updated_at = item.get("updatedAt")

        if hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()

        if hasattr(updated_at, "isoformat"):
            updated_at = updated_at.isoformat()

        worksheet.append([
            str(item.get("_id", "")),
            item.get("name", ""),
            item.get("email", ""),
            item.get("message", ""),
            item.get("status", ""),
            item.get("adminReply", ""),
            created_at or "",
            updated_at or ""
        ])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    _log_action("export_feedback")

    return send_file(
        buffer,
        mimetype=(
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),
        as_attachment=True,
        download_name="feedback.xlsx"
    )


# ============================================================
# EXCEL IMPORT
# ============================================================

@admin_bp.route(
    "/import",
    methods=["POST", "OPTIONS"]
)
@admin_required
def import_excel():
    if request.method == "OPTIONS":
        return _cors_response()

    if "file" not in request.files:
        return jsonify({
            "error": "No file provided"
        }), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({
            "error": "No file selected"
        }), 400

    if not file.filename.lower().endswith(
        (".xlsx", ".xls")
    ):
        return jsonify({
            "error": "Only Excel files are supported"
        }), 400

    try:
        workbook = load_workbook(
            file,
            data_only=True
        )
    except Exception as exc:
        return jsonify({
            "error": "Failed to read Excel file",
            "details": str(exc)
        }), 500

    try:
        from scripts.import_excel import import_workbook

        result = import_workbook(workbook)

    except Exception as exc:
        return jsonify({
            "error": "Excel import failed",
            "details": str(exc)
        }), 500

    _log_action("import_excel", result)

    return jsonify(result), 200


# ============================================================
# AUDIT LOGS
# ============================================================

@admin_bp.route(
    "/audit-logs",
    methods=["GET", "OPTIONS"]
)
@admin_required
def list_audit_logs():
    if request.method == "OPTIONS":
        return _cors_response()

    page, limit = _pagination()
    logs_collection = get_collection("admin_audit_logs")

    query = {}

    action = (
        request.args.get("action") or ""
    ).strip()

    if action:
        query["action"] = {
            "$regex": action,
            "$options": "i"
        }

    total = logs_collection.count_documents(query)

    logs = list(
        logs_collection.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    return jsonify({
        "logs": serialize_doc(logs),
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": _total_pages(total, limit),
    }), 200
