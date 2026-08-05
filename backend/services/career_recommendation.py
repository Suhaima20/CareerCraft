from database.db import db
from services.skill_gap import compare_skills


careers_collection = db["careers"]
career_skill_collection = db["career_skill_mapping"]
skills_collection = db["skills"]


def recommend_careers(user_skills):

    recommendations = []

    careers = careers_collection.find()


    for career in careers:


        career_id = career["Career ID"]


        # Get skills related to this career
        mappings = career_skill_collection.find(
            {
                "Career ID": career_id
            }
        )


        career_skills = []


        for mapping in mappings:

            skill_id = mapping["Skill ID"]


            skill = skills_collection.find_one(
                {
                    "Skill ID": skill_id
                }
            )


            if skill:

                career_skills.append(
                    skill["Skill name"]
                )


        if not career_skills:
            continue



        result = compare_skills(
            user_skills,
            career_skills
        )


        recommendations.append({

            "career": career["Career name"],

            "match_score":
                result["match_score"],

            "matched_skills":
                result["matched_skills"],

            "missing_skills":
                result["missing_skills"]

        })



    recommendations.sort(
        key=lambda x:x["match_score"],
        reverse=True
    )


    return {

        "recommended_career":
            recommendations[0]
            if recommendations
            else None,

        "career_ranking":
            recommendations

    }