from flask import Blueprint, request, jsonify
from config import Config
from utils.auth import token_required

import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import threading


jobs_bp = Blueprint("jobs", __name__, url_prefix="/jobs")


# =========================================================
# IT / ENGINEERING JOB SEARCHES
# =========================================================

IT_SEARCHES = [
    "software engineer",
    "software developer",
    "web developer",
    "frontend developer",
    "backend developer",
    "full stack developer",
    "data analyst",
    "data scientist",
    "machine learning engineer",
    "AI engineer",
    "cloud engineer",
    "DevOps engineer",
    "cybersecurity",
    "network engineer",
    "database administrator",
    "QA engineer",
    "software tester",
    "systems engineer",
    "IT support",
    "business analyst",
]


# =========================================================
# SIMPLE SERVER-SIDE CACHE
#
# This prevents every page click from calling Adzuna again.
# Cache expires after 5 minutes.
# =========================================================

_jobs_cache = {
    "jobs": [],
    "created_at": None
}

_cache_lock = threading.Lock()

CACHE_SECONDS = 300


# =========================================================
# FETCH ONE SEARCH FROM ADZUNA
# =========================================================

def fetch_adzuna_search(search_term):

    app_id = Config.JOB_DATA_PROVIDER_ID
    app_key = Config.JOB_DATA_PROVIDER_KEY
    provider_url = Config.JOB_DATA_PROVIDER_URL

    params = {
        "app_id": app_id,
        "app_key": app_key,
        "what": search_term
    }

    try:

        print(f"Searching Adzuna: {search_term}")

        response = requests.get(
            provider_url,
            params=params,
            timeout=15
        )

        print(
            f"Adzuna status [{search_term}]:",
            response.status_code
        )

        if response.status_code != 200:

            print(
                f"Skipping failed search: {search_term}"
            )

            return []

        try:
            data = response.json()
        except ValueError:

            print(
                f"Invalid JSON for: {search_term}"
            )

            return []

        results = data.get("results", [])

        print(
            f"Jobs received [{search_term}]:",
            len(results)
        )

        jobs = []

        for job in results:

            job_id = str(
                job.get("id", "")
            ).strip()

            if not job_id:
                continue

            company_data = (
                job.get("company") or {}
            )

            location_data = (
                job.get("location") or {}
            )

            category_data = (
                job.get("category") or {}
            )

            external_url = job.get(
                "redirect_url"
            )

            jobs.append({

                # -------------------------------------------------
                # IDs
                # -------------------------------------------------

                "id": job_id,

                "_id": job_id,

                # -------------------------------------------------
                # BASIC INFORMATION
                # -------------------------------------------------

                "title": job.get(
                    "title",
                    "Job opportunity"
                ),

                "company": company_data.get(
                    "display_name",
                    "Unknown Company"
                ),

                "location": location_data.get(
                    "display_name",
                    "India"
                ),

                "category": category_data.get(
                    "label",
                    ""
                ),

                # -------------------------------------------------
                # DESCRIPTION
                # -------------------------------------------------

                "description": job.get(
                    "description",
                    ""
                ),

                # -------------------------------------------------
                # APPLY URL
                # -------------------------------------------------

                "externalUrl": external_url,

                "url": external_url,

                # -------------------------------------------------
                # DATE
                # -------------------------------------------------

                "created": job.get(
                    "created"
                ),

                "postedDate": job.get(
                    "created"
                ),

                # -------------------------------------------------
                # SALARY
                # -------------------------------------------------

                "salary_min": job.get(
                    "salary_min"
                ),

                "salary_max": job.get(
                    "salary_max"
                ),

                # -------------------------------------------------
                # CONTRACT
                # -------------------------------------------------

                "contract_time": job.get(
                    "contract_time"
                ),

                "contract_type": job.get(
                    "contract_type"
                ),

                # -------------------------------------------------
                # SEARCH SOURCE
                # -------------------------------------------------

                "sourceSearch": search_term
            })

        return jobs

    except requests.RequestException as e:

        print(
            f"Adzuna connection error "
            f"[{search_term}]: {str(e)}"
        )

        return []

    except Exception as e:

        print(
            f"Unexpected search error "
            f"[{search_term}]: {str(e)}"
        )

        return []


# =========================================================
# CHECK CACHE
# =========================================================

def get_cached_jobs():

    with _cache_lock:

        if not _jobs_cache["jobs"]:
            return None

        created_at = _jobs_cache["created_at"]

        if not created_at:
            return None

        age = (
            datetime.now(timezone.utc)
            - created_at
        ).total_seconds()

        if age < CACHE_SECONDS:

            print(
                "Using cached IT / Engineering jobs"
            )

            return list(
                _jobs_cache["jobs"]
            )

        print(
            "Job cache expired"
        )

        return None


# =========================================================
# SAVE JOBS TO CACHE
# =========================================================

def save_jobs_to_cache(jobs):

    with _cache_lock:

        _jobs_cache["jobs"] = list(jobs)

        _jobs_cache["created_at"] = (
            datetime.now(timezone.utc)
        )

        print(
            "IT / Engineering jobs cached"
        )


# =========================================================
# FETCH ALL IT / ENGINEERING JOBS
# =========================================================

