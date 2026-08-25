
from datetime import datetime, timezone

from db import get_collection


# ============================================================
# ACHIEVEMENT DEFINITIONS
# ============================================================

ACHIEVEMENT_TYPES = [
    {
        "type": "first",
        "title": "First Step",
        "description": "Complete your first chapter",
        "threshold": 1,
    },
    {
        "type": "10",
        "title": "Getting Started",
        "description": "Complete 10% of your learning roadmap",
        "threshold": 10,
    },
    {
        "type": "25",
        "title": "Quarter Way There",
        "description": "Complete 25% of your learning roadmap",
        "threshold": 25,
    },
    {
        "type": "3_chapters",
        "title": "Quick Learner",
        "description": "Complete 3 chapters",
        "threshold": 3,
    },
    {
        "type": "50",
        "title": "Halfway Hero",
        "description": "Complete 50% of your learning roadmap",
        "threshold": 50,
    },
    {
        "type": "5_chapters",
        "title": "Knowledge Builder",
        "description": "Complete 5 chapters",
        "threshold": 5,
    },
    {
        "type": "75",
        "title": "Almost There",
        "description": "Complete 75% of your learning roadmap",
        "threshold": 75,
    },
    {
        "type": "10_chapters",
        "title": "Learning Champion",
        "description": "Complete 10 chapters",
        "threshold": 10,
    },
    {
        "type": "100",
        "title": "Career Master",
        "description": "Complete 100% of your learning roadmap",
        "threshold": 100,
    },
]


# ============================================================
# GET CAREER CODE
# ============================================================

def get_career_code(career):
    return (
        career.get("career_id")
        or career.get("Career ID")
        or career.get("careerId")
    )


# ============================================================
# GET SKILL CODE
# ============================================================

def get_skill_code(skill):
    return (
        skill.get("skill_id")
        or skill.get("Skill ID")
        or skill.get("skillCode")
    )


# ============================================================
# GET CHAPTER ID FROM MAPPING
# ============================================================

def get_mapping_chapter_id(mapping):
    return (
        mapping.get("chapter_id")
        or mapping.get("Chapter ID")
        or mapping.get("chapterId")
    )


# ============================================================
# GET USER SKILLS
# ============================================================

def get_user_skill_identifiers(user_id):

    user_skill_ids = set()
    user_skill_codes = set()

    user_skills_doc = get_collection(
        "user_skills"
    ).find_one({
        "userId": user_id
    })

    if user_skills_doc:

        for entry in user_skills_doc.get("skills", []):

            if not isinstance(entry, dict):
                continue

            skill_id = entry.get("skillId")

            if skill_id is not None:
                user_skill_ids.add(str(skill_id))

            skill_code = (
                entry.get("skill_id")
                or entry.get("Skill ID")
                or entry.get("skillCode")
            )

            if skill_code:
                user_skill_codes.add(str(skill_code))

    return user_skill_ids, user_skill_codes


# ============================================================
# GET ROADMAP CHAPTER IDS
#
# IMPORTANT:
# This uses the exact same logic as build_roadmap():
#
# career
#   ↓
# career_skill_mapping
#   ↓
# missing skills
#   ↓
# skill_chapter_mapping
#   ↓
# chapters
# ============================================================

