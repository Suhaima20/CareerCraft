import os
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv()


class Config:
    """
    Centralized application configuration.
    All configuration values should be accessed through this class.
    """

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI")
    DATABASE_NAME = os.getenv("DATABASE_NAME")

    # Uploads
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")

    # 16 MB upload limit
    MAX_CONTENT_LENGTH = int(
        os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024)
    )