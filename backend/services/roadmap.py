from bson import ObjectId

from db import get_collection
from utils.serialization import to_objectid


def get_value(document, *keys):
    """Return the first non-empty value from a document."""
    for key in keys:
        value = document.get(key)
        if value is not None and value != "":
            return value
    return None


def get_career_code(career):
    return get_value(career, "career_id", "Career ID", "careerId")


def get_skill_code(skill):
    return get_value(skill, "skill_id", "Skill ID", "skillCode")


def get_chapter_code(chapter):
    return get_value(chapter, "chapter_id", "Chapter ID")


def convert_object_id(value):
    """Safely convert a value to ObjectId when possible."""
    if isinstance(value, ObjectId):
        return value
    if value is None:
        return None
    return to_objectid(str(value))


def get_career_skill_mappings(career):
    """Support ObjectId-based and legacy code-based mappings."""
    collection = get_collection("career_skill_mapping")
    conditions = []

    if career.get("_id") is not None:
        conditions.append({"careerId": career["_id"]})

    career_code = get_career_code(career)
    if career_code:
        conditions.extend([
            {"career_id": career_code},
            {"Career ID": career_code},
            {"careerId": career_code},
        ])

    if not conditions:
        return []

    return list(
        collection.find({"$or": conditions}).sort([
            ("order", 1),
            ("Skill order", 1),
        ])
    )


def resolve_skills(mappings):
    """Resolve mapped skills in the order specified by the mappings."""
    collection = get_collection("skills")
    ordered_skills = []
    seen_ids = set()

    for mapping in mappings:
        reference = get_value(
            mapping,
            "skillId",
            "skill_id",
            "Skill ID",
            "skillCode",
        )

        if reference is None:
            continue

        skill = None
        object_id = convert_object_id(reference)

        if object_id is not None:
            skill = collection.find_one({"_id": object_id})

        if skill is None:
            code = str(reference)
            skill = collection.find_one({
                "$or": [
                    {"skill_id": code},
                    {"Skill ID": code},
                    {"skillCode": code},
                ]
            })

        if skill is None:
            continue

        skill_id = str(skill["_id"])
        if skill_id not in seen_ids:
            seen_ids.add(skill_id)
            ordered_skills.append(skill)

    return ordered_skills


def get_skill_chapter_mappings(skill):
    """Find chapters associated with a skill using either schema."""
    collection = get_collection("skill_chapter_mapping")
    conditions = []

    if skill.get("_id") is not None:
        conditions.append({"skillId": skill["_id"]})

    skill_code = get_skill_code(skill)
    if skill_code:
        conditions.extend([
            {"skill_id": skill_code},
            {"Skill ID": skill_code},
            {"skillId": skill_code},
        ])

    if not conditions:
        return []

    return list(
        collection.find({"$or": conditions}).sort([
            ("order", 1),
            ("Chapter order", 1),
        ])
    )


def resolve_chapters(mappings):
    """Resolve chapter references and preserve mapping order."""
    collection = get_collection("chapters")
    resolved = []
    seen_ids = set()

    for index, mapping in enumerate(mappings):
        reference = get_value(
            mapping,
            "chapterId",
            "chapter_id",
            "Chapter ID",
        )

        if reference is None:
            continue

        chapter = None
        object_id = convert_object_id(reference)

        if object_id is not None:
            chapter = collection.find_one({
                "_id": object_id,
                "active": {"$ne": False},
            })

        if chapter is None:
            code = str(reference)
            chapter = collection.find_one({
                "$or": [
                    {"chapter_id": code},
                    {"Chapter ID": code},
                ],
                "active": {"$ne": False},
            })

        if chapter is None:
            continue

        chapter_id = str(chapter["_id"])
        if chapter_id in seen_ids:
            continue

        seen_ids.add(chapter_id)

        mapping_order = get_value(mapping, "order", "Chapter order")
        chapter_order = get_value(chapter, "order", "Chapter order")

        resolved.append((
            mapping_order if mapping_order is not None else index,
            chapter_order if chapter_order is not None else index,
            index,
            chapter,
        ))

    resolved.sort(key=lambda item: (item[0], item[1], item[2]))
    return [item[3] for item in resolved]


def get_user_skill_sets(user_id):
    """Return the current user's confirmed skill IDs and codes."""
    collection = get_collection("user_skills")
    document = collection.find_one({"userId": user_id})

    skill_ids = set()
    skill_codes = set()

    if not document:
        return skill_ids, skill_codes

    for entry in document.get("skills", []):
        if not isinstance(entry, dict):
            continue

        skill_id = entry.get("skillId")
        if skill_id is not None:
            skill_ids.add(str(skill_id))

        code = get_value(entry, "skill_id", "Skill ID", "skillCode")
        if code:
            skill_codes.add(str(code))

    return skill_ids, skill_codes


def is_known_skill(skill, user_skill_ids, user_skill_codes):
    skill_id = str(skill["_id"])
    skill_code = get_skill_code(skill)

    return (
        skill_id in user_skill_ids
        or (
            skill_code is not None
            and str(skill_code) in user_skill_codes
        )
    )


