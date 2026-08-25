from db import get_collection
from utils.serialization import to_objectid


def run_analysis(user_id, career_id):
    careers = get_collection("careers")
    skills_collection = get_collection("skills")
    mapping_collection = get_collection("career_skill_mapping")
    user_skills_collection = get_collection("user_skills")
    analyses_collection = get_collection("skill_gap_analyses")

    # ---------------------------------------------------------
    # 1. Find career
    # ---------------------------------------------------------

    career_object_id = to_objectid(career_id)

    career = careers.find_one({"_id": career_object_id})

    if career is None:
        return None

    # ---------------------------------------------------------
    # 2. Get career skill mappings
    # ---------------------------------------------------------
    #
    # Your mappings contain:
    #
    # career_id = "CA002"
    # skill_id  = "SK0201"
    #
    # So we must NOT compare these directly with MongoDB
    # ObjectIds stored inside user_skills.
    # ---------------------------------------------------------

    career_code = career.get("career_id") or career.get("Career ID")

    mappings = list(
        mapping_collection.find({
            "$or": [
                {"career_id": career_code},
                {"Career ID": career_code},
                {"careerId": career_object_id}
            ]
        })
    )

    # ---------------------------------------------------------
    # 3. Extract skill codes from mappings
    # ---------------------------------------------------------

    required_skill_codes = []

    for mapping in mappings:

        skill_code = (
            mapping.get("skill_id")
            or mapping.get("Skill ID")
        )

        if skill_code:
            required_skill_codes.append(skill_code)

    # Remove duplicates while preserving order
    required_skill_codes = list(dict.fromkeys(required_skill_codes))

    # ---------------------------------------------------------
    # 4. Convert skill codes to MongoDB skill ObjectIds
    # ---------------------------------------------------------

    required_skills = []

    for skill_code in required_skill_codes:

        skill = skills_collection.find_one({
            "$or": [
                {"skill_id": skill_code},
                {"Skill ID": skill_code}
            ]
        })

        if skill:
            required_skills.append(skill)

    # ---------------------------------------------------------
    # 5. Get user's skills
    # ---------------------------------------------------------

    user_skills_doc = user_skills_collection.find_one({
        "userId": to_objectid(user_id)
    })

    user_skill_ids = set()

    if user_skills_doc:

        for skill in user_skills_doc.get("skills", []):

            skill_id = skill.get("skillId")

            if skill_id:
                try:
                    user_skill_ids.add(to_objectid(skill_id))
                except Exception:
                    pass

    # ---------------------------------------------------------
    # 6. Compare user's skills with required skills
    # ---------------------------------------------------------

    known = []
    missing = []

    for skill in required_skills:

        skill_object_id = skill["_id"]

        skill_info = {
            "_id": str(skill_object_id),
            "skillId": skill.get("skill_id") or skill.get("Skill ID"),
            "name": skill.get("name") or skill.get("Skill name", ""),
            "category": skill.get("category", ""),
            "description": skill.get("description")
            or skill.get("Skill description", "")
        }

        if skill_object_id in user_skill_ids:
            known.append(skill_info)
        else:
            missing.append(skill_info)

    # ---------------------------------------------------------
    # 7. Calculate match percentage
    # ---------------------------------------------------------

    total = len(required_skills)
    known_count = len(known)

    match_percentage = (
        round((known_count / total) * 100)
        if total > 0
        else 0
    )

    # ---------------------------------------------------------
    # 8. Alternative career recommendations
    # ---------------------------------------------------------

    other_careers = list(
        careers.find({
            "_id": {"$ne": career_object_id},
            "active": {"$ne": False}
        })
    )

    alternatives = []

    for other in other_careers:

        other_code = (
            other.get("career_id")
            or other.get("Career ID")
        )

        other_mappings = list(
            mapping_collection.find({
                "$or": [
                    {"career_id": other_code},
                    {"Career ID": other_code},
                    {"careerId": other["_id"]}
                ]
            })
        )

        other_skill_codes = []

        for mapping in other_mappings:

            skill_code = (
                mapping.get("skill_id")
                or mapping.get("Skill ID")
            )

            if skill_code:
                other_skill_codes.append(skill_code)

        other_skill_ids = []

        for skill_code in other_skill_codes:

            skill = skills_collection.find_one({
                "$or": [
                    {"skill_id": skill_code},
                    {"Skill ID": skill_code}
                ]
            })

            if skill:
                other_skill_ids.append(skill["_id"])

        matched = sum(
            1
            for skill_id in other_skill_ids
            if skill_id in user_skill_ids
        )

        other_total = len(other_skill_ids)

        other_match = (
            round((matched / other_total) * 100)
            if other_total > 0
            else 0
        )

        alternatives.append({
            "_id": str(other["_id"]),
            "careerId": other_code,
            "name": other.get("name")
            or other.get("Career name", ""),
            "matchPercentage": other_match
        })

    alternatives.sort(
        key=lambda x: x["matchPercentage"],
        reverse=True
    )

    alternatives = alternatives[:3]

    # ---------------------------------------------------------
    # 9. Build analysis document
    # ---------------------------------------------------------

    analysis_doc = {
        "userId": to_objectid(user_id),
        "careerId": career_object_id,
        "careerName": career.get("name")
        or career.get("Career name", ""),

        "requiredSkills": [
            skill["_id"]
            for skill in required_skills
        ],

        "knownSkills": known,

        "missingSkills": missing,

        "matchPercentage": match_percentage,

        "alternativeCareers": alternatives
    }

    # ---------------------------------------------------------
    # 10. Save / update analysis
    # ---------------------------------------------------------

    existing = analyses_collection.find_one({
        "userId": to_objectid(user_id),
        "careerId": career_object_id
    })

    if existing:

        analyses_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": analysis_doc}
        )

        analysis_doc["_id"] = existing["_id"]

    else:

        result = analyses_collection.insert_one(
            analysis_doc
        )

        analysis_doc["_id"] = result.inserted_id

    return analysis_doc