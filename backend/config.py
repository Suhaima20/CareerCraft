import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/careercraft")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    POWERBI_EMBED_URL = os.environ.get("POWERBI_EMBED_URL", "")
    POWERBI_REPORT_ID = os.environ.get("POWERBI_REPORT_ID", "")
    POWERBI_WORKSPACE_ID = os.environ.get("POWERBI_WORKSPACE_ID", "")
    JOB_DATA_PROVIDER_URL = os.environ.get("JOB_DATA_PROVIDER_URL", "")
    JOB_DATA_PROVIDER_KEY = os.environ.get("JOB_DATA_PROVIDER_KEY", "")
    JOB_DATA_PROVIDER_ID = os.environ.get("JOB_DATA_PROVIDER_ID", "")
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
