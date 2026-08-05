from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from config.config import Config

try:
    # Create MongoDB client
    client = MongoClient(Config.MONGO_URI)

    # Verify connection
    client.admin.command("ping")
    print("✅ Connected to MongoDB successfully.")

    # Select database
    db = client[Config.DATABASE_NAME]

except ConnectionFailure as e:
    print(f"❌ MongoDB Connection Failed: {e}")
    raise


# ==========================
# User Related Collections
# ==========================

users_collection = db["users"]

profiles_collection = db["profiles"]

resumes_collection = db["resumes"]

resume_analysis_collection = db["resume_analysis"]


# ==========================
# Career Roadmap Collections
# ==========================

careers_collection = db["careers"]

skills_collection = db["skills"]

chapters_collection = db["chapters"]

career_skill_collection = db["career_skill_mapping"]

skill_chapter_collection = db["skill_chapter_mapping"]


# ==========================
# Learning Progress
# ==========================

roadmap_progress_collection = db["roadmap_progress"]


# ==========================
# Jobs
# ==========================

jobs_collection = db["jobs"]

saved_jobs_collection = db["saved_jobs"]


# ==========================
# Admin
# ==========================

admin_logs_collection = db["admin_logs"]