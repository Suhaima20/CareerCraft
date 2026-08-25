import requests
from datetime import datetime, timezone

from db import get_collection
from config import Config


# =========================================================
# CAREER → ADZUNA SEARCH TERM
# =========================================================

CAREER_SEARCH_TERMS = {
    "data analyst": "data analyst",
    "data scientist": "data scientist",
    "software engineer": "software engineer",
    "software developer": "software developer",
    "web developer": "web developer",
    "frontend developer": "frontend developer",
    "backend developer": "backend developer",
    "full stack developer": "full stack developer",
    "machine learning engineer": "machine learning engineer",
    "ai engineer": "AI engineer",
    "cloud engineer": "cloud engineer",
    "devops engineer": "DevOps engineer",
    "cybersecurity": "cybersecurity",
    "network engineer": "network engineer",
    "database administrator": "database administrator",
    "qa engineer": "QA engineer",
    "software tester": "software tester",
    "systems engineer": "systems engineer",
    "it support": "IT support",
    "business analyst": "business analyst",
}


# =========================================================
# NORMALIZE CAREER
# =========================================================

def normalize_career(career_name):

    if not career_name:
        return ""

    return career_name.lower().strip()


# =========================================================
# GET SEARCH TERM
# =========================================================

def get_career_search_term(career_name):

    career = normalize_career(
        career_name
    )

    return CAREER_SEARCH_TERMS.get(
        career,
        career
    )


# =========================================================
# FETCH LIVE JOBS FOR USER'S CAREER
# =========================================================

def fetch_notification_jobs(career_name):

    app_id = Config.JOB_DATA_PROVIDER_ID
    app_key = Config.JOB_DATA_PROVIDER_KEY
    provider_url = Config.JOB_DATA_PROVIDER_URL

    # -----------------------------------------------------
    # CHECK CONFIGURATION
    # -----------------------------------------------------

    if not app_id or not app_key or not provider_url:

        print(
            "Adzuna configuration is missing"
        )

        return []

    search_term = get_career_search_term(
        career_name
    )

    if not search_term:

        print(
            "No career search term available"
        )

        return []

    print("\n======================================")
    print("CAREER NOTIFICATION SEARCH")
    print("Career:", career_name)
    print("Search:", search_term)
    print("======================================")

    # =====================================================
    # ONE ADZUNA REQUEST ONLY
    # =====================================================

    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": search_term,
        "page": 1,
        "results_per_page": 10,
        "content-type": "application/json"
    }

    try:

        response = requests.get(
            provider_url,
            params=params,
            timeout=8
        )

        print(
            "Adzuna status:",
            response.status_code
        )

        # -------------------------------------------------
        # ADZUNA ERROR
        # -------------------------------------------------

        if response.status_code != 200:

            print(
                "Adzuna notification error:",
                response.text[:500]
            )

            return []

        # -------------------------------------------------
        # PARSE RESPONSE
        # -------------------------------------------------

        try:

            data = response.json()

        except ValueError:

            print(
                "Invalid JSON returned by Adzuna"
            )

            return []

        results = data.get(
            "results",
            []
        )

        print(
            "Jobs received:",
            len(results)
        )

        # =================================================
        # CONVERT JOBS
        # =================================================

        jobs = []

        seen_ids = set()

        for job in results:

            job_id = str(
                job.get("id", "")
            ).strip()

            if not job_id:
                continue

            # -------------------------------------------------
            # DUPLICATE PROTECTION
            # -------------------------------------------------

            if job_id in seen_ids:
                continue

            seen_ids.add(job_id)

            company = (
                job.get("company") or {}
            )

            location = (
                job.get("location") or {}
            )

            jobs.append({

                "id": job_id,

                "title": job.get(
                    "title",
                    "Job opportunity"
                ),

                "company": company.get(
                    "display_name",
                    "Unknown Company"
                ),

                "location": location.get(
                    "display_name",
                    "India"
                ),

                "description": job.get(
                    "description",
                    ""
                ),

                "externalUrl": job.get(
                    "redirect_url"
                ),

                "created": job.get(
                    "created"
                ),

                "sourceSearch": search_term
            })

        print("--------------------------------------")
        print(
            "Unique career jobs:",
            len(jobs)
        )
        print("--------------------------------------")

        return jobs

    # =====================================================
    # TIMEOUT
    # =====================================================

    except requests.Timeout:

        print(
            "Notification job search timed out."
        )

        return []

    # =====================================================
    # CONNECTION ERROR
    # =====================================================

    except requests.RequestException as e:

        print(
            "Notification Adzuna connection error:",
            str(e)
        )

        return []

    # =====================================================
    # UNEXPECTED ERROR
    # =====================================================

    except Exception as e:

        print(
            "Notification search error:",
            str(e)
        )

        return []


# =========================================================
# CREATE CAREER-SPECIFIC NOTIFICATIONS
# =========================================================

def generate_career_notifications(user):

    career_name = user.get(
        "activeCareerName"
    )

    # -----------------------------------------------------
    # USER HAS NO CAREER
    # -----------------------------------------------------

    if not career_name:

        print(
            "User has no active career."
        )

        return 0

    print("\n======================================")
    print(
        "Checking notifications for:",
        career_name
    )
    print("======================================")

    # =====================================================
    # FETCH LIVE JOBS
    # =====================================================

    jobs = fetch_notification_jobs(
        career_name
    )

    if not jobs:

        print(
            "No live jobs found."
        )

        return 0

    notifications = get_collection(
        "notifications"
    )

    created_count = 0

    # =====================================================
    # PROCESS JOBS
    # =====================================================

    for job in jobs:

        job_id = job.get(
            "id"
        )

        if not job_id:
            continue

        # -------------------------------------------------
        # CHECK DUPLICATE
        # -------------------------------------------------

        existing = notifications.find_one({

            "userId": user["_id"],

            "jobId": job_id

        })

        if existing:

            continue

        # -------------------------------------------------
        # CURRENT TIME
        # -------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        # =================================================
        # CREATE NOTIFICATION
        # =================================================

        notification = {

            "userId": user["_id"],

            "type": "job",

            "title": "New job available",

            "message": (
                f"A new {career_name} "
                f"job is available."
            ),

            "career": career_name,

            "jobId": job_id,

            "jobTitle": job.get(
                "title",
                "Job opportunity"
            ),

            "company": job.get(
                "company",
                "Unknown Company"
            ),

            "location": job.get(
                "location",
                "India"
            ),

            "externalUrl": job.get(
                "externalUrl"
            ),

            "read": False,

            "createdAt": now,

            "updatedAt": now
        }

        notifications.insert_one(
            notification
        )

        created_count += 1

        print(
            "Notification created:",
            job.get("title")
        )

    # =====================================================
    # RESULT
    # =====================================================

    print("--------------------------------------")
    print(
        "New notifications created:",
        created_count
    )
    print("--------------------------------------")

    return created_count