def fetch_all_jobs():

    # ---------------------------------------------------------
    # First check cache
    # ---------------------------------------------------------

    cached_jobs = get_cached_jobs()

    if cached_jobs is not None:

        return cached_jobs

    print("\n======================================")
    print("FETCHING LIVE IT / ENGINEERING JOBS")
    print(
        "Parallel searches:",
        len(IT_SEARCHES)
    )
    print("======================================")

    all_jobs = []

    # ---------------------------------------------------------
    # Run searches in parallel
    # ---------------------------------------------------------

    with ThreadPoolExecutor(
        max_workers=10
    ) as executor:

        future_map = {
            executor.submit(
                fetch_adzuna_search,
                search_term
            ): search_term

            for search_term in IT_SEARCHES
        }

        for future in as_completed(
            future_map
        ):

            search_term = future_map[
                future
            ]

            try:

                jobs = future.result()

                all_jobs.extend(jobs)

            except Exception as e:

                print(
                    f"Search failed "
                    f"[{search_term}]: {str(e)}"
                )

    # =========================================================
    # REMOVE DUPLICATES
    # =========================================================

    unique_jobs = {}

    for job in all_jobs:

        job_id = job.get("id")

        if not job_id:
            continue

        if job_id not in unique_jobs:

            unique_jobs[job_id] = job

    all_jobs = list(
        unique_jobs.values()
    )

    # =========================================================
    # SORT BY POSTED DATE
    # =========================================================

    all_jobs.sort(
        key=lambda job: (
            job.get("created") or ""
        ),
        reverse=True
    )

    print("\n======================================")
    print(
        "Unique IT jobs:",
        len(all_jobs)
    )
    print("======================================")

    # ---------------------------------------------------------
    # Save in cache
    # ---------------------------------------------------------

    save_jobs_to_cache(
        all_jobs
    )

    return all_jobs


# =========================================================
# JOBS API
# =========================================================

@jobs_bp.route("", methods=["GET"])
@token_required
def list_jobs():

    # =========================================================
    # CHECK CONFIGURATION
    # =========================================================

    app_id = Config.JOB_DATA_PROVIDER_ID
    app_key = Config.JOB_DATA_PROVIDER_KEY
    provider_url = Config.JOB_DATA_PROVIDER_URL

    if (
        not app_id
        or not app_key
        or not provider_url
    ):

        return jsonify({

            "jobs": [],

            "totalPages": 1,

            "total": 0,

            "available": False,

            "message":
                "Adzuna configuration is missing"

        }), 200

    # =========================================================
    # SEARCH QUERY
    # =========================================================

    search_query = (
        request.args.get("q") or ""
    ).strip()

    # =========================================================
    # LIMIT
    # =========================================================

    try:

        limit = int(
            request.args.get(
                "limit",
                10
            )
        )

        limit = max(
            1,
            min(limit, 20)
        )

    except (
        ValueError,
        TypeError
    ):

        limit = 10

    # =========================================================
    # PAGE
    # =========================================================

    try:

        page = int(
            request.args.get(
                "page",
                1
            )
        )

        page = max(
            1,
            page
        )

    except (
        ValueError,
        TypeError
    ):

        page = 1

    # =========================================================
    # SEARCH MODE
    #
    # If user enters something:
    #     Search only that keyword.
    #
    # If search is empty:
    #     Use all IT / Engineering categories.
    # =========================================================

    if search_query:

        print("\n======================================")
        print(
            "SEARCHING FOR:",
            search_query
        )
        print("======================================")

        jobs = fetch_adzuna_search(
            search_query
        )

        # Remove duplicate IDs

        unique_jobs = {}

        for job in jobs:

            job_id = job.get("id")

            if job_id:
                unique_jobs[job_id] = job

        jobs = list(
            unique_jobs.values()
        )

        # Sort by newest

        jobs.sort(
            key=lambda job: (
                job.get("created") or ""
            ),
            reverse=True
        )

    else:

        # -----------------------------------------------------
        # Get cached/live IT jobs
        # -----------------------------------------------------

        jobs = fetch_all_jobs()

    # =========================================================
    # PAGINATION
    # =========================================================

    total = len(jobs)

    total_pages = max(
        1,
        (total + limit - 1)
        // limit
    )

    # Prevent invalid page

    if page > total_pages:

        page = total_pages

    start = (
        page - 1
    ) * limit

    end = start + limit

    paginated_jobs = jobs[
        start:end
    ]

    # =========================================================
    # LOG
    # =========================================================

    print("\n======================================")
    print(
        "CareerCraft Jobs API"
    )
    print(
        "Query:",
        search_query or "IT & Engineering"
    )
    print(
        "Total:",
        total
    )
    print(
        "Returning:",
        len(paginated_jobs)
    )
    print(
        "Page:",
        page,
        "/",
        total_pages
    )
    print("======================================")

    # =========================================================
    # RESPONSE
    # =========================================================

    return jsonify({

        "jobs": paginated_jobs,

        "totalPages": total_pages,

        "total": total,

        "available": total > 0,

        "query":
            search_query
            or "IT & Engineering",

        "page": page

    }), 200