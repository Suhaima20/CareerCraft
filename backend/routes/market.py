from flask import Blueprint, request, jsonify
from collections import Counter
import re

from utils.auth import token_required

# Reuse the SAME live Adzuna job system.
from routes.jobs import fetch_all_jobs


market_bp = Blueprint(
    "market",
    __name__,
    url_prefix="/market"
)


# ============================================================
# COMMON IT SKILLS
# ============================================================
# Used to identify frequently occurring skills from the
# fetched job titles, categories and descriptions.

MARKET_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "angular",
    "node.js",
    "nodejs",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "excel",
    "power bi",
    "tableau",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data analysis",
    "data analytics",
    "pandas",
    "numpy",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "aws",
    "azure",
    "google cloud",
    "cloud computing",
    "docker",
    "kubernetes",
    "devops",
    "git",
    "github",
    "linux",
    "cybersecurity",
    "networking",
    "rest api",
    "api",
    "flask",
    "django",
    "spring",
    "html",
    "css",
    "c++",
    "c#",
    ".net",
    "spark",
    "hadoop",
    "etl",
    "data visualization",
    "agile",
    "jira",
]


# ============================================================
# CAREER SEARCH TERMS
# ============================================================
# These help My Career Market identify related jobs from the
# already-fetched IT job collection.

CAREER_KEYWORDS = {
    "data analyst": [
        "data analyst",
        "data analysis",
        "business analyst",
        "reporting analyst",
        "bi analyst",
        "business intelligence",
    ],

    "data scientist": [
        "data scientist",
        "data science",
        "machine learning",
        "ml scientist",
    ],

    "machine learning engineer": [
        "machine learning engineer",
        "ml engineer",
        "machine learning",
        "artificial intelligence",
        "ai engineer",
    ],

    "software engineer": [
        "software engineer",
        "software developer",
        "application developer",
        "backend developer",
        "frontend developer",
        "full stack developer",
    ],

    "software developer": [
        "software developer",
        "software engineer",
        "application developer",
        "backend developer",
        "frontend developer",
        "full stack developer",
    ],

    "web developer": [
        "web developer",
        "frontend developer",
        "backend developer",
        "full stack developer",
    ],

    "frontend developer": [
        "frontend developer",
        "front end developer",
        "react developer",
        "ui developer",
        "web developer",
    ],

    "backend developer": [
        "backend developer",
        "back end developer",
        "server-side developer",
        "software developer",
    ],

    "full stack developer": [
        "full stack developer",
        "fullstack developer",
        "full-stack developer",
    ],

    "ai engineer": [
        "ai engineer",
        "artificial intelligence engineer",
        "machine learning engineer",
        "machine learning",
    ],

    "cloud engineer": [
        "cloud engineer",
        "cloud developer",
        "aws engineer",
        "azure engineer",
        "cloud computing",
    ],

    "devops engineer": [
        "devops engineer",
        "devops",
        "site reliability engineer",
        "sre",
    ],

    "cybersecurity": [
        "cybersecurity",
        "cyber security",
        "security engineer",
        "information security",
        "soc analyst",
    ],

    "network engineer": [
        "network engineer",
        "network administrator",
        "networking",
    ],

    "database administrator": [
        "database administrator",
        "database admin",
        "dba",
        "database engineer",
    ],

    "qa engineer": [
        "qa engineer",
        "quality assurance",
        "test engineer",
        "software tester",
        "testing",
    ],

    "software tester": [
        "software tester",
        "test engineer",
        "qa engineer",
        "quality assurance",
    ],

    "systems engineer": [
        "systems engineer",
        "system engineer",
        "systems administrator",
    ],

    "it support": [
        "it support",
        "technical support",
        "help desk",
        "desktop support",
        "it technician",
    ],

    "business analyst": [
        "business analyst",
        "business intelligence analyst",
        "data analyst",
        "reporting analyst",
    ],
}


# ============================================================
# NORMALIZATION
# ============================================================

