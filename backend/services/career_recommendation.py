from database.db import careers_collection
from services.skill_gap import compare_skills


def recommend_careers(user_skills):
    """
    Compare the user's skills with every career in the database
    and return a ranked list of career recommendations.
    """

    careers = careers_collection.find()

    recommendations = []

    for career in careers:
        result = compare_skills(user_skills, career["skills"])

        recommendations.append({
            "career": career["career"],
            "match_score": result["match_score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"]
        })

    # Sort by highest match score
    recommendations.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    best_career = recommendations[0] if recommendations else None

    return {
        "recommended_career": best_career,
        "career_ranking": recommendations
    }