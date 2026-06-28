import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from services.pdf_extractor import extract_text_from_pdf
from services.text_cleaner import clean_text
from services.skill_extractor import extract_skills
from services.skill_gap import compare_skills
from services.career_recommendation import recommend_careers

from database.db import resumes_collection, careers_collection

resume_bp = Blueprint("resume", __name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@resume_bp.route("/upload", methods=["POST"])
def upload_resume():

    # 1. Check file
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are allowed"}), 400

    # 2. Save file
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    file.save(filepath)

    # 3. Extract text from PDF
    raw_text = extract_text_from_pdf(filepath)

    if raw_text == "ERROR_READING_PDF":
        return jsonify({
            "error": "Unable to read PDF. File may be corrupted or unsupported."
        }), 400

    # 4. Clean text
    cleaned_text = clean_text(raw_text)

    # 5. Extract skills using NLP
    skills = extract_skills(cleaned_text)

    # 6. Store resume data in MongoDB
    resume_data = {
        "filename": filename,
        "skills": skills
    }

    resumes_collection.insert_one(resume_data)
    # 7. Recommend careers (Sprint 5)
    recommendation = recommend_careers(skills)

    best_career = recommendation["recommended_career"]

    if best_career is None:
        return jsonify({
         "error": "No careers found in database"
         }), 500

    # 8. Skill gap analysis for the best career
    gap_result = {
        "matched_skills": best_career["matched_skills"],
        "missing_skills": best_career["missing_skills"],
        "match_score": best_career["match_score"]
    }

    print("Extracted Skills:", skills)
    print("Best Career:", best_career["career"])
    print("Match Score:", best_career["match_score"])

    # 9. Response
    return jsonify({
        "message": "Resume processed successfully",
        "filename": filename,
        "skills": skills,
        "recommended_career": best_career,
        "career_ranking": recommendation["career_ranking"],
        "skill_gap": gap_result
}), 200