from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc, to_objectid

skills_bp = Blueprint("skills", __name__, url_prefix="/skills")


@skills_bp.route("", methods=["GET"])
@token_required
def search_skills():
    q = (request.args.get("q") or "").strip()
    limit = int(request.args.get("limit", "20"))
    query = {"active": {"$ne": False}}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    skills = get_collection("skills").find(query).sort("name", 1).limit(limit)
    return jsonify({"skills": serialize_doc(list(skills))}), 200


@skills_bp.route("/user", methods=["GET"])
@token_required
def get_user_skills():
    user_skills_doc = get_collection("user_skills").find_one({"userId": g.current_user_id})
    if not user_skills_doc:
        return jsonify({"skills": []}), 200

    skill_ids = [s["skillId"] for s in user_skills_doc.get("skills", [])]
    skills = list(get_collection("skills").find({"_id": {"$in": skill_ids}}))
    skill_map = {str(s["_id"]): s for s in skills}
    result = []
    for entry in user_skills_doc.get("skills", []):
        skill = skill_map.get(str(entry["skillId"]))
        if skill:
            result.append({
                "_id": str(skill["_id"]),
                "name": skill["name"],
                "category": skill.get("category", ""),
                "source": entry.get("source", "manual"),
            })
    return jsonify({"skills": serialize_doc(result)}), 200


@skills_bp.route("/manual", methods=["POST"])
@token_required
def add_manual_skills():
    data = request.get_json() or {}
    skill_ids = data.get("skillIds", [])
    if not skill_ids:
        return jsonify({"error": "skillIds is required"}), 400

    obj_ids = [to_objectid(sid) for sid in skill_ids if to_objectid(sid)]
    skills_collection = get_collection("skills")
    valid_skills = list(skills_collection.find({"_id": {"$in": obj_ids}, "active": {"$ne": False}}))
    if not valid_skills:
        return jsonify({"error": "No valid skills found"}), 400

    user_skills = get_collection("user_skills")
    existing = user_skills.find_one({"userId": g.current_user_id})
    now = datetime.now(timezone.utc)

    if existing:
        existing_ids = {s["skillId"] for s in existing.get("skills", [])}
        new_entries = []
        for skill in valid_skills:
            if skill["_id"] not in existing_ids:
                new_entries.append({"skillId": skill["_id"], "source": "manual", "addedAt": now})
        if new_entries:
            user_skills.update_one(
                {"userId": g.current_user_id},
                {"$push": {"skills": {"$each": new_entries}}, "$set": {"updatedAt": now}},
            )
    else:
        user_skills.insert_one({
            "userId": g.current_user_id,
            "skills": [{"skillId": skill["_id"], "source": "manual", "addedAt": now} for skill in valid_skills],
            "createdAt": now,
            "updatedAt": now,
        })

    return jsonify({"added": len(valid_skills)}), 200


@skills_bp.route("/confirm", methods=["POST"])
@token_required
def confirm_extracted_skills():
    data = request.get_json() or {}
    skill_ids = data.get("skillIds", [])
    if not skill_ids:
        return jsonify({"error": "skillIds is required"}), 400

    obj_ids = [to_objectid(sid) for sid in skill_ids if to_objectid(sid)]
    skills_collection = get_collection("skills")
    valid_skills = list(skills_collection.find({"_id": {"$in": obj_ids}}))
    if not valid_skills:
        return jsonify({"error": "No valid skills found"}), 400

    user_skills = get_collection("user_skills")
    existing = user_skills.find_one({"userId": g.current_user_id})
    now = datetime.now(timezone.utc)

    if existing:
        existing_ids = {s["skillId"] for s in existing.get("skills", [])}
        new_entries = []
        for skill in valid_skills:
            if skill["_id"] not in existing_ids:
                new_entries.append({"skillId": skill["_id"], "source": "resume", "addedAt": now})
        if new_entries:
            user_skills.update_one(
                {"userId": g.current_user_id},
                {"$push": {"skills": {"$each": new_entries}}, "$set": {"updatedAt": now}},
            )
    else:
        user_skills.insert_one({
            "userId": g.current_user_id,
            "skills": [{"skillId": skill["_id"], "source": "resume", "addedAt": now} for skill in valid_skills],
            "createdAt": now,
            "updatedAt": now,
        })

    resumes = get_collection("resumes")
    resumes.update_many(
        {"userId": g.current_user_id, "status": "extracted"},
        {"$set": {"status": "confirmed", "updatedAt": now}},
    )

    return jsonify({"confirmed": len(valid_skills)}), 200