def get_roadmap_chapter_ids(user_id, career_id):

    careers = get_collection("careers")
    skills_collection = get_collection("skills")
    career_mapping_collection = get_collection(
        "career_skill_mapping"
    )
    skill_chapter_collection = get_collection(
        "skill_chapter_mapping"
    )
    chapters_collection = get_collection("chapters")

    # --------------------------------------------------------
    # FIND CAREER
    # --------------------------------------------------------

    career = careers.find_one({
        "_id": career_id
    })

    if career is None:
        return set()

    career_code = get_career_code(career)

    if not career_code:
        return set()

    # --------------------------------------------------------
    # CAREER -> SKILL MAPPINGS
    # --------------------------------------------------------

    mappings = list(
        career_mapping_collection.find({
            "$or": [
                {"career_id": career_code},
                {"Career ID": career_code},
                {"careerId": career_code},
            ]
        }).sort([
            ("order", 1),
            ("Skill order", 1),
        ])
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

    if not skill_codes:
        return set()

    # --------------------------------------------------------
    # GET SKILL DOCUMENTS
    # --------------------------------------------------------

    skills = list(
        skills_collection.find({
            "$or": [
                {
                    "skill_id": {
                        "$in": skill_codes
                    }
                },
                {
                    "Skill ID": {
                        "$in": skill_codes
                    }
                },
                {
                    "skillCode": {
                        "$in": skill_codes
                    }
                },
            ]
        })
    )

    # --------------------------------------------------------
    # USER SKILLS
    # --------------------------------------------------------

    user_skill_ids, user_skill_codes = (
        get_user_skill_identifiers(user_id)
    )

    # --------------------------------------------------------
    # CONVERT USER OBJECTIDS TO CODES
    #
    # Resume/manual skill data can contain ObjectIds.
    # --------------------------------------------------------

    skill_object_ids = []

    for value in user_skill_ids:

        try:
            from bson import ObjectId

            skill_object_ids.append(
                ObjectId(value)
            )

        except Exception:
            pass

    if skill_object_ids:

        object_id_skills = list(
            skills_collection.find({
                "_id": {
                    "$in": skill_object_ids
                }
            })
        )

        for skill in object_id_skills:

            code = get_skill_code(skill)

            if code:
                user_skill_codes.add(
                    str(code)
                )

    # --------------------------------------------------------
    # FIND MISSING SKILLS
    # --------------------------------------------------------

    missing_skills = []

    for skill in skills:

        skill_object_id = str(
            skill["_id"]
        )

        skill_code = get_skill_code(skill)

        skill_code = (
            str(skill_code)
            if skill_code
            else ""
        )

        is_known = (
            skill_object_id in user_skill_ids
            or skill_code in user_skill_codes
        )

        if not is_known:
            missing_skills.append(skill)

    # --------------------------------------------------------
    # FIND CHAPTERS FOR MISSING SKILLS
    # --------------------------------------------------------

    roadmap_chapter_ids = set()

    for skill in missing_skills:

        skill_code = get_skill_code(skill)

        mapping_query = {
            "$or": [
                {"skill_id": skill_code},
                {"Skill ID": skill_code},
                {"skillId": skill_code},
                {"skillId": skill["_id"]},
            ]
        }

        skill_chapter_mappings = list(
            skill_chapter_collection.find(
                mapping_query
            )
        )

        for mapping in skill_chapter_mappings:

            chapter_id = get_mapping_chapter_id(
                mapping
            )

            if not chapter_id:
                continue

            # MongoDB ObjectId
            if hasattr(chapter_id, "binary"):

                chapter = chapters_collection.find_one({
                    "_id": chapter_id,
                    "active": {
                        "$ne": False
                    },
                })

                if chapter:
                    roadmap_chapter_ids.add(
                        str(chapter["_id"])
                    )

                continue

            # String value
            chapter_code = str(chapter_id)

            # First try ObjectId
            try:
                from bson import ObjectId

                object_id = ObjectId(
                    chapter_code
                )

                chapter = chapters_collection.find_one({
                    "_id": object_id,
                    "active": {
                        "$ne": False
                    },
                })

                if chapter:
                    roadmap_chapter_ids.add(
                        str(chapter["_id"])
                    )

                    continue

            except Exception:
                pass

            # Then try Excel-style chapter code
            chapter = chapters_collection.find_one({
                "$or": [
                    {
                        "chapter_id":
                            chapter_code
                    },
                    {
                        "Chapter ID":
                            chapter_code
                    },
                ],
                "active": {
                    "$ne": False
                },
            })

            if chapter:
                roadmap_chapter_ids.add(
                    str(chapter["_id"])
                )

    return roadmap_chapter_ids


# ============================================================
# GET ROADMAP PROGRESS
# ============================================================

def get_progress_percent(user_id, career_id):

    progress_collection = get_collection(
        "roadmap_progress"
    )

    # --------------------------------------------------------
    # GET ACTUAL ROADMAP CHAPTERS
    # --------------------------------------------------------

    roadmap_chapter_ids = get_roadmap_chapter_ids(
        user_id,
        career_id
    )

    total_chapters = len(
        roadmap_chapter_ids
    )

    # --------------------------------------------------------
    # GET COMPLETED ROADMAP CHAPTERS
    #
    # Only count chapters that actually belong to the
    # current roadmap.
    # --------------------------------------------------------

    completed_progress = list(
        progress_collection.find({
            "userId": user_id,
            "careerId": career_id,
            "isBrushUp": {
                "$ne": True
            },
            "completed": True,
        })
    )

    completed_chapter_ids = set()

    for progress in completed_progress:

        chapter_id = progress.get(
            "chapterId"
        )

        if chapter_id is None:
            continue

        completed_chapter_ids.add(
            str(chapter_id)
        )

    # --------------------------------------------------------
    # ONLY COUNT COMPLETED CHAPTERS THAT ARE IN ROADMAP
    # --------------------------------------------------------

    completed = len(
        completed_chapter_ids.intersection(
            roadmap_chapter_ids
        )
    )

    # --------------------------------------------------------
    # CALCULATE PERCENTAGE
    # --------------------------------------------------------

    if total_chapters == 0:

        return (
            0,
            completed,
            0
        )

    percent = round(
        (
            completed
            /
            total_chapters
        ) * 100
    )

    percent = min(
        percent,
        100
    )

    return (
        percent,
        completed,
        total_chapters
    )


# ============================================================
# CHECK ACHIEVEMENTS
# ============================================================

def check_achievements(
    user_id,
    career_id
):

    percent, completed, total = (
        get_progress_percent(
            user_id,
            career_id
        )
    )

    achievements_collection = get_collection(
        "achievements"
    )

    newly_unlocked = []

    # --------------------------------------------------------
    # CHECK ALL 9 ACHIEVEMENTS
    # --------------------------------------------------------

    for achievement in ACHIEVEMENT_TYPES:

        achievement_type = achievement[
            "type"
        ]

        threshold = achievement[
            "threshold"
        ]

        # ----------------------------------------------------
        # CHAPTER-BASED ACHIEVEMENTS
        # ----------------------------------------------------

        if achievement_type == "first":

            should_unlock = (
                completed >= threshold
            )

        elif achievement_type in (
            "3_chapters",
            "5_chapters",
            "10_chapters",
        ):

            should_unlock = (
                completed >= threshold
            )

        # ----------------------------------------------------
        # PERCENTAGE-BASED ACHIEVEMENTS
        # ----------------------------------------------------

        else:

            should_unlock = (
                percent >= threshold
            )

        if not should_unlock:
            continue

        # ----------------------------------------------------
        # CHECK WHETHER ALREADY UNLOCKED
        # ----------------------------------------------------

        existing = achievements_collection.find_one({
            "userId": user_id,
            "careerId": career_id,
            "type": achievement_type,
        })

        if existing:
            continue

        # ----------------------------------------------------
        # CREATE ACHIEVEMENT
        # ----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        achievements_collection.insert_one({

            "userId": user_id,

            "careerId": career_id,

            "type": achievement_type,

            "title": achievement[
                "title"
            ],

            "description": achievement[
                "description"
            ],

            "unlocked": True,

            "unlockedAt": now,

        })

        newly_unlocked.append({

            "type": achievement_type,

            "title": achievement[
                "title"
            ],

            "description": achievement[
                "description"
            ],

            "unlockedAt": now,

        })

    return {

        "newlyUnlocked":
            newly_unlocked,

        "percent":
            percent,

        "completed":
            completed,

        "total":
            total,

    }


