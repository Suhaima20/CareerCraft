import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, resources={r"/api/*": {"origins": [Config.FRONTEND_URL, "*"]}}, supports_credentials=True)

os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

from routes.auth import auth_bp
from routes.users import users_bp
from routes.careers import careers_bp
from routes.skills import skills_bp
from routes.resume import resume_bp
from routes.analysis import analysis_bp
from routes.roadmap import roadmap_bp
from routes.achievements import achievements_bp
from routes.notifications import notifications_bp
from routes.jobs import jobs_bp
from routes.market import market_bp
from routes.resume_builder import resume_builder_bp
from routes.feedback import feedback_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(careers_bp, url_prefix="/api/careers")
app.register_blueprint(skills_bp, url_prefix="/api/skills")
app.register_blueprint(resume_bp, url_prefix="/api/resume")
app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
app.register_blueprint(roadmap_bp, url_prefix="/api/roadmap")
app.register_blueprint(achievements_bp, url_prefix="/api/achievements")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
app.register_blueprint(market_bp, url_prefix="/api/market")
app.register_blueprint(resume_builder_bp, url_prefix="/api")
app.register_blueprint(feedback_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=(Config.FLASK_ENV == "development"))
