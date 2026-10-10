from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone

from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc
from services.streak import update_streak


careers_bp = Blueprint(
    "careers",
    __name__,
    url_prefix="/careers"
)


# ============================================================
# HELPERS
# ============================================================

def get_career_code(career):
    """
    Returns the Excel career ID.

    Example:
        CA002
    """
    return (
        career.get("career_id")
        or career.get("Career ID")
    )


def get_skill_code(skill):
    """
    Returns the Excel skill ID.

    Example:
        SK0205
    """
    return (
        skill.get("skill_id")
        or skill.get("Skill ID")
    )


def get_career_skill_mappings(career_code):
    """
    Get all skills mapped to a career.
    """

    return list(
        get_collection("career_skill_mapping").find({
            "$or": [
                {"career_id": career_code},
                {"Career ID": career_code}
            ]
        })
    )


def get_skills_for_career(career_code):
    """
    Returns the actual skill documents belonging
    to a particular career.
    """

    mappings = get_career_skill_mappings(career_code)

    skill_codes = []

    for mapping in mappings:

        code = (
            mapping.get("skill_id")
            or mapping.get("Skill ID")
        )

        if code:
            skill_codes.append(code)

    skill_codes = list(dict.fromkeys(skill_codes))

    if not skill_codes:
        return []

    skills = list(
        get_collection("skills").find({
            "$or": [
                {"skill_id": {"$in": skill_codes}},
                {"Skill ID": {"$in": skill_codes}}
            ],
            "active": {"$ne": False}
        })
    )

    # Preserve mapping order
    skill_by_code = {}

    for skill in skills:

        code = get_skill_code(skill)

        if code:
            skill_by_code[code] = skill

    ordered_skills = []

    for code in skill_codes:

        if code in skill_by_code:
            ordered_skills.append(
                skill_by_code[code]
            )

    return ordered_skills


# ============================================================
# GET USER SKILLS
# ============================================================

def get_user_skill_codes():
    """
    Collect the user's skills from:

    1. user_skills collection
    2. latest extracted resume

    The stored resume is reused when the user switches careers.
    """

    user_skill_codes = set()

    # --------------------------------------------------------
    # 1. MANUALLY STORED / CONFIRMED USER SKILLS
    # --------------------------------------------------------

    user_skills_doc = get_collection(
        "user_skills"
    ).find_one({
        "userId": g.current_user_id
    })

    if user_skills_doc:

        for item in user_skills_doc.get("skills", []):

            if isinstance(item, dict):

                code = (
                    item.get("skill_id")
                    or item.get("skillId")
                    or item.get("Skill ID")
                )

                if code:
                    user_skill_codes.add(
                        str(code)
                    )

            elif isinstance(item, str):

                user_skill_codes.add(item)

    # --------------------------------------------------------
    # 2. LATEST STORED / EXTRACTED RESUME
    # --------------------------------------------------------

    resume = get_collection("resumes").find_one(
        {
            "userId": g.current_user_id,
            "status": "extracted"
        },
        sort=[("createdAt", -1)]
    )

    if resume:

        for skill_id in resume.get(
            "extractedSkillIds",
            []
        ):

            user_skill_codes.add(
                str(skill_id)
            )

    return user_skill_codes


# ============================================================
# CONVERT RESUME OBJECTIDS TO SKILL CODES
# ============================================================

def convert_objectids_to_skill_codes(
    user_skill_codes
):
    """
    Resume extraction may store MongoDB ObjectIds,
    while career mappings use skill codes such as SK0201.

    Convert ObjectIds to the corresponding skill codes.
    """

    if not user_skill_codes:
        return user_skill_codes

    values = list(user_skill_codes)

    try:

        from bson import ObjectId

        object_ids = []

        for value in values:

            try:
                object_ids.append(
                    ObjectId(value)
                )

            except Exception:
                pass

        if object_ids:

            resume_skills = list(
                get_collection("skills").find({
                    "_id": {
                        "$in": object_ids
                    }
                })
            )

            for skill in resume_skills:

                code = get_skill_code(skill)

                if code:
                    user_skill_codes.add(
                        str(code)
                    )

    except Exception:
        pass

    return user_skill_codes


