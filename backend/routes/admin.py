import os
import io
from flask import Blueprint, request, jsonify, g, send_file
from datetime import datetime, timezone
from openpyxl import Workbook
from db import get_collection
from utils.auth import admin_required
from utils.serialization import serialize_doc, to_objectid

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def _log_action(action, details=None):
    get_collection("admin_audit_logs").insert_one({
        "adminId": g.current_user_id,
        "action": action,
        "details": details or {},
        "createdAt": datetime.now(timezone.utc),
    })


# ---- Dashboard Stats ----
@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    db = get_collection
    total_users = db("users").count_documents({"role": {"$ne": "admin"}})
    active_users = db("users").count_documents({"role": {"$ne": "admin"}, "lastActivityDate": {"$ne": None}})
    total_careers = db("careers").count_documents({})
    total_skills = db("skills").count_documents({})
    total_chapters = db("chapters").count_documents({})
    total_resumes = db("resumes").count_documents({})
    total_feedback = db("feedback").count_documents({})
    total_trending = db("market_data").count_documents({})

    recent_users = list(db("users").find({"role": {"$ne": "admin"}}).sort("createdAt", -1).limit(5))

    return jsonify({
        "totalUsers": total_users,
        "activeUsers": active_users,
        "totalCareers": total_careers,
        "totalSkills": total_skills,
        "totalChapters": total_chapters,
        "totalResumes": total_resumes,
        "totalFeedback": total_feedback,
        "totalTrending": total_trending,
        "recentUsers": serialize_doc(recent_users),
    }), 200


# ---- Users ----
@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    q = (request.args.get("q") or "").strip()
    page = int(request.args.get("page", "1"))
    limit = int(request.args.get("limit", "10"))
    query = {"role": {"$ne": "admin"}}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    total = get_collection("users").count_documents(query)
    users = list(get_collection("users").find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit))
    total_pages = max(1, (total + limit - 1) // limit)
    return jsonify({"users": serialize_doc(users), "totalPages": total_pages}), 200


@admin_bp.route("/users/<user_id>", methods=["GET"])
@admin_required
def get_user(user_id):
    user = get_collection("users").find_one({"_id": to_objectid(user_id)})
    if user is None:
        return jsonify({"error": "User not found"}), 404
    user_skills_doc = get_collection("user_skills").find_one({"userId": user["_id"]})
    skill_ids = [s["skillId"] for s in (user_skills_doc.get("skills", []) if user_skills_doc else [])]
    skills = list(get_collection("skills").find({"_id": {"$in": skill_ids}}))
    user["skills"] = skills
    if user.get("activeCareerId"):
        career = get_collection("careers").find_one({"_id": user["activeCareerId"]})
        user["activeCareerName"] = career["name"] if career else None
    return jsonify({"user": serialize_doc(user)}), 200


@admin_bp.route("/users/<user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    data = request.get_json() or {}
    allowed = ["name", "age", "phone", "profession", "role"]
    update = {k: data[k] for k in allowed if k in data}
    update["updatedAt"] = datetime.now(timezone.utc)
    get_collection("users").update_one({"_id": to_objectid(user_id)}, {"$set": update})
    _log_action("update_user", {"userId": user_id, "fields": list(update.keys())})
    return jsonify({"updated": True}), 200


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    get_collection("users").delete_one({"_id": to_objectid(user_id)})
    get_collection("user_skills").delete_many({"userId": to_objectid(user_id)})
    get_collection("roadmap_progress").delete_many({"userId": to_objectid(user_id)})
    get_collection("skill_gap_analyses").delete_many({"userId": to_objectid(user_id)})
    get_collection("achievements").delete_many({"userId": to_objectid(user_id)})
    get_collection("notifications").delete_many({"userId": to_objectid(user_id)})
    _log_action("delete_user", {"userId": user_id})
    return jsonify({"deleted": True}), 200


# ---- Careers ----
@admin_bp.route("/careers", methods=["GET"])
@admin_required
def list_careers():
    q = (request.args.get("q") or "").strip()
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    careers = list(get_collection("careers").find(query).sort("name", 1))
    return jsonify({"careers": serialize_doc(careers)}), 200


@admin_bp.route("/careers", methods=["POST"])
@admin_required
def create_career():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Career name is required"}), 400
    if get_collection("careers").find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}):
        return jsonify({"error": "Career already exists"}), 409
    doc = {
        "name": name,
        "description": data.get("description", ""),
        "active": data.get("active", True),
        "createdAt": datetime.now(timezone.utc),
    }
    result = get_collection("careers").insert_one(doc)
    doc["_id"] = result.inserted_id
    _log_action("create_career", {"careerId": str(result.inserted_id)})
    return jsonify(serialize_doc(doc)), 201


