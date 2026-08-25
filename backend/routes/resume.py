import os

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone

from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc
from config import Config

from nlp.skill_extractor import (
    extract_text_from_pdf,
    extract_skills_from_text
)


resume_bp = Blueprint(
    "resume",
    __name__,
    url_prefix="/resume"
)


# ============================================================
# HELPER: GET ALL ACTIVE SKILLS
# ============================================================

def get_all_active_skills():
    """
    Get every active skill from the database.

    IMPORTANT:
    Resume extraction must NOT depend on the currently
    selected career.

    The resume belongs to the USER, not to a career.

    This allows the same stored resume to be used when
    the user switches between careers.
    """

    return list(
        get_collection("skills").find({
            "active": {
                "$ne": False
            }
        })
    )


# ============================================================
# UPLOAD RESUME
# ============================================================

@resume_bp.route("/upload", methods=["POST"])
@token_required
def upload_resume():

    # --------------------------------------------------------
    # 1. Validate uploaded file
    # --------------------------------------------------------

    if "file" not in request.files:
        return jsonify({
            "error": "No file provided"
        }), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({
            "error": "No file selected"
        }), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({
            "error": "Only PDF files are supported"
        }), 400


    # --------------------------------------------------------
    # 2. Get current user
    # --------------------------------------------------------

    user = g.current_user

    active_career_id = user.get(
        "activeCareerId"
    )


    # --------------------------------------------------------
    # Career is useful for metadata, but it must NOT control
    # which skills are extracted from the resume.
    # --------------------------------------------------------

    career = None

    if active_career_id:

        career = get_collection(
            "careers"
        ).find_one({
            "_id": active_career_id
        })


    career_code = None
    career_name = None

    if career:

        career_code = (
            career.get("career_id")
            or career.get("Career ID")
        )

        career_name = (
            career.get("name")
            or career.get("Career name")
            or ""
        )


    # --------------------------------------------------------
    # 3. Get ALL active skills
    # --------------------------------------------------------

    all_skills = get_all_active_skills()

    if not all_skills:

        return jsonify({
            "error": "No active skills found in database"
        }), 404


    # --------------------------------------------------------
    # 4. Save uploaded PDF
    # --------------------------------------------------------

    upload_dir = Config.UPLOAD_FOLDER

    os.makedirs(
        upload_dir,
        exist_ok=True
    )

    timestamp = datetime.now(
        timezone.utc
    ).strftime("%Y%m%d%H%M%S")

    safe_name = file.filename.replace(
        " ",
        "_"
    )

    file_path = os.path.join(
        upload_dir,
        f"{g.current_user_id}_{timestamp}_{safe_name}"
    )

    try:

        file.save(file_path)

    except Exception as e:

        return jsonify({
            "error": "Failed to save resume",
            "details": str(e)
        }), 500


    # --------------------------------------------------------
    # 5. Extract PDF text
    # --------------------------------------------------------

    try:

        text = extract_text_from_pdf(
            file_path
        )

    except Exception as e:

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "error": "Failed to extract text from PDF",
            "details": str(e)
        }), 500


    # --------------------------------------------------------
    # 6. Extract skills from ENTIRE skill database
    #
    # IMPORTANT:
    #
    # DO NOT filter skills by career here.
    #
    # Example:
    #
    # Resume contains:
    # Python
    # SQL
    # Excel
    # Power BI
    # Machine Learning
    # AWS
    #
    # We store all recognized skills.
    #
    # Later:
    #
    # Data Scientist -> compare stored skills
    # Data Engineer  -> compare stored skills
    # Data Analyst   -> compare stored skills
    #
    # No new resume upload required.
    # --------------------------------------------------------

    try:

        extracted_skill_ids = extract_skills_from_text(
            text,
            all_skills
        )

    except Exception as e:

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "error": "Failed to extract skills from resume",
            "details": str(e)
        }), 500


    # --------------------------------------------------------
    # 7. Convert extracted IDs to skill documents
    # --------------------------------------------------------

    extracted_skill_id_set = set(
        str(skill_id)
        for skill_id in extracted_skill_ids
    )

    extracted_skill_objs = []

    for skill in all_skills:

        if str(skill["_id"]) in extracted_skill_id_set:

            extracted_skill_objs.append(
                skill
            )


    # --------------------------------------------------------
    # 8. Mark previous resumes as archived
    #
    # The old resume is NOT deleted.
    #
    # This gives us resume history.
    #
    # Only the newest "extracted" resume is considered
    # the active resume.
    # --------------------------------------------------------

    get_collection(
        "resumes"
    ).update_many(
        {
            "userId": g.current_user_id,
            "status": "extracted"
        },
        {
            "$set": {
                "status": "archived",
                "updatedAt": datetime.now(
                    timezone.utc
                )
            }
        }
    )


    # --------------------------------------------------------
    # 9. Save new resume document
    # --------------------------------------------------------

    now = datetime.now(
        timezone.utc
    )

    resume_doc = {

        # Owner
        "userId":
            g.current_user_id,

        # Career at the time of upload.
        #
        # This is ONLY metadata.
        #
        # It does NOT restrict the resume to this career.
        "careerId":
            career["_id"] if career else None,

        "careerCode":
            career_code,

        "careerName":
            career_name,

        # File information
        "fileName":
            file.filename,

        "filePath":
            file_path,

        # Store extracted text
        #
        # Keeping the text allows future re-processing
        # if the skill database changes.
        "extractedText":
            text[:5000],

        # ALL recognized skills
        "extractedSkillIds": [
            skill["_id"]
            for skill in extracted_skill_objs
        ],

        # Status
        "status":
            "extracted",

        # Timestamps
        "createdAt":
            now,

        "updatedAt":
            now
    }


    result = get_collection(
        "resumes"
    ).insert_one(
        resume_doc
    )

    resume_doc["_id"] = result.inserted_id


    # --------------------------------------------------------
    # 10. Return response
    # --------------------------------------------------------

    return jsonify({

        "message":
            "Resume uploaded and skills extracted successfully",

        "career":
            serialize_doc(career)
            if career
            else None,

        "resume":
            serialize_doc(resume_doc),

        "extractedSkills":
            serialize_doc(
                extracted_skill_objs
            ),

        "extractedSkillCount":
            len(
                extracted_skill_objs
            )

    }), 200


