from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER
from flask import Blueprint, request, jsonify, g, send_file
from datetime import datetime, timezone
from db import get_collection
from utils.auth import token_required, decode_token
from utils.serialization import serialize_doc

resume_builder_bp = Blueprint("resume_builder", __name__, url_prefix="/resume-builder")

PRIMARY_COLOR = HexColor("#403D88")


def generate_pdf(resume_data):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5 * inch, bottomMargin=0.5 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    elements = []

    name_style = ParagraphStyle("Name", parent=styles["Normal"], fontSize=18, textColor=PRIMARY_COLOR, alignment=TA_CENTER, spaceAfter=4)
    contact_style = ParagraphStyle("Contact", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER, spaceAfter=12)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=12, textColor=PRIMARY_COLOR, spaceBefore=10, spaceAfter=4)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, spaceAfter=2)
    bullet_style = ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=10, leftIndent=12, spaceAfter=2)

    pd = resume_data.get("personalDetails", {})
    if pd.get("name"):
        elements.append(Paragraph(pd["name"], name_style))
    contact_parts = [pd.get(k, "") for k in ["email", "phone", "address", "linkedin", "github"] if pd.get(k)]
    if contact_parts:
        elements.append(Paragraph(" | ".join(contact_parts), contact_style))

    if resume_data.get("summary"):
        elements.append(Paragraph("Professional Summary", section_style))
        elements.append(Paragraph(resume_data["summary"], body_style))
        elements.append(Spacer(1, 6))

    education = resume_data.get("education", [])
    if education:
        elements.append(Paragraph("Education", section_style))
        for edu in education:
            line = f"<b>{edu.get('degree', '')}</b>, {edu.get('school', '')}"
            if edu.get("year"):
                line += f" ({edu['year']})"
            elements.append(Paragraph(line, body_style))
        elements.append(Spacer(1, 6))

    experience = resume_data.get("experience", [])
    if experience:
        elements.append(Paragraph("Experience", section_style))
        for exp in experience:
            line = f"<b>{exp.get('role', '')}</b> at {exp.get('company', '')}"
            if exp.get("duration"):
                line += f" | {exp['duration']}"
            elements.append(Paragraph(line, body_style))
            if exp.get("description"):
                elements.append(Paragraph(exp["description"], bullet_style))
        elements.append(Spacer(1, 6))

    projects = resume_data.get("projects", [])
    if projects:
        elements.append(Paragraph("Projects", section_style))
        for proj in projects:
            line = f"<b>{proj.get('title', '')}</b>"
            elements.append(Paragraph(line, body_style))
            if proj.get("description"):
                elements.append(Paragraph(proj["description"], bullet_style))
            if proj.get("link"):
                elements.append(Paragraph(f"Link: {proj['link']}", bullet_style))
        elements.append(Spacer(1, 6))

    certifications = resume_data.get("certifications", [])
    if certifications:
        elements.append(Paragraph("Certifications", section_style))
        for cert in certifications:
            line = f"<b>{cert.get('name', '')}</b>, {cert.get('issuer', '')}"
            if cert.get("year"):
                line += f" ({cert['year']})"
            elements.append(Paragraph(line, body_style))
        elements.append(Spacer(1, 6))

    achievements_list = resume_data.get("achievements", [])
    if achievements_list:
        valid = [a for a in achievements_list if a and a.strip()]
        if valid:
            elements.append(Paragraph("Achievements", section_style))
            for ach in valid:
                elements.append(Paragraph(f"• {ach}", bullet_style))
        elements.append(Spacer(1, 6))

    skills = resume_data.get("skills", [])
    if skills:
        elements.append(Paragraph("Skills", section_style))
        elements.append(Paragraph(", ".join(skills), body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def _get_user_from_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if payload is None:
        return None
    from utils.serialization import to_objectid
    user = get_collection("users").find_one({"_id": to_objectid(payload["user_id"])})
    return user


@resume_builder_bp.route("/generate", methods=["POST"])
def generate_resume():
    data = request.get_json() or {}
    user = _get_user_from_token()

    if user:
        try:
            pdf_buffer = generate_pdf(data)
            return send_file(pdf_buffer, mimetype="application/pdf", as_attachment=True, download_name=f"{data.get('personalDetails', {}).get('name', 'resume')}-ATS-Resume.pdf")
        except Exception:
            return jsonify({"error": "Failed to generate PDF"}), 500
    else:
        try:
            pdf_buffer = generate_pdf(data)
            return send_file(pdf_buffer, mimetype="application/pdf", as_attachment=True, download_name=f"{data.get('personalDetails', {}).get('name', 'resume')}-ATS-Resume.pdf")
        except Exception:
            return jsonify({"error": "Failed to generate PDF"}), 500


@resume_builder_bp.route("/save", methods=["POST"])
@token_required
def save_resume():
    data = request.get_json() or {}
    now = datetime.now(timezone.utc)
    resumes = get_collection("resume_builder")
    existing = resumes.find_one({"userId": g.current_user_id})
    if existing:
        resumes.update_one({"_id": existing["_id"]}, {"$set": {"resume": data, "updatedAt": now}})
    else:
        resumes.insert_one({"userId": g.current_user_id, "resume": data, "createdAt": now, "updatedAt": now})
    return jsonify({"saved": True}), 200


@resume_builder_bp.route("/load", methods=["GET"])
@token_required
def load_resume():
    doc = get_collection("resume_builder").find_one({"userId": g.current_user_id})
    if doc is None:
        return jsonify({"resume": None}), 200
    return jsonify({"resume": serialize_doc(doc.get("resume"))}), 200