@admin_bp.route("/careers/<career_id>", methods=["PUT"])
@admin_required
def update_career(career_id):
    data = request.get_json() or {}
    update = {k: data[k] for k in ["name", "description", "active"] if k in data}
    update["updatedAt"] = datetime.now(timezone.utc)
    get_collection("careers").update_one({"_id": to_objectid(career_id)}, {"$set": update})
    _log_action("update_career", {"careerId": career_id})
    return jsonify({"updated": True}), 200


@admin_bp.route("/careers/<career_id>", methods=["DELETE"])
@admin_required
def delete_career(career_id):
    get_collection("careers").delete_one({"_id": to_objectid(career_id)})
    get_collection("career_skill_mapping").delete_many({"careerId": to_objectid(career_id)})
    _log_action("delete_career", {"careerId": career_id})
    return jsonify({"deleted": True}), 200


# ---- Skills ----
@admin_bp.route("/skills", methods=["GET"])
@admin_required
def list_skills():
    q = (request.args.get("q") or "").strip()
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    skills = list(get_collection("skills").find(query).sort("name", 1))
    return jsonify({"skills": serialize_doc(skills)}), 200


@admin_bp.route("/skills", methods=["POST"])
@admin_required
def create_skill():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Skill name is required"}), 400
    if get_collection("skills").find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}):
        return jsonify({"error": "Skill already exists"}), 409
    doc = {
        "name": name,
        "category": data.get("category", ""),
        "description": data.get("description", ""),
        "active": data.get("active", True),
        "createdAt": datetime.now(timezone.utc),
    }
    result = get_collection("skills").insert_one(doc)
    doc["_id"] = result.inserted_id
    _log_action("create_skill", {"skillId": str(result.inserted_id)})
    return jsonify(serialize_doc(doc)), 201


@admin_bp.route("/skills/<skill_id>", methods=["PUT"])
@admin_required
def update_skill(skill_id):
    data = request.get_json() or {}
    update = {k: data[k] for k in ["name", "category", "description", "active"] if k in data}
    update["updatedAt"] = datetime.now(timezone.utc)
    get_collection("skills").update_one({"_id": to_objectid(skill_id)}, {"$set": update})
    _log_action("update_skill", {"skillId": skill_id})
    return jsonify({"updated": True}), 200


@admin_bp.route("/skills/<skill_id>", methods=["DELETE"])
@admin_required
def delete_skill(skill_id):
    get_collection("skills").delete_one({"_id": to_objectid(skill_id)})
    get_collection("skill_chapter_mapping").delete_many({"skillId": to_objectid(skill_id)})
    get_collection("career_skill_mapping").delete_many({"skillId": to_objectid(skill_id)})
    _log_action("delete_skill", {"skillId": skill_id})
    return jsonify({"deleted": True}), 200


# ---- Chapters ----
@admin_bp.route("/chapters", methods=["GET"])
@admin_required
def list_chapters():
    q = (request.args.get("q") or "").strip()
    query = {}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    chapters = list(get_collection("chapters").find(query).sort("order", 1))
    return jsonify({"chapters": serialize_doc(chapters)}), 200


@admin_bp.route("/chapters", methods=["POST"])
@admin_required
def create_chapter():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Chapter title is required"}), 400
    doc = {
        "title": title,
        "description": data.get("description", ""),
        "youtubeUrl": data.get("youtubeUrl", ""),
        "duration": data.get("duration", ""),
        "order": data.get("order", 0),
        "active": data.get("active", True),
        "createdAt": datetime.now(timezone.utc),
    }
    result = get_collection("chapters").insert_one(doc)
    doc["_id"] = result.inserted_id
    _log_action("create_chapter", {"chapterId": str(result.inserted_id)})
    return jsonify(serialize_doc(doc)), 201


@admin_bp.route("/chapters/<chapter_id>", methods=["PUT"])
@admin_required
def update_chapter(chapter_id):
    data = request.get_json() or {}
    update = {k: data[k] for k in ["title", "description", "youtubeUrl", "duration", "order", "active"] if k in data}
    update["updatedAt"] = datetime.now(timezone.utc)
    get_collection("chapters").update_one({"_id": to_objectid(chapter_id)}, {"$set": update})
    _log_action("update_chapter", {"chapterId": chapter_id})
    return jsonify({"updated": True}), 200