# ============================================================
# GET USER ACHIEVEMENTS
#
# IMPORTANT:
# Re-check achievements before displaying them.
#
# This fixes the case where the user already reached 100%
# but some achievements were never created.
# ============================================================

def get_user_achievements(
    user_id,
    career_id
):

    # --------------------------------------------------------
    # SYNCHRONIZE ACHIEVEMENTS FIRST
    # --------------------------------------------------------

    check_achievements(
        user_id,
        career_id
    )

    achievements_collection = get_collection(
        "achievements"
    )

    # --------------------------------------------------------
    # GET UNLOCKED ACHIEVEMENTS
    # --------------------------------------------------------

    user_docs = list(
        achievements_collection.find({
            "userId": user_id,
            "careerId": career_id,
        })
    )

    unlocked_by_type = {
        doc.get("type"): doc
        for doc in user_docs
    }

    result = []

    # --------------------------------------------------------
    # RETURN ALL 9 ACHIEVEMENTS
    # --------------------------------------------------------

    for achievement in ACHIEVEMENT_TYPES:

        achievement_type = achievement[
            "type"
        ]

        doc = unlocked_by_type.get(
            achievement_type
        )

        # ----------------------------------------------------
        # UNLOCKED
        # ----------------------------------------------------

        if doc:

            result.append({

                "_id": str(
                    doc["_id"]
                ),

                "type":
                    achievement_type,

                "title":
                    achievement[
                        "title"
                    ],

                "description":
                    achievement[
                        "description"
                    ],

                "unlocked":
                    True,

                "unlockedAt":
                    doc.get(
                        "unlockedAt"
                    ),

                "careerId":
                    str(
                        career_id
                    ),

            })

        # ----------------------------------------------------
        # LOCKED
        # ----------------------------------------------------

        else:

            result.append({

                "_id": (
                    f"locked-"
                    f"{career_id}-"
                    f"{achievement_type}"
                ),

                "type":
                    achievement_type,

                "title":
                    achievement[
                        "title"
                    ],

                "description":
                    achievement[
                        "description"
                    ],

                "unlocked":
                    False,

                "unlockedAt":
                    None,

                "careerId":
                    str(
                        career_id
                    ),

            })

    return result