# ============================================================
# GET LATEST EXTRACTED RESUME
# ============================================================

@resume_bp.route(
    "/extracted",
    methods=["GET"]
)
@token_required
def get_extracted():

    resume = get_collection(
        "resumes"
    ).find_one(
        {
            "userId":
                g.current_user_id,

            "status":
                "extracted"
        },
        sort=[
            ("createdAt", -1)
        ]
    )


    if resume is None:

        return jsonify({
            "resume": None,
            "skills": []
        }), 200


    # --------------------------------------------------------
    # Get skills stored inside resume
    # --------------------------------------------------------

    skill_ids = resume.get(
        "extractedSkillIds",
        []
    )


    skills = []

    if skill_ids:

        skills = list(
            get_collection(
                "skills"
            ).find({
                "_id": {
                    "$in": skill_ids
                }
            })
        )


    return jsonify({

        "resume":
            serialize_doc(
                resume
            ),

        "skills":
            serialize_doc(
                skills
            )

    }), 200


# ============================================================
# GET ALL USER RESUMES
# ============================================================

@resume_bp.route(
    "/mine",
    methods=["GET"]
)
@token_required
def list_mine():

    resumes = list(
        get_collection(
            "resumes"
        )
        .find({
            "userId":
                g.current_user_id
        })
        .sort(
            "createdAt",
            -1
        )
    )


    return jsonify({

        "resumes":
            serialize_doc(
                resumes
            )

    }), 200