@admin_bp.route("/chapters/<chapter_id>", methods=["DELETE"])
@admin_required
def delete_chapter(chapter_id):
    get_collection("chapters").delete_one({"_id": to_objectid(chapter_id)})
    get_collection("skill_chapter_mapping").delete_many({"chapterId": to_objectid(chapter_id)})
    _log_action("delete_chapter", {"chapterId": chapter_id})
    return jsonify({"deleted": True}), 200


# ---- Mappings ----
@admin_bp.route("/mappings/career-skills/<career_id>", methods=["GET"])
@admin_required
def get_career_skills(career_id):
    mappings = list(get_collection("career_skill_mapping").find({"careerId": to_objectid(career_id)}))
    skill_ids = [m["skillId"] for m in mappings]
    skills = list(get_collection("skills").find({"_id": {"$in": skill_ids}}))
    return jsonify({"skills": serialize_doc(skills)}), 200


@admin_bp.route("/mappings/career-skills/<career_id>", methods=["PUT"])
@admin_required
def set_career_skills(career_id):
    data = request.get_json() or {}
    skill_ids = data.get("skillIds", [])
    career_obj_id = to_objectid(career_id)

    get_collection("career_skill_mapping").delete_many({"careerId": career_obj_id})
    now = datetime.now(timezone.utc)
    for sid in skill_ids:
        obj_id = to_objectid(sid)
        if obj_id:
            get_collection("career_skill_mapping").insert_one({
                "careerId": career_obj_id,
                "skillId": obj_id,
                "createdAt": now,
            })
    _log_action("set_career_skills", {"careerId": career_id, "skillCount": len(skill_ids)})
    return jsonify({"mapped": len(skill_ids)}), 200


@admin_bp.route("/mappings/skill-chapters/<skill_id>", methods=["GET"])
@admin_required
def get_skill_chapters(skill_id):
    mappings = list(get_collection("skill_chapter_mapping").find({"skillId": to_objectid(skill_id)}))
    chapter_ids = [m["chapterId"] for m in mappings]
    chapters = list(get_collection("chapters").find({"_id": {"$in": chapter_ids}}))
    return jsonify({"chapters": serialize_doc(chapters)}), 200


@admin_bp.route("/mappings/skill-chapters/<skill_id>", methods=["PUT"])
@admin_required
def set_skill_chapters(skill_id):
    data = request.get_json() or {}
    chapter_ids = data.get("chapterIds", [])
    skill_obj_id = to_objectid(skill_id)

    get_collection("skill_chapter_mapping").delete_many({"skillId": skill_obj_id})
    now = datetime.now(timezone.utc)
    for cid in chapter_ids:
        obj_id = to_objectid(cid)
        if obj_id:
            get_collection("skill_chapter_mapping").insert_one({
                "skillId": skill_obj_id,
                "chapterId": obj_id,
                "createdAt": now,
            })
    _log_action("set_skill_chapters", {"skillId": skill_id, "chapterCount": len(chapter_ids)})
    return jsonify({"mapped": len(chapter_ids)}), 200


# ---- Resumes ----
@admin_bp.route("/resumes", methods=["GET"])
@admin_required
def list_resumes():
    page = int(request.args.get("page", "1"))
    limit = int(request.args.get("limit", "20"))
    query = {}
    total = get_collection("resumes").count_documents(query)
    resumes = list(get_collection("resumes").find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit))
    total_pages = max(1, (total + limit - 1) // limit)
    return jsonify({"resumes": serialize_doc(resumes), "totalPages": total_pages}), 200


@admin_bp.route("/resumes/<resume_id>", methods=["GET"])
@admin_required
def get_resume(resume_id):
    resume = get_collection("resumes").find_one({"_id": to_objectid(resume_id)})
    if resume is None:
        return jsonify({"error": "Resume not found"}), 404
    return jsonify(serialize_doc(resume)), 200


# ---- Feedback ----
@admin_bp.route("/feedback", methods=["GET"])
@admin_required
def list_feedback():
    status = request.args.get("status")
    query = {}
    if status:
        query["status"] = status
    feedback = list(get_collection("feedback").find(query).sort("createdAt", -1).limit(50))
    return jsonify({"feedback": serialize_doc(feedback)}), 200


@admin_bp.route("/feedback/<feedback_id>", methods=["PUT"])
@admin_required
def update_feedback_status(feedback_id):
    data = request.get_json() or {}
    status = data.get("status")
    if not status:
        return jsonify({"error": "Status is required"}), 400
    get_collection("feedback").update_one(
        {"_id": to_objectid(feedback_id)},
        {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc)}},
    )
    _log_action("update_feedback", {"feedbackId": feedback_id, "status": status})
    return jsonify({"updated": True}), 200


