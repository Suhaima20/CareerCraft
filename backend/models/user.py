from database.db import users_collection
from bson import ObjectId
from datetime import datetime


class User:

    @staticmethod
    def create_user(user_data):
        return users_collection.insert_one(user_data)

    @staticmethod
    def find_by_email(email):
        return users_collection.find_one({"email": email})

    @staticmethod
    def find_by_id(user_id):
        return users_collection.find_one({"_id": ObjectId(user_id)})

    @staticmethod
    def update_target_career(user_id, career):
        return users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "targetCareer": career,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def update_active_career(user_id, career):
        return users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "activeCareer": career,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def update_input_method(user_id, method):
        return users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "inputMethod": method,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def update_skills(user_id, skills):
        return users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "skills": skills,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def update_resume(user_id, resume_data):
        return users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "resume": resume_data,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def update_roadmap_progress(user_id, progress):
        return users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "roadmapProgress": progress,
                    "updatedAt": datetime.utcnow()
                }
            }
        )