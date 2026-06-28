def compare_skills(user_skills, career_skills):

    user_set = set([s.lower() for s in user_skills])
    career_set = set([s.lower() for s in career_skills])

    matched = list(user_set.intersection(career_set))
    missing = list(career_set - user_set)

    match_score = 0
    if len(career_set) > 0:
        match_score = (len(matched) / len(career_set)) * 100

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "match_score": round(match_score, 2)
    }