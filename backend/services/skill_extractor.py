import spacy
from spacy.matcher import PhraseMatcher

# Load NLP model
nlp = spacy.load("en_core_web_sm")


# ==============================
# Master Skill Dictionary
# (Later Sprint 4: Move this to MongoDB)
# ==============================

SKILL_SET = [

    # Programming Languages
    "python",
    "java",
    "c",
    "c++",
    "c#",
    "javascript",
    "typescript",
    "php",
    "r",

    # Web Development
    "html",
    "css",
    "react",
    "angular",
    "vue",
    "node.js",
    "express",
    "flask",
    "django",

    # Databases
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "sqlite",

    # Data Science
    "machine learning",
    "deep learning",
    "data science",
    "data analysis",
    "business analytics",
    "statistics",
    "numpy",
    "pandas",
    "matplotlib",
    "scikit-learn",
    "tensorflow",
    "keras",

    # Data Visualization
    "power bi",
    "powerbi",
    "tableau",
    "excel",

    # AI / NLP
    "artificial intelligence",
    "nlp",
    "computer vision",

    # Cloud / DevOps
    "aws",
    "azure",
    "google cloud",
    "docker",
    "kubernetes",

    # Version Control
    "git",
    "github",

    # Tools
    "postman",
    "jira",
    "tally",
    "microsoft office",
    "ms office",
    "word",
    "outlook",

    # Operating Systems
    "linux",
    "windows",

    # Soft Skills
    "communication",
    "teamwork",
    "leadership",
    "critical thinking",
    "problem solving",
    "time management",
    "adaptability",
    "presentation",
    "decision making"
]


# ==============================
# Create Phrase Matcher
# ==============================

matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

patterns = [
    nlp.make_doc(skill)
    for skill in SKILL_SET
]

matcher.add("SKILLS", patterns)


# ==============================
# Skill Extraction Function
# ==============================

def extract_skills(text):
    """
    Extract skills from resume text using spaCy PhraseMatcher.
    """

    doc = nlp(text)

    matches = matcher(doc)

    skills = set()

    for _, start, end in matches:

        skill = doc[start:end].text.lower().strip()

        # Normalization
        if skill in ["ms excel"]:
            skill = "excel"

        if skill in ["powerbi"]:
            skill = "power bi"

        if skill in ["ms office", "microsoft office"]:
            skill = "microsoft office"

        if skill == "node":
            skill = "node.js"

        skills.add(skill)


    return sorted(list(skills))