# ============================================================
# CALCULATE CAREER MATCH
# ============================================================
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from bson import ObjectId

from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc
from services.streak import update_streak


careers_bp = Blueprint(
    "careers",
    __name__,
    url_prefix="/careers"
)


# ============================================================
# HELPERS
# ============================================================

def get_career_code(career):
    """Return the career code from either supported schema."""
    return (
        career.get("career_id")
        or career.get("Career ID")
    )


def get_skill_code(skill):
    """Return the skill code from either supported schema."""
    return (
        skill.get("skill_id")
        or skill.get("Skill ID")
    )


def _resolve_skill(reference):
    """
    Resolve a skill using:
    - MongoDB ObjectId
    - ObjectId represented as a string
    - Legacy skill code
    """
    skills_collection = get_collection("skills")

    if reference is None:
        return None

    if isinstance(reference, ObjectId):
        return skills_collection.find_one({
            "_id": reference
        })

    if isinstance(reference, str):
        reference = reference.strip()

        if not reference:
            return None

        # Try ObjectId string first.
        try:
            skill = skills_collection.find_one({
                "_id": ObjectId(reference)
            })

            if skill:
                return skill

        except Exception:
            pass

        # Fall back to legacy skill codes.
        return skills_collection.find_one({
            "$or": [
                {"skill_id": reference},
                {"Skill ID": reference}
            ]
        })

    return None


def get_career_skill_mappings(career_code):
    """
    Support current ObjectId-based mappings and
    legacy career-code-based mappings.
    """
    careers_collection = get_collection("careers")
    mapping_collection = get_collection(
        "career_skill_mapping"
    )

    career = careers_collection.find_one({
        "$or": [
            {"career_id": career_code},
            {"Career ID": career_code}
        ]
    })

    conditions = [
        {"career_id": career_code},
        {"Career ID": career_code}
    ]

    if career:
        conditions.append({
            "careerId": career["_id"]
        })

    return list(
        mapping_collection.find({
            "$or": conditions
        }).sort("order", 1)
    )


def get_skills_for_career(career_code):
    """
    Resolve the unique required skills for a career.
    Preserve mapping order and support both schemas.
    """
    mappings = get_career_skill_mappings(career_code)

    ordered_skills = []
    seen_ids = set()

    for mapping in mappings:
        reference = (
            mapping.get("skillId")
            or mapping.get("skill_id")
            or mapping.get("Skill ID")
        )

        skill = _resolve_skill(reference)

        if not skill:
            continue

        skill_id = skill["_id"]

        if skill_id in seen_ids:
            continue

        seen_ids.add(skill_id)
        ordered_skills.append(skill)

    return ordered_skills


# ============================================================
# GET USER SKILLS
# ============================================================

def get_user_skill_codes():
    """
    Collect unique skills from the user's confirmed skills
    and latest extracted resume.

    Resolve ObjectIds into skill codes before comparison.
    """
    user_skill_codes = set()

    # --------------------------------------------------------
    # 1. CONFIRMED USER SKILLS
    # --------------------------------------------------------

    user_skills_doc = get_collection(
        "user_skills"
    ).find_one({
        "userId": g.current_user_id
    })

    if user_skills_doc:
        for item in user_skills_doc.get("skills", []):
            if isinstance(item, dict):
                reference = (
                    item.get("skillId")
                    or item.get("skill_id")
                    or item.get("Skill ID")
                )

            elif isinstance(item, (str, ObjectId)):
                reference = item

            else:
                continue

            skill = _resolve_skill(reference)

            if skill:
                code = get_skill_code(skill)

                if code:
                    user_skill_codes.add(str(code))

    # --------------------------------------------------------
    # 2. LATEST EXTRACTED RESUME
    # --------------------------------------------------------

    resume = get_collection("resumes").find_one(
        {
            "userId": g.current_user_id,
            "status": "extracted"
        },
        sort=[("createdAt", -1)]
    )

    if resume:
        for reference in resume.get(
            "extractedSkillIds", []
        ):
            skill = _resolve_skill(reference)

            if skill:
                code = get_skill_code(skill)

                if code:
                    user_skill_codes.add(str(code))

    return user_skill_codes


