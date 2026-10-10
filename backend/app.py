import os
import sys

# ============================================================
# PYTHON PATH
# ============================================================

sys.path.insert(
    0,
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)
app.config.from_object(Config)


# ============================================================
# CORS
# ============================================================

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

configured_frontend = getattr(
    Config,
    "FRONTEND_URL",
    None
)

if configured_frontend:

    configured_frontend = (
        configured_frontend.rstrip("/")
    )

    if configured_frontend not in ALLOWED_ORIGINS:

        ALLOWED_ORIGINS.append(
            configured_frontend
        )


CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ALLOWED_ORIGINS
        }
    },
    supports_credentials=True,
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
    ],
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
)


# ============================================================
# GLOBAL OPTIONS
# ============================================================

@app.before_request
def handle_preflight():

    if (
        request.method == "OPTIONS"
        and request.path.startswith("/api/")
    ):

        return "", 204


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

os.makedirs(
    Config.UPLOAD_FOLDER,
    exist_ok=True
)


# ============================================================
# BLUEPRINT IMPORTS
# ============================================================

from routes.auth import auth_bp
from routes.users import users_bp
from routes.careers import careers_bp
from routes.skills import skills_bp
from routes.resume import resume_bp
from routes.analysis import analysis_bp
from routes.roadmap import roadmap_bp
from routes.quiz import quiz_bp
from routes.achievements import achievements_bp
from routes.notifications import notifications_bp
from routes.jobs import jobs_bp
from routes.market import market_bp
from routes.resume_builder import resume_builder_bp
from routes.feedback import feedback_bp


# ============================================================
# STUDY REMINDERS
# ============================================================
# Study Reminder view functions are registered directly
# because the project's current setup uses direct Flask
# route registration for these endpoints.
# ============================================================

from routes.study_reminders import (
    create_study_reminder,
    list_study_reminders,
    get_study_reminder,
    update_study_reminder,
    delete_study_reminder,
    toggle_study_reminder,
    snooze_study_reminder,
)


# ============================================================
# STUDY REMINDER SCHEDULER
# ============================================================

from services.reminder_scheduler import (
    start_reminder_scheduler
)


# ============================================================
# ADMIN
# ============================================================

from routes.admin import admin_bp


# ============================================================
# NORMAL BLUEPRINT REGISTRATIONS
# ============================================================

app.register_blueprint(
    auth_bp,
    url_prefix="/api/auth"
)

app.register_blueprint(
    users_bp,
    url_prefix="/api/users"
)

app.register_blueprint(
    careers_bp,
    url_prefix="/api/careers"
)

app.register_blueprint(
    skills_bp,
    url_prefix="/api/skills"
)

app.register_blueprint(
    resume_bp,
    url_prefix="/api/resume"
)

app.register_blueprint(
    analysis_bp,
    url_prefix="/api/analysis"
)

app.register_blueprint(
    roadmap_bp,
    url_prefix="/api/roadmap"
)

app.register_blueprint(
    quiz_bp,
    url_prefix="/api/quiz"
)

app.register_blueprint(
    achievements_bp,
    url_prefix="/api/achievements"
)

app.register_blueprint(
    notifications_bp,
    url_prefix="/api/notifications"
)

app.register_blueprint(
    jobs_bp,
    url_prefix="/api/jobs"
)

app.register_blueprint(
    market_bp,
    url_prefix="/api/market"
)


# ============================================================
# RESUME BUILDER
# ============================================================
#
# IMPORTANT:
#
# resume_builder.py already has:
#
# Blueprint(
#     "resume_builder",
#     __name__,
#     url_prefix="/resume-builder"
# )
#
# The registration prefix below intentionally includes
# /api/resume-builder so the final routes become:
#
# /api/resume-builder/generate
# /api/resume-builder/save
# /api/resume-builder/load
#
# Do NOT change this back to /api.
# ============================================================

app.register_blueprint(
    resume_builder_bp,
    url_prefix="/api/resume-builder"
)


# ============================================================
# FEEDBACK
# ============================================================

app.register_blueprint(
    feedback_bp,
    url_prefix="/api"
)


# ============================================================
# STUDY REMINDERS — DIRECT FLASK ROUTE REGISTRATION
# ============================================================

print()
print("============================================================")
print("DIRECT FLASK ROUTE REGISTRATION")
print("============================================================")


# ------------------------------------------------------------
# CREATE
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders",
    endpoint="study_reminders_create",
    view_func=create_study_reminder,
    methods=["POST"],
)


# ------------------------------------------------------------
# LIST
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders",
    endpoint="study_reminders_list",
    view_func=list_study_reminders,
    methods=["GET"],
)


# ------------------------------------------------------------
# GET SINGLE REMINDER
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders/<reminder_id>",
    endpoint="study_reminders_get",
    view_func=get_study_reminder,
    methods=["GET"],
)


# ------------------------------------------------------------
# UPDATE
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders/<reminder_id>",
    endpoint="study_reminders_update",
    view_func=update_study_reminder,
    methods=["PUT"],
)


# ------------------------------------------------------------
# SNOOZE
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders/<reminder_id>/snooze",
    endpoint="study_reminders_snooze",
    view_func=snooze_study_reminder,
    methods=["PUT"],
)


# ------------------------------------------------------------
# DELETE
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders/<reminder_id>",
    endpoint="study_reminders_delete",
    view_func=delete_study_reminder,
    methods=["DELETE"],
)


# ------------------------------------------------------------
# ENABLE / DISABLE
# ------------------------------------------------------------

app.add_url_rule(
    "/api/study-reminders/<reminder_id>/toggle",
    endpoint="study_reminders_toggle",
    view_func=toggle_study_reminder,
    methods=["PUT"],
)


# ============================================================
# VERIFY STUDY REMINDER ROUTES
# ============================================================

print()
print("Study Reminder routes registered:")

for rule in app.url_map.iter_rules():

    if "study-reminders" in str(rule):

        print(
            f"{rule} -> "
            f"{rule.endpoint} | "
            f"METHODS: {sorted(rule.methods)}"
        )

print()
print("============================================================")
print()


# ============================================================
# ADMIN BLUEPRINT
# ============================================================

app.register_blueprint(
    admin_bp,
    url_prefix="/api/admin"
)


# ============================================================
# 404
# ============================================================

@app.errorhandler(404)
def not_found(e):

    return jsonify({
        "error": "Endpoint not found"
    }), 404


# ============================================================
# 500
# ============================================================

@app.errorhandler(500)
def server_error(e):

    return jsonify({
        "error": "Internal server error"
    }), 500


# ============================================================
# HEALTH
# ============================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({
        "status": "ok"
    }), 200


# ============================================================
# START STUDY REMINDER SCHEDULER
# ============================================================

start_reminder_scheduler()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            "5000"
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=(
            Config.FLASK_ENV
            == "development"
        )
    )