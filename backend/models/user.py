from database.db import users_collection
from bson import ObjectId
from datetime import datetime


class User:

    # Create new user
    @staticmethod
    def create_user(user_data):
        user_data["createdAt"] = datetime.utcnow()
        user_data["updatedAt"] = datetime.utcnow()

        return users_collection.insert_one(user_data)


    # Find user using email
    @staticmethod
    def find_by_email(email):
        return users_collection.find_one({
            "email": email
        })


    # Find user using ID
    @staticmethod
    def find_by_id(user_id):
        return users_collection.find_one({
            "_id": ObjectId(user_id)
        })


    # Update basic profile information
    @staticmethod
    def update_profile(user_id, profile_data):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    **profile_data,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store selected target career
    @staticmethod
    def update_target_career(user_id, career):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "targetCareer": career,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store active career after recommendation/switch decision
    @staticmethod
    def update_active_career(user_id, career):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "activeCareer": career,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store profile creation method
    # resume OR manual
    @staticmethod
    def update_input_method(user_id, method):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "inputMethod": method,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store extracted/manual skills
    @staticmethod
    def update_skills(user_id, skills):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "skills": skills,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store resume information
    @staticmethod
    def update_resume(user_id, resume_data):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "resume": resume_data,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store career match score and skill gap analysis
    @staticmethod
    def update_skill_analysis(user_id, analysis_data):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "skillAnalysis": analysis_data,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store alternative career suggestions
    @staticmethod
    def update_career_suggestions(user_id, suggestions):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "careerSuggestions": suggestions,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Store personalized roadmap
    @staticmethod
    def update_learning_roadmap(user_id, roadmap):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "learningRoadmap": roadmap,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Track roadmap completion progress
    @staticmethod
    def update_roadmap_progress(user_id, progress):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "roadmapProgress": progress,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Update learning schedule
    @staticmethod
    def update_learning_schedule(user_id, schedule):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "learningSchedule": schedule,
                    "updatedAt": datetime.utcnow()
                }
            }
        )


    # Dashboard data update
    @staticmethod
    def update_dashboard(user_id, dashboard_data):
        return users_collection.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "dashboard": dashboard_data,
                    "updatedAt": datetime.utcnow()
                }
            }
        )