def convert_objectids_to_skill_codes(user_skill_codes):
    """
    Retain the existing helper interface for compatibility.
    Resolve references into unique skill codes.
    """
    resolved_codes = set()

    for reference in user_skill_codes:
        skill = _resolve_skill(reference)

        if skill:
            code = get_skill_code(skill)

            if code:
                resolved_codes.add(str(code))
                continue

        # Preserve an existing valid legacy skill code.
        if isinstance(reference, str):
            legacy_skill = _resolve_skill(reference)

            if legacy_skill:
                code = get_skill_code(legacy_skill)

                if code:
                    resolved_codes.add(str(code))

    return resolved_codes


# ============================================================
# CALCULATE CAREER MATCH
# ============================================================

def calculate_career_match(career, user_skill_codes):
    """
    Compare unique user skill codes with unique required
    skill codes for a career.
    """
    career_code = get_career_code(career)

    if not career_code:
        return {
            "matchPercentage": 0,
            "knownCount": 0,
            "totalRequired": 0,
            "missingSkills": [],
            "matchedSkills": []
        }

    required_skills = get_skills_for_career(career_code)

    # --------------------------------------------------------
    # BUILD UNIQUE REQUIRED SKILLS
    # --------------------------------------------------------

    required_by_code = {}

    for skill in required_skills:
        code = get_skill_code(skill)

        if code:
            required_by_code[str(code)] = skill

    required_codes = list(required_by_code.keys())

    user_codes = {
        str(code)
        for code in user_skill_codes
    }

    # --------------------------------------------------------
    # COMPARE SKILLS
    # --------------------------------------------------------

    matched_codes = [
        code
        for code in required_codes
        if code in user_codes
    ]

    missing_codes = [
        code
        for code in required_codes
        if code not in user_codes
    ]

    matched_skills = [
        required_by_code[code]
        for code in matched_codes
    ]

    missing_skills = [
        required_by_code[code]
        for code in missing_codes
    ]

    # --------------------------------------------------------
    # CALCULATE MATCH PERCENTAGE
    # --------------------------------------------------------

    known_count = len(matched_codes)
    total_required = len(required_codes)

    percentage = (
        round((known_count / total_required) * 100)
        if total_required
        else 0
    )

    return {
        "matchPercentage": percentage,
        "knownCount": known_count,
        "totalRequired": total_required,
        "matchedSkills": serialize_doc(matched_skills),
        "missingSkills": serialize_doc(missing_skills)
    }

# ============================================================
# LIST CAREERS
# ============================================================

@careers_bp.route(
    "",
    methods=["GET"]
)
@token_required
def list_careers():

    q = (
        request.args.get("q") or ""
    ).strip()

    query = {
        "active": {
            "$ne": False
        }
    }

    if q:

        query["name"] = {
            "$regex": q,
            "$options": "i"
        }

    careers = list(
        get_collection("careers")
        .find(query)
        .sort("name", 1)
    )

    return jsonify({
        "careers": serialize_doc(
            careers
        )
    }), 200


# ============================================================
# GET SINGLE CAREER
# ============================================================

@careers_bp.route(
    "/<career_id>",
    methods=["GET"]
)
@token_required
def get_career(career_id):

    career = None

    # --------------------------------------------------------
    # TRY MONGODB OBJECTID
    # --------------------------------------------------------

    try:

        from bson import ObjectId

        career = get_collection(
            "careers"
        ).find_one({
            "_id": ObjectId(career_id)
        })

    except Exception:
        pass

    # --------------------------------------------------------
    # TRY EXCEL CAREER CODE
    # --------------------------------------------------------

    if career is None:

        career = get_collection(
            "careers"
        ).find_one({
            "$or": [
                {"career_id": career_id},
                {"Career ID": career_id}
            ]
        })

    if career is None:

        return jsonify({
            "error": "Career not found"
        }), 404

    return jsonify(
        serialize_doc(career)
    ), 200


