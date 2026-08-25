from db import get_collection
from utils.serialization import to_objectid


def build_roadmap(user_id, career_id):
    careers = get_collection("careers")
    skills_collection = get_collection("skills")
    mapping_collection = get_collection("career_skill_mapping")
    chapters_collection = get_collection("chapters")
    skill_chapter_collection = get_collection("skill_chapter_mapping")
    progress_collection = get_collection("roadmap_progress")

    # ---------------------------------------------------------
    # Find career
    # ---------------------------------------------------------

    career_obj_id = to_objectid(career_id)

    if career_obj_id is None:
        return None

    career = careers.find_one({"_id": career_obj_id})

    if career is None:
        return None

    career_code = (
        career.get("career_id")
        or career.get("Career ID")
        or career.get("careerId")
    )

    # ---------------------------------------------------------
    # Find career -> skill mappings
    # ---------------------------------------------------------

    career_mapping_query = {
        "$or": [
            {"career_id": career_code},
            {"Career ID": career_code},
            {"careerId": career_code},
        ]
    }

    mappings = list(
        mapping_collection.find(career_mapping_query).sort(
            [
                ("order", 1),
                ("Skill order", 1),
            ]
        )
    )

    skill_codes = []

    for mapping in mappings:
        skill_code = (
            mapping.get("skill_id")
            or mapping.get("Skill ID")
            or mapping.get("skillId")
        )

        if skill_code:
            skill_codes.append(str(skill_code))

    # ---------------------------------------------------------
    # Find skills
    # ---------------------------------------------------------

    if skill_codes:
        skills = list(
            skills_collection.find({
                "$or": [
                    {"skill_id": {"$in": skill_codes}},
                    {"Skill ID": {"$in": skill_codes}},
                    {"skillCode": {"$in": skill_codes}},
                ]
            })
        )
    else:
        skills = []

    # ---------------------------------------------------------
    # Preserve career -> skill order
    # ---------------------------------------------------------

    skill_map = {}

    for skill in skills:
        code = (
            skill.get("skill_id")
            or skill.get("Skill ID")
            or skill.get("skillCode")
        )

        if code:
            skill_map[str(code)] = skill

    ordered_skills = [
        skill_map[code]
        for code in skill_codes
        if code in skill_map
    ]

    # ---------------------------------------------------------
    # Get user's confirmed skills
    # ---------------------------------------------------------

    user_skills_doc = get_collection("user_skills").find_one({
        "userId": user_id
    })

    user_skill_ids = set()
    user_skill_codes = set()

    if user_skills_doc:

        for entry in user_skills_doc.get("skills", []):

            if not isinstance(entry, dict):
                continue

            # ObjectId based skill
            skill_id = entry.get("skillId")

            if skill_id:
                user_skill_ids.add(str(skill_id))

            # Code based skill
            skill_code = (
                entry.get("skill_id")
                or entry.get("Skill ID")
                or entry.get("skillCode")
            )

            if skill_code:
                user_skill_codes.add(str(skill_code))

    # ---------------------------------------------------------
    # Separate known and missing skills
    # ---------------------------------------------------------

    missing_skills = []
    known_skills = []

    for skill in ordered_skills:

        skill_object_id = str(skill["_id"])

        skill_code = str(
            skill.get("skill_id")
            or skill.get("Skill ID")
            or skill.get("skillCode")
            or ""
        )

        if (
            skill_object_id in user_skill_ids
            or skill_code in user_skill_codes
        ):
            known_skills.append(skill)
        else:
            missing_skills.append(skill)

    # ---------------------------------------------------------
    # Get completed roadmap chapters
    # ---------------------------------------------------------

    progress_docs = list(
        progress_collection.find({
            "userId": user_id,
            "careerId": career["_id"],
            "isBrushUp": {"$ne": True},
        })
    )

    completed_chapter_ids = {
        str(p["chapterId"])
        for p in progress_docs
        if p.get("completed") and p.get("chapterId")
    }

    # ---------------------------------------------------------
    # Build roadmap
    # ---------------------------------------------------------

    roadmap_skills = []

    total_chapters = 0
    completed_chapters = 0

    for skill in missing_skills:

        skill_code = (
            skill.get("skill_id")
            or skill.get("Skill ID")
            or skill.get("skillCode")
        )

        # -----------------------------------------------------
        # Find skill -> chapter mappings
        #
        # Your database uses:
        #
        # skill_id  = "SK0201"
        # chapter_id = "CH02014"
        #
        # -----------------------------------------------------

        mapping_query = {
            "$or": [
                {"skill_id": skill_code},
                {"Skill ID": skill_code},
                {"skillId": skill_code},
                {"skillId": skill["_id"]},
            ]
        }

        skill_chapter_mappings = list(
            skill_chapter_collection.find(mapping_query).sort(
                [
                    ("order", 1),
                    ("Chapter order", 1),
                ]
            )
        )

        chapter_codes = []
        chapter_object_ids = []

        for mapping in skill_chapter_mappings:

            chapter_id = (
                mapping.get("chapter_id")
                or mapping.get("Chapter ID")
                or mapping.get("chapterId")
            )

            if not chapter_id:
                continue

            # If mapping contains an ObjectId
            if hasattr(chapter_id, "binary"):
                chapter_object_ids.append(chapter_id)

            else:
                chapter_code = str(chapter_id)

                # If it happens to be an ObjectId string
                object_id = to_objectid(chapter_code)

                if object_id is not None:
                    chapter_object_ids.append(object_id)

                # Keep the chapter code too.
                # Your database uses CH02014 format.
                chapter_codes.append(chapter_code)

        # -----------------------------------------------------
        # Find chapters
        #
        # Support BOTH:
        #
        # _id       -> ObjectId(...)
        # chapter_id -> "CH02014"
        # -----------------------------------------------------

        chapter_query_parts = []

        if chapter_object_ids:
            chapter_query_parts.append({
                "_id": {"$in": chapter_object_ids}
            })

        if chapter_codes:
            chapter_query_parts.extend([
                {
                    "chapter_id": {
                        "$in": chapter_codes
                    }
                },
                {
                    "Chapter ID": {
                        "$in": chapter_codes
                    }
                },
            ])

        if chapter_query_parts:

            chapters = list(
                chapters_collection.find({
                    "$or": chapter_query_parts,
                    "active": {"$ne": False},
                })
            )

        else:
            chapters = []

        # -----------------------------------------------------
        # Preserve mapping order
        # -----------------------------------------------------

        mapping_order = {}

        for index, mapping in enumerate(skill_chapter_mappings):

            chapter_id = (
                mapping.get("chapter_id")
                or mapping.get("Chapter ID")
                or mapping.get("chapterId")
            )

            if chapter_id:
                mapping_order[str(chapter_id)] = (
                    mapping.get("order")
                    or mapping.get("Chapter order")
                    or index
                )

        def chapter_sort_key(chapter):

            chapter_code = (
                chapter.get("chapter_id")
                or chapter.get("Chapter ID")
                or ""
            )

            return (
                mapping_order.get(str(chapter_code), 999999),
                chapter.get("order", 999999),
                chapter.get("Chapter order", 999999),
            )

        chapters.sort(key=chapter_sort_key)

        # -----------------------------------------------------
        # Build chapter response
        # -----------------------------------------------------

        chapter_list = []

        for chapter in chapters:

            chapter_object_id = str(chapter["_id"])

            is_completed = (
                chapter_object_id in completed_chapter_ids
            )

            total_chapters += 1

            if is_completed:
                completed_chapters += 1

            chapter_list.append({
                "_id": chapter_object_id,

                "chapterId": (
                    chapter.get("chapter_id")
                    or chapter.get("Chapter ID")
                    or ""
                ),

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

                "duration": (
                    chapter.get("duration")
                    or ""
                ),

                "order": (
                    chapter.get("order")
                    or chapter.get("Chapter order")
                    or 0
                ),

                "completed": is_completed,
            })

        # -----------------------------------------------------
        # Add skill
        # -----------------------------------------------------

        roadmap_skills.append({
            "_id": str(skill["_id"]),

            "skillCode": skill_code or "",

            "name": (
                skill.get("name")
                or skill.get("Skill name")
                or ""
            ),

            "description": (
                skill.get("description")
                or skill.get("Skill description")
                or ""
            ),

            "category": skill.get("category", ""),

            "chapters": chapter_list,
        })

    # ---------------------------------------------------------
    # Progress
    # ---------------------------------------------------------

    progress = (
        round(
            (completed_chapters / total_chapters) * 100
        )
        if total_chapters > 0
        else 0
    )

    return {
        "careerId": str(career["_id"]),

        "careerCode": career_code,

        "careerName": (
            career.get("name")
            or career.get("Career name")
            or ""
        ),

        "skills": roadmap_skills,

        "completedChapters": completed_chapters,

        "totalChapters": total_chapters,

        "progress": progress,
    }


