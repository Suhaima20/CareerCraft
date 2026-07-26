from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from routes.auth import auth_bp
from routes.resume import resume_bp
from routes.career import career_bp
from routes.user import user_bp

app = Flask(__name__)
CORS(app)

# JWT Configuration
app.config["JWT_SECRET_KEY"] = "careercraft-secret-key"
jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(resume_bp, url_prefix="/resume")
app.register_blueprint(career_bp, url_prefix="/career")
app.register_blueprint(user_bp, url_prefix="/user")

@app.route("/")
def home():
    return {
        "message": "CareerCraft Backend Running"
    }

if __name__ == "__main__":
    app.run(debug=True)