def format_chapter(chapter, completed):
    return {
        "_id": str(chapter["_id"]),
        "chapterId": get_chapter_code(chapter) or "",
        "title": chapter.get("title") or chapter.get("Chapter name") or "",
        "description": (
            chapter.get("description")
            or chapter.get("Chapter description")
            or ""
        ),
        "youtubeUrl": (
            chapter.get("youtubeUrl")
            or chapter.get("resource_url")
            or chapter.get("Link")
            or ""
        ),
        "duration": chapter.get("duration") or "",
        "order": (
            chapter.get("order")
            or chapter.get("Chapter order")
            or 0
        ),
        "completed": completed,
    }


def build_roadmap(user_id, career_id):
    careers = get_collection("careers")
    progress_collection = get_collection("roadmap_progress")

    career_object_id = to_objectid(career_id)
    if career_object_id is None:
        return None

    career = careers.find_one({"_id": career_object_id})
    if career is None:
        return None

    career_code = get_career_code(career)

    # Resolve career skills from ObjectId or legacy mappings.
    mappings = get_career_skill_mappings(career)
    ordered_skills = resolve_skills(mappings)

    # Separate confirmed skills from missing skills.
    user_skill_ids, user_skill_codes = get_user_skill_sets(user_id)

    missing_skills = []
    for skill in ordered_skills:
        if not is_known_skill(skill, user_skill_ids, user_skill_codes):
            missing_skills.append(skill)

    # Load completed roadmap chapters. Brush-up progress is excluded.
    progress_docs = list(progress_collection.find({
        "userId": user_id,
        "careerId": career["_id"],
        "isBrushUp": {"$ne": True},
    }))

    completed_ids = {
        str(document["chapterId"])
        for document in progress_docs
        if document.get("completed") and document.get("chapterId") is not None
    }

    roadmap_skills = []
    total_chapters = 0
    completed_chapters = 0

    for skill in missing_skills:
        chapter_mappings = get_skill_chapter_mappings(skill)
        chapters = resolve_chapters(chapter_mappings)
        chapter_list = []

        for chapter in chapters:
            chapter_id = str(chapter["_id"])
            completed = chapter_id in completed_ids

            total_chapters += 1
            if completed:
                completed_chapters += 1

            chapter_list.append(format_chapter(chapter, completed))

        roadmap_skills.append({
            "_id": str(skill["_id"]),
            "skillCode": get_skill_code(skill) or "",
            "name": skill.get("name") or skill.get("Skill name") or "",
            "description": (
                skill.get("description")
                or skill.get("Skill description")
                or ""
            ),
            "category": skill.get("category", ""),
            "chapters": chapter_list,
        })

    progress = (
        round((completed_chapters / total_chapters) * 100)
        if total_chapters
        else 0
    )

    return {
        "careerId": str(career["_id"]),
        "careerCode": career_code,
        "careerName": career.get("name") or career.get("Career name") or "",
        "skills": roadmap_skills,
        "completedChapters": completed_chapters,
        "totalChapters": total_chapters,
        "progress": progress,
    }


def build_brush_up(user_id, career_id):
    careers = get_collection("careers")
    progress_collection = get_collection("roadmap_progress")

    career_object_id = to_objectid(career_id)
    if career_object_id is None:
        return []

    career = careers.find_one({"_id": career_object_id})
    if career is None:
        return []

    mappings = get_career_skill_mappings(career)
    ordered_skills = resolve_skills(mappings)

    user_skill_ids, user_skill_codes = get_user_skill_sets(user_id)

    known_skills = [
        skill
        for skill in ordered_skills
        if is_known_skill(skill, user_skill_ids, user_skill_codes)
    ]

    progress_docs = list(progress_collection.find({
        "userId": user_id,
        "careerId": career["_id"],
        "isBrushUp": True,
    }))

    completed_ids = {
        str(document["chapterId"])
        for document in progress_docs
        if document.get("completed") and document.get("chapterId") is not None
    }

    chapters_result = []

    for skill in known_skills:
        chapter_mappings = get_skill_chapter_mappings(skill)
        chapters = resolve_chapters(chapter_mappings)

        for chapter in chapters:
            chapter_id = str(chapter["_id"])

            chapters_result.append({
                "_id": chapter_id,
                "chapterId": get_chapter_code(chapter) or "",
                "title": (
                    chapter.get("title")
                    or chapter.get("Chapter name")
                    or ""
                ),
                "description": (
                    chapter.get("description")
                    or chapter.get("Chapter description")
                    or ""
                ),
                "youtubeUrl": (
                    chapter.get("youtubeUrl")
                    or chapter.get("resource_url")
                    or chapter.get("Link")
                    or ""
                ),
                "duration": chapter.get("duration") or "",
                "skillName": (
                    skill.get("name")
                    or skill.get("Skill name")
                    or ""
                ),
                "completed": chapter_id in completed_ids,
            })

    return chapters_result