def build_brush_up(user_id, career_id):
    careers = get_collection("careers")
    skills_collection = get_collection("skills")
    career_skill_collection = get_collection("career_skill_mapping")
    skill_chapter_collection = get_collection("skill_chapter_mapping")
    chapters_collection = get_collection("chapters")
    progress_collection = get_collection("roadmap_progress")

    career = careers.find_one({
        "_id": to_objectid(career_id)
    })

    if career is None:
        return []

    career_code = (
        career.get("career_id")
        or career.get("Career ID")
        or career.get("careerId")
    )

    # ---------------------------------------------------------
    # Get career -> skill mappings
    # ---------------------------------------------------------

    career_mappings = list(
        career_skill_collection.find({
            "$or": [
                {"career_id": career_code},
                {"Career ID": career_code},
                {"careerId": career_code},
            ]
        })
    )

    skill_codes = []

    for mapping in career_mappings:

        skill_code = (
            mapping.get("skill_id")
            or mapping.get("Skill ID")
            or mapping.get("skillId")
        )

        if skill_code:
            skill_codes.append(str(skill_code))

    # ---------------------------------------------------------
    # Get skills
    # ---------------------------------------------------------

    all_skills = list(
        skills_collection.find({
            "$or": [
                {"skill_id": {"$in": skill_codes}},
                {"Skill ID": {"$in": skill_codes}},
                {"skillCode": {"$in": skill_codes}},
            ]
        })
    )

    skill_map = {}

    for skill in all_skills:

        code = (
            skill.get("skill_id")
            or skill.get("Skill ID")
            or skill.get("skillCode")
        )

        if code:
            skill_map[str(code)] = skill

    ordered_skills = [
        skill_map[code]
        for code in skill_codes
        if code in skill_map
    ]

    # ---------------------------------------------------------
    # Get user's known skills
    # ---------------------------------------------------------

    user_skills_doc = get_collection("user_skills").find_one({
        "userId": user_id
    })

    user_skill_ids = set()
    user_skill_codes = set()

    if user_skills_doc:

        for entry in user_skills_doc.get("skills", []):

            if not isinstance(entry, dict):
                continue

            if entry.get("skillId"):
                user_skill_ids.add(str(entry["skillId"]))

            skill_code = (
                entry.get("skill_id")
                or entry.get("Skill ID")
                or entry.get("skillCode")
            )

            if skill_code:
                user_skill_codes.add(str(skill_code))

    # ---------------------------------------------------------
    # Known skills only
    # ---------------------------------------------------------

    known_skills = []

    for skill in ordered_skills:

        skill_object_id = str(skill["_id"])

        skill_code = str(
            skill.get("skill_id")
            or skill.get("Skill ID")
            or skill.get("skillCode")
            or ""
        )

        if (
            skill_object_id in user_skill_ids
            or skill_code in user_skill_codes
        ):
            known_skills.append(skill)

    # ---------------------------------------------------------
    # Brush-up progress
    # ---------------------------------------------------------

    brush_up_progress = list(
        progress_collection.find({
            "userId": user_id,
            "careerId": career["_id"],
            "isBrushUp": True,
        })
    )

    completed_brushup_ids = {
        str(p["chapterId"])
        for p in brush_up_progress
        if p.get("completed") and p.get("chapterId")
    }

    # ---------------------------------------------------------
    # Build brush-up chapters
    # ---------------------------------------------------------

    chapters_result = []

    for skill in known_skills:

        skill_code = (
            skill.get("skill_id")
            or skill.get("Skill ID")
            or skill.get("skillCode")
        )

        mappings = list(
            skill_chapter_collection.find({
                "$or": [
                    {"skill_id": skill_code},
                    {"Skill ID": skill_code},
                    {"skillId": skill_code},
                    {"skillId": skill["_id"]},
                ]
            }).sort([
                ("order", 1),
                ("Chapter order", 1),
            ])
        )

        chapter_codes = []
        chapter_object_ids = []

        for mapping in mappings:

            chapter_id = (
                mapping.get("chapter_id")
                or mapping.get("Chapter ID")
                or mapping.get("chapterId")
            )

            if not chapter_id:
                continue

            if hasattr(chapter_id, "binary"):
                chapter_object_ids.append(chapter_id)
            else:
                chapter_code = str(chapter_id)

                chapter_codes.append(chapter_code)

                object_id = to_objectid(chapter_code)

                if object_id is not None:
                    chapter_object_ids.append(object_id)

        query_parts = []

        if chapter_object_ids:
            query_parts.append({
                "_id": {"$in": chapter_object_ids}
            })

        if chapter_codes:
            query_parts.extend([
                {
                    "chapter_id": {
                        "$in": chapter_codes
                    }
                },
                {
                    "Chapter ID": {
                        "$in": chapter_codes
                    }
                },
            ])

        if query_parts:

            chapters = list(
                chapters_collection.find({
                    "$or": query_parts,
                    "active": {"$ne": False},
                })
            )

        else:
            chapters = []

        chapters.sort(
            key=lambda c: (
                c.get("order")
                or c.get("Chapter order")
                or 0
            )
        )

        for chapter in chapters:

            chapter_object_id = str(chapter["_id"])

            chapters_result.append({
                "_id": chapter_object_id,

                "chapterId": (
                    chapter.get("chapter_id")
                    or chapter.get("Chapter ID")
                    or ""
                ),

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

                "duration": (
                    chapter.get("duration")
                    or ""
                ),

                "skillName": (
                    skill.get("name")
                    or skill.get("Skill name")
                    or ""
                ),

                "completed": (
                    chapter_object_id in completed_brushup_ids
                ),
            })

    return chapters_result