def normalize(value):
    if not value:
        return ""

    return re.sub(
        r"\s+",
        " ",
        str(value).lower()
    ).strip()


# ============================================================
# JOB TEXT
# ============================================================

def job_text(job):
    return normalize(
        " ".join([
            str(job.get("title") or ""),
            str(job.get("category") or ""),
            str(job.get("description") or ""),
            str(job.get("sourceSearch") or ""),
        ])
    )


# ============================================================
# CAREER MATCHING
# ============================================================

def get_career_keywords(career_name):
    career_key = normalize(career_name)

    if career_key in CAREER_KEYWORDS:
        return CAREER_KEYWORDS[career_key]

    # Fall back to the career name itself.
    return [
        career_key
    ] if career_key else []


def matches_career(job, career_name):

    keywords = get_career_keywords(
        career_name
    )

    if not keywords:
        return False

    text = job_text(job)

    return any(
        keyword in text
        for keyword in keywords
    )


# ============================================================
# TOP SKILLS
# ============================================================

def calculate_top_skills(jobs, limit=10):

    counts = Counter()

    for job in jobs:

        text = job_text(job)

        for skill in MARKET_SKILLS:

            if skill in text:

                # Combine node.js / nodejs
                normalized_skill = skill

                if skill == "nodejs":
                    normalized_skill = "node.js"

                counts[
                    normalized_skill
                ] += 1

    return [
        {
            "name": skill,
            "count": count
        }

        for skill, count in counts.most_common(limit)
    ]


# ============================================================
# TOP ROLES
# ============================================================

def calculate_top_roles(jobs, limit=10):

    counts = Counter()

    for job in jobs:

        title = str(
            job.get("title") or ""
        ).strip()

        if not title:
            continue

        counts[title] += 1

    return [
        {
            "name": title,
            "count": count
        }

        for title, count in counts.most_common(limit)
    ]


# ============================================================
# TOP LOCATIONS
# ============================================================

def calculate_top_locations(jobs, limit=10):

    counts = Counter()

    for job in jobs:

        location = str(
            job.get("location") or ""
        ).strip()

        if not location:
            continue

        counts[location] += 1

    return [
        {
            "name": location,
            "count": count
        }

        for location, count in counts.most_common(limit)
    ]


# ============================================================
# TOP COMPANIES
# ============================================================

def calculate_top_companies(jobs, limit=10):

    counts = Counter()

    for job in jobs:

        company = str(
            job.get("company") or ""
        ).strip()

        if not company:
            continue

        if company.lower() == "unknown company":
            continue

        counts[company] += 1

    return [
        {
            "name": company,
            "count": count
        }

        for company, count in counts.most_common(limit)
    ]


# ============================================================
# SALARY SUMMARY
# ============================================================

def calculate_salary(jobs):

    salary_min_values = []
    salary_max_values = []

    for job in jobs:

        salary_min = job.get(
            "salary_min"
        )

        salary_max = job.get(
            "salary_max"
        )

        try:
            if salary_min is not None:
                salary_min_values.append(
                    float(salary_min)
                )
        except (
            ValueError,
            TypeError
        ):
            pass

        try:
            if salary_max is not None:
                salary_max_values.append(
                    float(salary_max)
                )
        except (
            ValueError,
            TypeError
        ):
            pass

    result = {
        "available": bool(
            salary_min_values
            or salary_max_values
        ),
        "min": None,
        "max": None,
        "averageMin": None,
        "averageMax": None,
    }

    if salary_min_values:

        result["min"] = min(
            salary_min_values
        )

        result["averageMin"] = round(
            sum(salary_min_values)
            / len(salary_min_values),
            2
        )

    if salary_max_values:

        result["max"] = max(
            salary_max_values
        )

        result["averageMax"] = round(
            sum(salary_max_values)
            / len(salary_max_values),
            2
        )

    return result


# ============================================================
# MARKET SUMMARY BUILDER
# ============================================================

