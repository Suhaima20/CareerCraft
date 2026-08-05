from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from database.db import roadmap_progress_collection


progress_bp = Blueprint(
    "progress",
    __name__,
    url_prefix="/progress"
)



# =====================================
# MARK CHAPTER AS COMPLETED
# =====================================

@progress_bp.route("/complete", methods=["POST"])
@jwt_required()
def complete_chapter():

    email = get_jwt_identity()

    data = request.get_json()

    chapter_id = data.get("chapter_id")


    if not chapter_id:

        return {
            "message": "Chapter ID required"
        }, 400



    existing = roadmap_progress_collection.find_one(
        {
            "email": email,
            "chapter_id": chapter_id
        }
    )


    if existing:

        return {
            "message": "Chapter already completed"
        }, 200



    roadmap_progress_collection.insert_one(
        {
            "email": email,
            "chapter_id": chapter_id
        }
    )


    return {
        "message": "Chapter completed"
    }, 200





# =====================================
# GET USER COMPLETED CHAPTERS
# =====================================

@progress_bp.route("/my-progress", methods=["GET"])
@jwt_required()
def get_progress():


    email = get_jwt_identity()



    completed = list(

        roadmap_progress_collection.find(
            {
                "email": email
            }
        )

    )



    for item in completed:

        item["_id"] = str(item["_id"])



    return {

        "completed_chapters": completed

    },200







# =====================================
# REMOVE CHAPTER COMPLETION
# =====================================

@progress_bp.route("/remove", methods=["POST"])
@jwt_required()
def remove_chapter():


    email = get_jwt_identity()


    data = request.get_json()


    chapter_id = data.get("chapter_id")



    if not chapter_id:

        return {

            "message":"Chapter ID required"

        },400





    roadmap_progress_collection.delete_one(

        {
            "email": email,
            "chapter_id": chapter_id
        }

    )



    return {

        "message":"Chapter removed from progress"

    },200