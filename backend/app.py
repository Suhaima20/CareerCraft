from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from flask_jwt_extended import JWTManager
from routes.resume import resume_bp

app = Flask(__name__)
CORS(app)

app.config["JWT_SECRET_KEY"] = "careercraft-secret-key"
jwt = JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(resume_bp, url_prefix="/resume")

@app.route("/")
def home():
    return {"message": "CareerCraft Backend Running"}

if __name__ == "__main__":
    app.run(debug=True)



