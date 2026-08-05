from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.config import Config
from middleware.error_handler import register_error_handlers

# Existing Blueprints
from routes.auth import auth_bp
from routes.resume import resume_bp
from routes.career import career_bp
from routes.user import user_bp
from routes.roadmap import roadmap_bp
from routes.progress import progress_bp


app = Flask(__name__)

# ==========================
# Application Configuration
# ==========================

app.config["SECRET_KEY"] = Config.SECRET_KEY
app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

# ==========================
# Enable CORS
# ==========================

CORS(app)

# ==========================
# JWT
# ==========================

jwt = JWTManager(app)

# ==========================
# Global Error Handlers
# ==========================

register_error_handlers(app)

# ==========================
# Register Blueprints
# ==========================

# Authentication
app.register_blueprint(auth_bp)

# Resume Upload
app.register_blueprint(
    resume_bp,
    url_prefix="/resume"
)

# Career
app.register_blueprint(
    career_bp,
    url_prefix="/career"
)

# User
app.register_blueprint(
    user_bp,
    url_prefix="/user"
)

# Roadmap
app.register_blueprint(
    roadmap_bp,
    url_prefix="/roadmap"
)

# Progress
app.register_blueprint(
    progress_bp,
    url_prefix="/progress"
)

# ==========================
# Home Route
# ==========================

@app.route("/")
def home():
    return {
        "success": True,
        "message": "CareerCraft Backend Running",
        "version": "1.0.0"
    }

# ==========================
# Run Application
# ==========================

if __name__ == "__main__":
    app.run(debug=(Config.FLASK_ENV == "development"))