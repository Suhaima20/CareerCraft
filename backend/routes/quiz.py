from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
import random
import uuid

from db import get_collection
from utils.auth import token_required
from utils.serialization import to_objectid

from services.achievements import (
    check_achievements,
)

from services.streak import (
    update_streak,
)


quiz_bp = Blueprint(
    "quiz",
    __name__,
    url_prefix="/quiz"
)


# ============================================================
# DEFAULT SETTINGS
# ============================================================

DEFAULT_PASS_SCORE = 70
DEFAULT_WATCH_PERCENTAGE = 98


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_current_user():

    return get_collection(
        "users"
    ).find_one({
        "_id":
            g.current_user_id
    })


def get_active_career_id():

    user = get_current_user()

    if not user:
        return None

    return user.get(
        "activeCareerId"
    )


def get_quiz(chapter_obj_id):

    return get_collection(
        "quizzes"
    ).find_one({
        "chapterId":
            chapter_obj_id
    })


def get_watch_progress(
    user_id,
    career_id,
    chapter_id
):

    if not career_id:
        return None

    return get_collection(
        "video_watch_progress"
    ).find_one({

        "userId":
            user_id,

        "careerId":
            career_id,

        "chapterId":
            chapter_id,

    })


# ============================================================
# GET QUIZ
# ============================================================

@quiz_bp.route(
    "/<chapter_id>",
    methods=["GET", "OPTIONS"]
)
@token_required
def get_user_quiz(chapter_id):

    if request.method == "OPTIONS":

        return jsonify({
            "status": "ok"
        }), 200

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if chapter_obj_id is None:

        return jsonify({
            "error":
                "Invalid chapter ID"
        }), 400

    quiz = get_quiz(
        chapter_obj_id
    )

    # --------------------------------------------------------
    # NO QUIZ
    # --------------------------------------------------------

    if (
        not quiz
        or not quiz.get("questions")
    ):

        return jsonify({

            "hasQuiz":
                False,

            "message":
                "No quiz configured for this chapter"

        }), 200

    # --------------------------------------------------------
    # INACTIVE QUIZ
    # --------------------------------------------------------

    if quiz.get("active") is False:

        return jsonify({

            "hasQuiz":
                False,

            "message":
                "Quiz is currently inactive"

        }), 200

    user_id = g.current_user_id

    career_id = get_active_career_id()

    if not career_id:

        return jsonify({
            "error":
                "No active career selected"
        }), 400

    # --------------------------------------------------------
    # WATCH REQUIREMENT
    # --------------------------------------------------------

    required_watch_percentage = int(
        quiz.get(
            "requiredWatchPercentage",
            DEFAULT_WATCH_PERCENTAGE
        )
    )

    watch_record = get_watch_progress(

        user_id,

        career_id,

        chapter_obj_id

    )

    watched_percentage = (

        float(
            watch_record.get(
                "watchPercentage",
                0
            )
        )

        if watch_record

        else 0

    )

    quiz_unlocked = (

        watched_percentage
        >=
        required_watch_percentage

    )

    pass_score = int(
        quiz.get(
            "passScore",
            DEFAULT_PASS_SCORE
        )
    )

    questions = quiz.get(
        "questions",
        []
    )

    # --------------------------------------------------------
    # VIDEO NOT COMPLETED
    #
    # Do not expose the questions yet.
    # --------------------------------------------------------

    if not quiz_unlocked:

        return jsonify({

            "hasQuiz":
                True,

            "quizUnlocked":
                False,

            "watchPercentage":
                round(
                    watched_percentage,
                    2
                ),

            "requiredWatchPercentage":
                required_watch_percentage,

            "passScore":
                pass_score,

            "totalQuestions":
                len(questions),

            "message":
                (
                    f"Watch at least "
                    f"{required_watch_percentage}% "
                    f"of the video to unlock "
                    f"the quiz."
                ),

        }), 200

    # --------------------------------------------------------
    # CREATE NEW QUIZ ATTEMPT
    # --------------------------------------------------------

    attempt_id = str(
        uuid.uuid4()
    )

    now = datetime.now(
        timezone.utc
    )

    shuffled_questions = []

    question_mappings = {}

    for index, q in enumerate(
        questions
    ):

        question_id = str(
            q.get("id")
            if q.get("id") not in (None, "")
            else index
        )

        original_options = list(
            q.get(
                "options",
                []
            )
        )

        original_correct_index = int(
            q.get(
                "correctOption",
                0
            )
        )

        indexed_options = [

            {
                "originalIndex":
                    option_index,

                "text":
                    option,

            }

            for option_index, option
            in enumerate(
                original_options
            )

        ]

        random.shuffle(
            indexed_options
        )

        shuffled_options = [

            item["text"]

            for item
            in indexed_options

        ]

        question_mappings[
            question_id
        ] = {

            "optionOrder": [

                item["originalIndex"]

                for item
                in indexed_options

            ],

            "correctOriginalIndex":
                original_correct_index,

        }

        shuffled_questions.append({
            "id": question_id,
            "question": q.get("question"),
            "options": shuffled_options,
        })

    # --------------------------------------------------------
    # SAVE ATTEMPT
    # --------------------------------------------------------

    get_collection(
        "quiz_attempts"
    ).insert_one({

        "attemptId":
            attempt_id,

        "userId":
            user_id,

        "careerId":
            career_id,

        "chapterId":
            chapter_obj_id,

        "questionMappings":
            question_mappings,

        "status":
            "started",

        "startedAt":
            now,

    })

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "hasQuiz":
            True,

        "quizUnlocked":
            True,

        "attemptId":
            attempt_id,

        "title":
            quiz.get(
                "title",
                "Chapter Quiz"
            ),

        "passScore":
            pass_score,

        "requiredWatchPercentage":
            required_watch_percentage,

        "watchPercentage":
            round(
                watched_percentage,
                2
            ),

        "totalQuestions":
            len(
                shuffled_questions
            ),

        "questions":
            shuffled_questions,

    }), 200


