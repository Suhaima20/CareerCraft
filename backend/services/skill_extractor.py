import spacy
from spacy.matcher import PhraseMatcher

nlp = spacy.load("en_core_web_sm")

# Base skill dictionary (expandable later from DB in Sprint 4)
SKILL_SET = [
    "python", "java", "c", "c++", "sql", "mongodb",
    "flask", "react", "machine learning",
    "data science", "power bi", "excel",
    "communication", "teamwork", "leadership",
    "critical thinking", "problem solving",
    "html", "css", "javascript"
]

# Create PhraseMatcher
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

patterns = [nlp.make_doc(skill) for skill in SKILL_SET]
matcher.add("SKILLS", patterns)


def extract_skills(text):
    doc = nlp(text)

    matches = matcher(doc)

    skills = set()

    for match_id, start, end in matches:
        span = doc[start:end]
        skills.add(span.text.lower())

    return list(skills)