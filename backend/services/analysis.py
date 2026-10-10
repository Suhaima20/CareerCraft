from bson import ObjectId

from db import get_collection
from utils.serialization import to_objectid


# =============================================================
# HELPERS
# =============================================================

def _get_skill_name(skill):
    """Return a skill name from either supported schema."""
    return (
        skill.get("name")
        or skill.get("Skill name")
        or ""
    ).strip()


def _get_skill_code(skill):
    """Return a skill code from either supported schema."""
    return (
        skill.get("skill_id")
        or skill.get("Skill ID")
    )


def _get_career_name(career):
    """Return a career name from either supported schema."""
    return (
        career.get("name")
        or career.get("Career name")
        or ""
    )


def _get_career_code(career):
    """Return a career code from either supported schema."""
    return (
        career.get("career_id")
        or career.get("Career ID")
    )


def _get_mappings_for_career(mapping_collection, career):
    """
    Support both current ObjectId-based mappings and
    legacy code-based mappings.
    """
    career_id = career["_id"]
    career_code = _get_career_code(career)

    conditions = [
        {"careerId": career_id},
        {"career_id": career_code},
        {"Career ID": career_code},
    ]

    # Remove code-based conditions when no code exists.
    conditions = [
        condition
        for condition in conditions
        if next(iter(condition.values())) is not None
    ]

    mappings = list(
        mapping_collection.find({"$or": conditions})
        .sort("order", 1)
    )

    return mappings


def _resolve_skill_reference(skills_collection, reference):
    """
    Resolve either:
      - a MongoDB ObjectId
      - a string containing an ObjectId
      - a legacy skill code
    """
    if reference is None:
        return None

    # Current schema: skillId contains an ObjectId.
    if isinstance(reference, ObjectId):
        return skills_collection.find_one({"_id": reference})

    if isinstance(reference, str):
        reference = reference.strip()

        if not reference:
            return None

        # First try an ObjectId represented as a string.
        try:
            object_id = ObjectId(reference)

            skill = skills_collection.find_one({
                "_id": object_id
            })

            if skill:
                return skill

        except Exception:
            pass

        # Then try legacy skill codes.
        return skills_collection.find_one({
            "$or": [
                {"skill_id": reference},
                {"Skill ID": reference},
            ]
        })

    return None


def _get_career_skills(
    career,
    mapping_collection,
    skills_collection
):
    """
    Resolve all skills required for a career.

    Returns unique skill documents in mapping order.
    Supports both ObjectId and legacy code mappings.
    """
    mappings = _get_mappings_for_career(
        mapping_collection,
        career
    )

    resolved_skills = []
    seen_ids = set()

    for mapping in mappings:
        # Current database schema uses skillId.
        reference = (
            mapping.get("skillId")
            or mapping.get("skill_id")
            or mapping.get("Skill ID")
        )

        skill = _resolve_skill_reference(
            skills_collection,
            reference
        )

        if not skill:
            continue

        skill_id = skill["_id"]

        # Prevent the same database skill being counted twice.
        if skill_id in seen_ids:
            continue

        seen_ids.add(skill_id)
        resolved_skills.append(skill)

    return resolved_skills


def _build_skill_info(skill):
    """Build the skill object expected by the frontend."""
    return {
        "_id": str(skill["_id"]),
        "skillId": _get_skill_code(skill),
        "name": _get_skill_name(skill),
        "category": skill.get("category", ""),
        "description": (
            skill.get("description")
            or skill.get("Skill description")
            or ""
        ),
    }


def _get_user_skill_ids(
    user_id,
    user_skills_collection,
    skills_collection
):
    """
    Return unique, valid current skill ObjectIds belonging
    to the user.

    References to deleted or obsolete skill records are
    ignored safely. This function does not modify user data.
    """
    user_skills_doc = user_skills_collection.find_one({
        "userId": to_objectid(user_id)
    })

    resolved_ids = set()

    if not user_skills_doc:
        return resolved_ids

    for entry in user_skills_doc.get("skills", []):
        if not isinstance(entry, dict):
            continue

        reference = entry.get("skillId")

        skill = _resolve_skill_reference(
            skills_collection,
            reference
        )

        if skill:
            resolved_ids.add(skill["_id"])

    return resolved_ids