# ============================================================
# UPDATE VIDEO WATCH PROGRESS
# ============================================================

@quiz_bp.route(
    "/<chapter_id>/watch-progress",
    methods=["POST", "OPTIONS"]
)
@token_required
def update_watch_progress(
    chapter_id
):

    if request.method == "OPTIONS":

        return jsonify({
            "status": "ok"
        }), 200

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if chapter_obj_id is None:

        return jsonify({
            "error":
                "Invalid chapter ID"
        }), 400

    data = request.get_json() or {}

    user_id = g.current_user_id

    career_id = get_active_career_id()

    if not career_id:

        return jsonify({
            "error":
                "No active career selected"
        }), 400

    # --------------------------------------------------------
    # WATCH PERCENTAGE
    #
    # Frontend can send:
    #
    # watchPercentage
    #
    # OR:
    #
    # currentTime + duration
    # --------------------------------------------------------

    raw_percentage = data.get(
        "watchPercentage"
    )

    if raw_percentage is None:

        current_time = data.get(
            "currentTime"
        )

        duration = data.get(
            "duration"
        )

        try:

            current_time = float(
                current_time
            )

            duration = float(
                duration
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({
                "error":
                    (
                        "Valid currentTime "
                        "and duration are required"
                    )
            }), 400

        if duration <= 0:

            return jsonify({
                "error":
                    (
                        "Video duration "
                        "must be greater than zero"
                    )
            }), 400

        raw_percentage = (

            current_time
            /
            duration

        ) * 100

    try:

        watch_percentage = float(
            raw_percentage
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify({
            "error":
                "Invalid watch percentage"
        }), 400

    # --------------------------------------------------------
    # LIMIT 0 - 100
    # --------------------------------------------------------

    watch_percentage = max(
        0,
        min(
            100,
            watch_percentage
        )
    )

    now = datetime.now(
        timezone.utc
    )

    # --------------------------------------------------------
    # GET EXISTING MAXIMUM
    # --------------------------------------------------------

    existing = get_watch_progress(

        user_id,

        career_id,

        chapter_obj_id

    )

    previous_percentage = (

        float(
            existing.get(
                "watchPercentage",
                0
            )
        )

        if existing

        else 0

    )

    # Never reduce stored progress.

    maximum_percentage = max(

        previous_percentage,

        watch_percentage

    )

    # --------------------------------------------------------
    # GET QUIZ SETTINGS
    # --------------------------------------------------------

    quiz = get_quiz(
        chapter_obj_id
    )

    required_watch_percentage = (

        int(
            quiz.get(
                "requiredWatchPercentage",
                DEFAULT_WATCH_PERCENTAGE
            )
        )

        if quiz

        else DEFAULT_WATCH_PERCENTAGE

    )

    quiz_unlocked = (

        maximum_percentage
        >=
        required_watch_percentage

    )

    # --------------------------------------------------------
    # SAVE WATCH PROGRESS
    # --------------------------------------------------------

    get_collection(
        "video_watch_progress"
    ).update_one(

        {

            "userId":
                user_id,

            "careerId":
                career_id,

            "chapterId":
                chapter_obj_id,

        },

        {

            "$set": {

                "userId":
                    user_id,

                "careerId":
                    career_id,

                "chapterId":
                    chapter_obj_id,

                "watchPercentage":
                    round(
                        maximum_percentage,
                        2
                    ),

                "updatedAt":
                    now,

            },

            "$setOnInsert": {

                "createdAt":
                    now,

            },

        },

        upsert=True

    )

    return jsonify({

        "success":
            True,

        "watchPercentage":
            round(
                maximum_percentage,
                2
            ),

        "requiredWatchPercentage":
            required_watch_percentage,

        "quizUnlocked":
            quiz_unlocked,

    }), 200


# ============================================================
# GET CHAPTER LEARNING STATUS
# ============================================================

@quiz_bp.route(
    "/<chapter_id>/status",
    methods=["GET", "OPTIONS"]
)
@token_required
def get_chapter_learning_status(
    chapter_id
):

    if request.method == "OPTIONS":

        return jsonify({
            "status": "ok"
        }), 200

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if chapter_obj_id is None:

        return jsonify({
            "error":
                "Invalid chapter ID"
        }), 400

    user_id = g.current_user_id

    career_id = get_active_career_id()

    if not career_id:

        return jsonify({
            "error":
                "No active career selected"
        }), 400

    quiz = get_quiz(
        chapter_obj_id
    )

    watch_record = get_watch_progress(

        user_id,

        career_id,

        chapter_obj_id

    )

    watch_percentage = (

        float(
            watch_record.get(
                "watchPercentage",
                0
            )
        )

        if watch_record

        else 0

    )

    if quiz:

        required_watch_percentage = int(

            quiz.get(
                "requiredWatchPercentage",
                DEFAULT_WATCH_PERCENTAGE
            )

        )

        pass_score = int(

            quiz.get(
                "passScore",
                DEFAULT_PASS_SCORE
            )

        )

        has_quiz = bool(
            quiz.get("questions")
        )

        quiz_active = (
            quiz.get(
                "active",
                True
            )
        )

    else:

        required_watch_percentage = (
            DEFAULT_WATCH_PERCENTAGE
        )

        pass_score = (
            DEFAULT_PASS_SCORE
        )

        has_quiz = False

        quiz_active = False

    quiz_unlocked = (

        has_quiz

        and quiz_active

        and (

            watch_percentage
            >=
            required_watch_percentage

        )

    )

    # --------------------------------------------------------
    # CHECK COMPLETION
    # --------------------------------------------------------

    progress = get_collection(
        "roadmap_progress"
    ).find_one({

        "userId":
            user_id,

        "careerId":
            career_id,

        "chapterId":
            chapter_obj_id,

    })

    completed = bool(

        progress

        and

        progress.get(
            "completed"
        )

    )

    return jsonify({

        "chapterId":
            chapter_id,

        "completed":
            completed,

        "hasQuiz":
            has_quiz,

        "quizActive":
            quiz_active,

        "watchPercentage":
            round(
                watch_percentage,
                2
            ),

        "requiredWatchPercentage":
            required_watch_percentage,

        "quizUnlocked":
            quiz_unlocked,

        "passScore":
            pass_score,

        "canComplete":
            completed,

    }), 200


# ============================================================
# SUBMIT QUIZ
# ============================================================

@quiz_bp.route(
    "/<chapter_id>/submit",
    methods=["POST", "OPTIONS"]
)
@token_required
def submit_quiz(
    chapter_id
):

    if request.method == "OPTIONS":

        return jsonify({
            "status": "ok"
        }), 200

    data = request.get_json() or {}

    user_answers = data.get(
        "answers",
        {}
    )

    attempt_id = data.get(
        "attemptId"
    )

    if not attempt_id:

        return jsonify({
            "error":
                "Quiz attempt ID is required"
        }), 400

    chapter_obj_id = to_objectid(
        chapter_id
    )

    if chapter_obj_id is None:

        return jsonify({
            "error":
                "Invalid chapter ID"
        }), 400

    user_id = g.current_user_id

    career_id = get_active_career_id()

    if not career_id:

        return jsonify({
            "error":
                "No active career selected"
        }), 400

    # --------------------------------------------------------
    # FIND QUIZ
    # --------------------------------------------------------

    quiz = get_quiz(
        chapter_obj_id
    )

    if (
        not quiz
        or not quiz.get("questions")
    ):

        return jsonify({
            "error":
                "Quiz not found for this chapter"
        }), 404

    if quiz.get("active") is False:

        return jsonify({
            "error":
                "This quiz is currently inactive"
        }), 403

    questions = quiz.get(
        "questions",
        []
    )

    if not questions:

        return jsonify({
            "error":
                "Quiz has no questions"
        }), 400

    pass_score = int(
        quiz.get(
            "passScore",
            DEFAULT_PASS_SCORE
        )
    )

    required_watch_percentage = int(
        quiz.get(
            "requiredWatchPercentage",
            DEFAULT_WATCH_PERCENTAGE
        )
    )

    # --------------------------------------------------------
    # CHECK VIDEO WATCH REQUIREMENT
    # --------------------------------------------------------

    watch_record = get_watch_progress(

        user_id,

        career_id,

        chapter_obj_id

    )

    watched_percentage = (

        float(
            watch_record.get(
                "watchPercentage",
                0
            )
        )

        if watch_record

        else 0

    )

    if watched_percentage < (
        required_watch_percentage
    ):

        return jsonify({

            "error":
                (
                    f"You must watch at least "
                    f"{required_watch_percentage}% "
                    f"of the lesson before "
                    f"taking the quiz."
                ),

            "quizUnlocked":
                False,

            "watchPercentage":
                round(
                    watched_percentage,
                    2
                ),

            "requiredWatchPercentage":
                required_watch_percentage,

        }), 403

    # --------------------------------------------------------
    # FIND ATTEMPT
    # --------------------------------------------------------

    attempt = get_collection(
        "quiz_attempts"
    ).find_one({

        "attemptId":
            attempt_id,

        "userId":
            user_id,

        "careerId":
            career_id,

        "chapterId":
            chapter_obj_id,

        "status":
            "started",

    })

    if not attempt:

        return jsonify({
            "error":
                (
                    "Quiz attempt not found "
                    "or already submitted"
                )
        }), 400

    question_mappings = attempt.get(
        "questionMappings",
        {}
    )

    # --------------------------------------------------------
    # CALCULATE SCORE
    # --------------------------------------------------------

    correct_count = 0

    for idx, q in enumerate(
        questions
    ):

        question_id = str(
            q.get("id")
            if q.get("id") not in (None, "")
            else idx
        )

        user_choice = (
            user_answers.get(
                question_id
            )
        )

        if user_choice is None:
            continue

        try:

            displayed_index = int(
                user_choice
            )

        except (
            TypeError,
            ValueError
        ):

            continue

        mapping = (
            question_mappings.get(
                question_id
            )
        )

        if not mapping:
            continue

        option_order = mapping.get(
            "optionOrder",
            []
        )

        correct_original_index = int(
            mapping.get(
                "correctOriginalIndex",
                0
            )
        )

        if (

            displayed_index < 0

            or

            displayed_index >=
            len(option_order)

        ):

            continue

        original_index = (
            option_order[
                displayed_index
            ]
        )

        if (
            int(original_index)
            ==
            correct_original_index
        ):

            correct_count += 1

    # --------------------------------------------------------
    # SCORE PERCENTAGE
    # --------------------------------------------------------

    total_questions = len(
        questions
    )

    score_percentage = round(

        (
            correct_count
            /
            total_questions
        )
        *
        100

    )

    passed = (

        score_percentage
        >=
        pass_score

    )

    now = datetime.now(
        timezone.utc
    )

    # --------------------------------------------------------
    # UPDATE ATTEMPT
    # --------------------------------------------------------

    get_collection(
        "quiz_attempts"
    ).update_one(

        {
            "_id":
                attempt["_id"]
        },

        {

            "$set": {

                "status":
                    "submitted",

                "scorePercentage":
                    score_percentage,

                "passed":
                    passed,

                "correctCount":
                    correct_count,

                "totalQuestions":
                    total_questions,

                "submittedAt":
                    now,

            }

        }

    )

    # --------------------------------------------------------
    # COMPLETE CHAPTER AFTER PASSING
    # --------------------------------------------------------

    newly_unlocked = []

    if passed:

        get_collection(
            "roadmap_progress"
        ).update_one(

            {

                "userId":
                    user_id,

                "careerId":
                    career_id,

                "chapterId":
                    chapter_obj_id,

                "isBrushUp":
                    {
                        "$ne":
                            True
                    },

            },

            {

                "$set": {

                    "userId":
                        user_id,

                    "careerId":
                        career_id,

                    "chapterId":
                        chapter_obj_id,

                    "completed":
                        True,

                    "score":
                        score_percentage,

                    "updatedAt":
                        now,

                },

                "$setOnInsert": {

                    "createdAt":
                        now,

                    "isBrushUp":
                        False,

                },

            },

            upsert=True

        )

        # ----------------------------------------------------
        # UPDATE STREAK
        # ----------------------------------------------------

        update_streak(
            user_id
        )

        # ----------------------------------------------------
        # CHECK ACHIEVEMENTS
        # ----------------------------------------------------

        achievement_result = (
            check_achievements(
                user_id,
                career_id
            )
        )

        if isinstance(
            achievement_result,
            dict
        ):

            newly_unlocked = (
                achievement_result.get(
                    "newlyUnlocked",
                    []
                )
            )

        elif isinstance(
            achievement_result,
            list
        ):

            newly_unlocked = (
                achievement_result
            )

    # --------------------------------------------------------
    # RESPONSE MESSAGE
    # --------------------------------------------------------

    if passed:

        message = (

            f"Congratulations! "
            f"You scored "
            f"{score_percentage}%. "
            f"The chapter is now complete."

        )

    else:

        message = (

            f"You scored "
            f"{score_percentage}%. "
            f"You need at least "
            f"{pass_score}% "
            f"to complete this chapter."

        )

    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "passed":
            passed,

        "completed":
            passed,

        "scorePercentage":
            score_percentage,

        "passScore":
            pass_score,

        "correctCount":
            correct_count,

        "totalQuestions":
            total_questions,

        "watchPercentage":
            round(
                watched_percentage,
                2
            ),

        "requiredWatchPercentage":
            required_watch_percentage,

        "newlyUnlockedAchievements":
            newly_unlocked,

        "message":
            message,

        "canRetake":
            True,

    }), 200