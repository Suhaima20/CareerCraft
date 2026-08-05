from flask import Blueprint
from database.db import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User


roadmap_bp = Blueprint(
    "roadmap",
    __name__
)



# ==============================
# Convert MongoDB ObjectId
# ==============================

def convert_object_id(document):

    if document and "_id" in document:

        document["_id"] = str(
            document["_id"]
        )

    return document





# ==============================
# Generate Roadmap Function
# ==============================

def generate_roadmap(career_id):


    career = db.careers.find_one(
        {
            "Career ID": career_id
        }
    )



    if not career:

        return None




    roadmap = {

        "career": convert_object_id(career),

        "skills": []

    }





    career_skill_mapping = db.career_skill_mapping.find(

        {
            "Career ID": career_id
        }

    ).sort(

        "Skill order",
        1

    )





    for mapping in career_skill_mapping:


        skill_id = mapping["Skill ID"]




        skill = db.skills.find_one(

            {
                "Skill ID": skill_id
            }

        )




        if skill:



            skill_data = {

                "skill": convert_object_id(skill),

                "chapters":[]

            }





            skill_chapters = db.skill_chapter_mapping.find(

                {
                    "Skill ID": skill_id
                }

            ).sort(

                "Chapter order",
                1

            )






            for chapter_mapping in skill_chapters:



                chapter_id = chapter_mapping["Chapter ID"]




                chapter = db.chapters.find_one(

                    {
                        "Chapter ID": chapter_id
                    }

                )




                if chapter:


                    skill_data["chapters"].append(

                        convert_object_id(chapter)

                    )





            roadmap["skills"].append(

                skill_data

            )






    return roadmap







# ==============================
# Career ID Roadmap
# Example:
# /roadmap/CA001
# ==============================


@roadmap_bp.route(
    "/<career_id>",
    methods=["GET"]
)
def get_learning_roadmap(career_id):


    try:


        roadmap = generate_roadmap(
            career_id
        )



        if not roadmap:


            return {

                "message":
                "Career not found"

            },404




        return roadmap,200





    except Exception as e:



        return {

            "message":
            "Error generating roadmap",

            "error":
            str(e)

        },500







# ==============================
# Logged User Roadmap
# ==============================

@roadmap_bp.route(
    "/user",
    methods=["GET"]
)

@jwt_required()

def get_user_roadmap():


    try:



        email = get_jwt_identity()



        user = User.find_by_email(
            email
        )




        if not user:


            return {

                "message":
                "User not found"

            },404





        active_career = user.get(
            "activeCareer"
        )




        if not active_career:


            return {

                "message":
                "No active career selected"

            },400






        career = db.careers.find_one(

            {
                "Career name":
                active_career
            }

        )





        if not career:


            return {

                "message":
                "Career roadmap not found"

            },404






        roadmap = generate_roadmap(

            career["Career ID"]

        )




        return roadmap,200





    except Exception as e:


        return {

            "message":
            "Error loading user roadmap",

            "error":
            str(e)

        },500







# ==============================
# My Roadmap Alias
# ==============================

@roadmap_bp.route(
    "/my-roadmap",
    methods=["GET"]
)

@jwt_required()

def my_roadmap():

    return get_user_roadmap()