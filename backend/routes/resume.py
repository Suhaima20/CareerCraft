import os
import uuid
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from models.user import User

from services.pdf_extractor import extract_text_from_pdf
from services.text_cleaner import clean_text
from services.skill_extractor import extract_skills
from services.career_recommendation import recommend_careers

from database.db import resumes_collection

resume_bp = Blueprint("resume", __name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


@resume_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_resume():

    user_email = get_jwt_identity()

    # -----------------------------
    # 1. Validate Upload
    # -----------------------------
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are allowed"}), 400

    # -----------------------------
    # 2. Save File
    # -----------------------------
    unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)

    file.save(filepath)

    # -----------------------------
    # 3. Extract PDF Text
    # -----------------------------
    raw_text = extract_text_from_pdf(filepath)

    if raw_text == "ERROR_READING_PDF":
        return jsonify({
            "error": "Unable to read PDF. The file may be corrupted."
        }), 400

    if raw_text == "ERROR_ENCRYPTED_PDF":
        return jsonify({
            "error": "Password-protected PDFs are not supported."
        }), 400

    if raw_text == "ERROR_EMPTY_PDF":
        return jsonify({
            "error": "No readable text found in the PDF."
        }), 400

    if raw_text == "ERROR_UNKNOWN":
        return jsonify({
            "error": "Unexpected error while processing PDF."
        }), 500

    # -----------------------------
    # 4. Clean Text
    # -----------------------------
    cleaned_text = clean_text(raw_text)

    # -----------------------------
    # 5. Extract Skills
    # -----------------------------
    skills = extract_skills(cleaned_text)

    # -----------------------------
    # 6. Save Resume
    # -----------------------------
    resume_data = {
        "userEmail": user_email,
        "filename": unique_filename,
        "originalFilename": file.filename,
        "rawText": raw_text,
        "cleanedText": cleaned_text,
        "skills": skills
    }

    resumes_collection.insert_one(resume_data)

    # -----------------------------
    # 7. Update User Profile
    # -----------------------------
    user = User.find_by_email(user_email)

    if user:
        user_id = str(user["_id"])

        User.update_input_method(user_id, "resume")

        User.update_skills(user_id, skills)

        User.update_resume(
            user_id,
            {
                "fileName": unique_filename,
                "fileUrl": filepath,
                "uploadedAt": datetime.utcnow()
            }
        )

    # -----------------------------
    # 8. Career Recommendation
    # -----------------------------
    recommendation = recommend_careers(skills)

    best_career = recommendation.get("recommended_career")

    if best_career is None:
        return jsonify({
            "error": "No careers found in database."
        }), 500

    # -----------------------------
    # 9. Skill Gap
    # -----------------------------
    gap_result = {
        "matched_skills": best_career["matched_skills"],
        "missing_skills": best_career["missing_skills"],
        "match_score": best_career["match_score"]
    }

    # -----------------------------
    # 10. Response
    # -----------------------------
    return jsonify({
        "message": "Resume processed successfully",
        "skills": skills,
        "recommended_career": best_career,
        "career_ranking": recommendation["career_ranking"],
        "skill_gap": gap_result
    }), 200