def build_market_summary(
    jobs,
    market_name,
    career_name=None
):

    salary = calculate_salary(
        jobs
    )

    return {

        "market": market_name,

        "career": career_name,

        "totalJobs": len(jobs),

        "topRoles":
            calculate_top_roles(
                jobs
            ),

        "topSkills":
            calculate_top_skills(
                jobs
            ),

        "topLocations":
            calculate_top_locations(
                jobs
            ),

        "topCompanies":
            calculate_top_companies(
                jobs
            ),

        "salary": salary,

        "jobs": jobs[:10],

        "dataSource":
            "CareerCraft live job listings fetched from Adzuna",

        "note":
            "Market metrics are calculated from the job listings currently fetched by CareerCraft and may not represent the entire Indian job market.",
    }


# ============================================================
# OVERALL INDIAN IT MARKET
# ============================================================
#
# PUBLIC ENDPOINT
#
# Logged-out visitors can access this.
#
# It uses the existing IT_SEARCHES + Adzuna cache from jobs.py.
# ============================================================

@market_bp.route(
    "/overview",
    methods=["GET"]
)
def get_overall_market():

    try:

        jobs = fetch_all_jobs()

        summary = build_market_summary(
            jobs=jobs,
            market_name="Overall Indian IT Market",
        )

        return jsonify(
            summary
        ), 200

    except Exception as e:

        print(
            "Market overview error:",
            str(e)
        )

        return jsonify({
            "market":
                "Overall Indian IT Market",

            "totalJobs": 0,

            "topRoles": [],

            "topSkills": [],

            "topLocations": [],

            "topCompanies": [],

            "salary": {
                "available": False,
                "min": None,
                "max": None,
                "averageMin": None,
                "averageMax": None,
            },

            "jobs": [],

            "available": False,

            "message":
                "Market data is temporarily unavailable."
        }), 200


# ============================================================
# MY CAREER MARKET
# ============================================================
#
# AUTHENTICATED ENDPOINT
#
# The frontend sends the user's selected career name.
# The actual job data still comes from the SAME cached Adzuna
# dataset used by the Jobs page.
# ============================================================

@market_bp.route(
    "/career",
    methods=["GET"]
)
@token_required
def get_career_market():

    career_name = (
        request.args.get(
            "career"
        ) or ""
    ).strip()

    if not career_name:

        return jsonify({
            "message":
                "Career name is required."
        }), 400

    try:

        all_jobs = fetch_all_jobs()

        career_jobs = [
            job
            for job in all_jobs
            if matches_career(
                job,
                career_name
            )
        ]

        summary = build_market_summary(
            jobs=career_jobs,
            market_name="My Career Market",
            career_name=career_name,
        )

        return jsonify(
            summary
        ), 200

    except Exception as e:

        print(
            "Career market error:",
            str(e)
        )

        return jsonify({
            "market":
                "My Career Market",

            "career":
                career_name,

            "totalJobs": 0,

            "topRoles": [],

            "topSkills": [],

            "topLocations": [],

            "topCompanies": [],

            "salary": {
                "available": False,
                "min": None,
                "max": None,
                "averageMin": None,
                "averageMax": None,
            },

            "jobs": [],

            "available": False,

            "message":
                "Career market data is temporarily unavailable."
        }), 200


# ============================================================
# LEGACY STATUS ENDPOINT
# ============================================================
#
# Kept so the existing Dashboard does not break while we
# migrate the Market Intelligence page.
# ============================================================

@market_bp.route(
    "/status",
    methods=["GET"]
)
@token_required
def get_status():

    try:

        jobs = fetch_all_jobs()

        return jsonify({

            "available":
                len(jobs) > 0,

            "trendingJob":
                jobs[0].get("title")
                if jobs
                else None,

            "powerBIConfigured":
                False,

            "dataSource":
                "Adzuna",

            "totalJobs":
                len(jobs),

        }), 200

    except Exception as e:

        print(
            "Market status error:",
            str(e)
        )

        return jsonify({

            "available": False,

            "trendingJob": None,

            "powerBIConfigured": False,

            "dataSource": "Adzuna",

            "totalJobs": 0,

        }), 200