def _calculate_match(required_skills, user_skill_ids):
    """
    Compare confirmed user skills with required career skills.
    Returns known skills, missing skills and match percentage.
    """
    known = []
    missing = []

    for skill in required_skills:
        skill_info = _build_skill_info(skill)

        if skill["_id"] in user_skill_ids:
            known.append(skill_info)
        else:
            missing.append(skill_info)

    total = len(required_skills)

    percentage = (
        round((len(known) / total) * 100)
        if total
        else 0
    )

    return known, missing, percentage


# =============================================================
# MAIN ANALYSIS
# =============================================================

def run_analysis(user_id, career_id):
    careers = get_collection("careers")
    skills_collection = get_collection("skills")
    mapping_collection = get_collection("career_skill_mapping")
    user_skills_collection = get_collection("user_skills")
    analyses_collection = get_collection("skill_gap_analyses")

    # ---------------------------------------------------------
    # 1. Resolve the selected career
    # ---------------------------------------------------------

    try:
        career_object_id = to_objectid(career_id)
    except Exception:
        return None

    career = careers.find_one({
        "_id": career_object_id
    })

    if career is None:
        return None

    # ---------------------------------------------------------
    # 2. Get the user's valid, confirmed skills
    # ---------------------------------------------------------

    user_object_id = to_objectid(user_id)

    user_skill_ids = _get_user_skill_ids(
        user_object_id,
        user_skills_collection,
        skills_collection
    )

    # ---------------------------------------------------------
    # 3. Analyze the selected career
    # ---------------------------------------------------------

    required_skills = _get_career_skills(
        career,
        mapping_collection,
        skills_collection
    )

    known, missing, match_percentage = _calculate_match(
        required_skills,
        user_skill_ids
    )

    # ---------------------------------------------------------
    # 4. Compare against other active careers
    # ---------------------------------------------------------

    other_careers = list(
        careers.find({
            "_id": {"$ne": career_object_id},
            "active": {"$ne": False}
        })
    )

    alternatives = []

    for other_career in other_careers:
        other_required_skills = _get_career_skills(
            other_career,
            mapping_collection,
            skills_collection
        )

        _, _, other_match_percentage = _calculate_match(
            other_required_skills,
            user_skill_ids
        )

        alternatives.append({
            "_id": str(other_career["_id"]),
            "careerId": _get_career_code(other_career),
            "name": _get_career_name(other_career),
            "matchPercentage": other_match_percentage,
            "knownSkillCount": sum(
                1
                for skill in other_required_skills
                if skill["_id"] in user_skill_ids
            ),
            "requiredSkillCount": len(other_required_skills),
        })

    # Highest match first; keep sorting deterministic on ties.
    alternatives.sort(
        key=lambda item: (
            -item["matchPercentage"],
            item["name"].lower()
        )
    )

    alternatives = alternatives[:3]

    # ---------------------------------------------------------
    # 5. Build the analysis document
    # ---------------------------------------------------------

    analysis_doc = {
        "userId": user_object_id,
        "careerId": career_object_id,
        "careerName": _get_career_name(career),

        # Preserve the existing API response structure.
        "requiredSkills": [
            skill["_id"]
            for skill in required_skills
        ],

        "knownSkills": known,
        "missingSkills": missing,
        "matchPercentage": match_percentage,
        "alternativeCareers": alternatives,
    }

    # ---------------------------------------------------------
    # 6. Save or update the existing analysis
    # ---------------------------------------------------------

    existing = analyses_collection.find_one({
        "userId": user_object_id,
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