# ============================================================
# SELECT CAREER
# ============================================================

@careers_bp.route(
    "/select",
    methods=["POST"]
)
@token_required
def select_career():

    data = request.get_json() or {}

    career_id = data.get(
        "careerId"
    )

    if not career_id:

        return jsonify({
            "error": "careerId is required"
        }), 400

    from bson import ObjectId

    career = None

    # --------------------------------------------------------
    # FIND BY OBJECTID
    # --------------------------------------------------------

    try:

        career = get_collection(
            "careers"
        ).find_one({
            "_id": ObjectId(career_id)
        })

    except Exception:
        pass

    # --------------------------------------------------------
    # FIND BY CAREER CODE
    # --------------------------------------------------------

    if career is None:

        career = get_collection(
            "careers"
        ).find_one({
            "$or": [
                {"career_id": career_id},
                {"Career ID": career_id}
            ]
        })

    if career is None:

        return jsonify({
            "error": "Career not found"
        }), 404

    # --------------------------------------------------------
    # SAVE ACTIVE CAREER
    # --------------------------------------------------------

    get_collection("users").update_one(
        {
            "_id": g.current_user_id
        },
        {
            "$set": {

                "activeCareerId":
                    career["_id"],

                "activeCareerCode":
                    get_career_code(career),

                "activeCareerName":
                    career.get(
                        "name",
                        career.get(
                            "Career name",
                            ""
                        )
                    ),

                "onboardingStep":
                    "skill-source",

                "updatedAt":
                    datetime.now(timezone.utc)
            }
        }
    )

    update_streak(
        g.current_user_id
    )

    return jsonify({
        "career": serialize_doc(
            career
        )
    }), 200


# ============================================================
# GET ACTIVE CAREER
# ============================================================

@careers_bp.route(
    "/active",
    methods=["GET"]
)
@token_required
def get_active_career():

    user = g.current_user

    career_id = user.get(
        "activeCareerId"
    )

    if not career_id:

        return jsonify({
            "career": None
        }), 200

    career = get_collection(
        "careers"
    ).find_one({
        "_id": career_id
    })

    return jsonify({
        "career": serialize_doc(
            career
        )
    }), 200


# ============================================================
# SWITCH CAREER
# ============================================================

@careers_bp.route(
    "/switch",
    methods=["POST"]
)
@token_required
def switch_career():

    data = request.get_json() or {}

    career_id = data.get(
        "careerId"
    )

    if not career_id:

        return jsonify({
            "error": "careerId is required"
        }), 400

    from bson import ObjectId

    career = None

    # --------------------------------------------------------
    # FIND CAREER BY OBJECTID
    # --------------------------------------------------------

    try:

        career = get_collection(
            "careers"
        ).find_one({
            "_id": ObjectId(career_id)
        })

    except Exception:
        pass

    # --------------------------------------------------------
    # FIND CAREER BY EXCEL CODE
    # --------------------------------------------------------

    if career is None:

        career = get_collection(
            "careers"
        ).find_one({
            "$or": [
                {"career_id": career_id},
                {"Career ID": career_id}
            ]
        })

    if career is None:

        return jsonify({
            "error": "Career not found"
        }), 404

    # --------------------------------------------------------
    # CHECK EXISTING RESUME
    #
    # IMPORTANT:
    # Switching career DOES NOT delete or replace the resume.
    # The latest extracted resume remains available.
    # --------------------------------------------------------

    existing_resume = get_collection(
        "resumes"
    ).find_one(
        {
            "userId": g.current_user_id,
            "status": "extracted"
        },
        sort=[("createdAt", -1)]
    )

    has_existing_resume = (
        existing_resume is not None
    )

    # --------------------------------------------------------
    # CHECK EXISTING USER SKILLS
    # --------------------------------------------------------

    user_skills_doc = get_collection(
        "user_skills"
    ).find_one({
        "userId": g.current_user_id
    })

    has_manual_skills = (
        user_skills_doc is not None
        and len(
            user_skills_doc.get(
                "skills",
                []
            )
        ) > 0
    )

    # --------------------------------------------------------
    # UPDATE ACTIVE CAREER ONLY
    # --------------------------------------------------------

    get_collection(
        "users"
    ).update_one(
        {
            "_id": g.current_user_id
        },
        {
            "$set": {

                "activeCareerId":
                    career["_id"],

                "activeCareerCode":
                    get_career_code(career),

                "activeCareerName":
                    career.get(
                        "name",
                        career.get(
                            "Career name",
                            ""
                        )
                    ),

                "updatedAt":
                    datetime.now(timezone.utc)
            }
        }
    )

    update_streak(
        g.current_user_id
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "career":
            serialize_doc(career),

        "hasExistingResume":
            has_existing_resume,

        "hasManualSkills":
            has_manual_skills,

        "reuseExistingSkills":
            has_existing_resume or has_manual_skills,

        "message":
            (
                "Career switched successfully. "
                "Your existing resume and extracted skills "
                "will be reused for the new career."
                if has_existing_resume
                else
                "Career switched successfully. "
                "No existing resume was found."
            )

    }), 200