# ---- Trending ----
@admin_bp.route("/trending", methods=["GET"])
@admin_required
def list_trending():
    items = list(get_collection("market_data").find({}).sort("order", 1))
    return jsonify({"trending": serialize_doc(items)}), 200


@admin_bp.route("/trending", methods=["POST"])
@admin_required
def add_trending():
    data = request.get_json() or {}
    item_type = (data.get("type") or "").strip()
    item_id = data.get("itemId")
    label = (data.get("label") or "").strip()

    if not item_type or not item_id:
        return jsonify({"error": "type and itemId are required"}), 400

    item_obj_id = to_objectid(item_id)
    if item_obj_id is None:
        return jsonify({"error": "Invalid itemId"}), 400

    if item_type == "career":
        item = get_collection("careers").find_one({"_id": item_obj_id})
        market_type = "trending_career"
    elif item_type == "skill":
        item = get_collection("skills").find_one({"_id": item_obj_id})
        market_type = "trending_skill"
    else:
        return jsonify({"error": "type must be 'career' or 'skill'"}), 400

    if item is None:
        return jsonify({"error": f"{item_type} not found"}), 404

    display_name = label or item.get("name", "")
    doc = {
        "name": display_name,
        "label": label,
        "itemId": item_obj_id,
        "itemName": item.get("name", ""),
        "type": item_type,
        "marketType": market_type,
        "order": get_collection("market_data").count_documents({}) + 1,
        "createdAt": datetime.now(timezone.utc),
    }
    result = get_collection("market_data").insert_one(doc)
    doc["_id"] = result.inserted_id
    _log_action("add_trending", {"trendingId": str(result.inserted_id)})
    return jsonify(serialize_doc(doc)), 201


@admin_bp.route("/trending/<trending_id>", methods=["DELETE"])
@admin_required
def remove_trending(trending_id):
    get_collection("market_data").delete_one({"_id": to_objectid(trending_id)})
    _log_action("remove_trending", {"trendingId": trending_id})
    return jsonify({"deleted": True}), 200


# ---- Exports ----
@admin_bp.route("/export/users", methods=["GET"])
@admin_required
def export_users():
    wb = Workbook()
    ws = wb.active
    ws.title = "Users"
    ws.append(["ID", "Name", "Email", "Age", "Phone", "Profession", "Active Career", "Streak", "Joined"])
    users = list(get_collection("users").find({"role": {"$ne": "admin"}}).sort("createdAt", -1))
    for u in users:
        ws.append([
            str(u["_id"]),
            u.get("name", ""),
            u.get("email", ""),
            u.get("age", ""),
            u.get("phone", ""),
            u.get("profession", ""),
            u.get("activeCareerName", ""),
            u.get("streak", 0),
            u.get("createdAt", "").isoformat() if u.get("createdAt") else "",
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    _log_action("export_users")
    return send_file(buffer, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name="users.xlsx")


@admin_bp.route("/export/feedback", methods=["GET"])
@admin_required
def export_feedback():
    wb = Workbook()
    ws = wb.active
    ws.title = "Feedback"
    ws.append(["ID", "Name", "Email", "Message", "Status", "Created"])
    feedback = list(get_collection("feedback").find({}).sort("createdAt", -1))
    for f in feedback:
        ws.append([
            str(f["_id"]),
            f.get("name", ""),
            f.get("email", ""),
            f.get("message", ""),
            f.get("status", ""),
            f.get("createdAt", "").isoformat() if f.get("createdAt") else "",
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    _log_action("export_feedback")
    return send_file(buffer, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name="feedback.xlsx")


# ---- Import ----
@admin_bp.route("/import", methods=["POST"])
@admin_required
def import_excel():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        return jsonify({"error": "Only Excel files are supported"}), 400

    from openpyxl import load_workbook
    try:
        wb = load_workbook(file, data_only=True)
    except Exception:
        return jsonify({"error": "Failed to read Excel file"}), 500

    from scripts.import_excel import import_workbook
    result = import_workbook(wb)
    _log_action("import_excel", result)
    return jsonify(result), 200


# ---- Audit Logs ----
@admin_bp.route("/audit-logs", methods=["GET"])
@admin_required
def list_audit_logs():
    page = int(request.args.get("page", "1"))
    limit = int(request.args.get("limit", "20"))
    query = {}
    total = get_collection("admin_audit_logs").count_documents(query)
    logs = list(get_collection("admin_audit_logs").find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit))
    total_pages = max(1, (total + limit - 1) // limit)
    return jsonify({"logs": serialize_doc(logs), "totalPages": total_pages}), 200