# ============================================================
# CAREER RECOMMENDATIONS
# ============================================================

@careers_bp.route(
    "/recommended",
    methods=["GET"]
)
@token_required
def get_recommended():

    # --------------------------------------------------------
    # GET USER SKILLS
    # --------------------------------------------------------

    user_skill_codes = get_user_skill_codes()

    # --------------------------------------------------------
    # CONVERT RESUME OBJECTIDS TO SKILL CODES
    # --------------------------------------------------------

    user_skill_codes = (
        convert_objectids_to_skill_codes(
            user_skill_codes
        )
    )

    # --------------------------------------------------------
    # GET ALL ACTIVE CAREERS
    # --------------------------------------------------------

    careers = list(
        get_collection("careers")
        .find({
            "active": {
                "$ne": False
            }
        })
    )

    recommendations = []

    # --------------------------------------------------------
    # CALCULATE MATCH FOR EVERY CAREER
    # --------------------------------------------------------

    for career in careers:

        result = calculate_career_match(
            career,
            user_skill_codes
        )

        career_name = career.get(
            "name",
            career.get(
                "Career name",
                ""
            )
        )

        recommendations.append({

            "_id": str(
                career["_id"]
            ),

            "careerId":
                get_career_code(
                    career
                ),

            "name":
                career_name,

            "description":
                career.get(
                    "description",
                    career.get(
                        "Career description",
                        ""
                    )
                ),

            "matchPercentage":
                result[
                    "matchPercentage"
                ],

            "knownCount":
                result[
                    "knownCount"
                ],

            "totalRequired":
                result[
                    "totalRequired"
                ],

            "matchedSkills":
                result[
                    "matchedSkills"
                ],

            "missingSkills":
                result[
                    "missingSkills"
                ]
        })

    # --------------------------------------------------------
    # SORT HIGHEST MATCH FIRST
    # --------------------------------------------------------

    recommendations.sort(
        key=lambda x:
            x["matchPercentage"],
        reverse=True
    )

    # --------------------------------------------------------
    # ACTIVE CAREER MATCH
    # --------------------------------------------------------

    active_career = None

    active_career_id = (
        g.current_user.get(
            "activeCareerId"
        )
    )

    if active_career_id:

        active_career = (
            get_collection(
                "careers"
            ).find_one({
                "_id": active_career_id
            })
        )

    current_match = None

    if active_career:

        active_code = get_career_code(
            active_career
        )

        for item in recommendations:

            if item["careerId"] == active_code:

                current_match = item

                break

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "userSkillCount":
            len(user_skill_codes),

        "currentMatch":
            current_match,

        "recommendations":
            recommendations[:5]

    }), 200