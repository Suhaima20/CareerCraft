import re
import spacy

_nlp = None


# ============================================================
# LOAD SPACY
# ============================================================

def get_nlp():
    global _nlp

    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            _nlp = spacy.blank("en")

    return _nlp


# ============================================================
# EXTRACT TEXT FROM PDF
# ============================================================

def extract_text_from_pdf(file_path):
    import pdfplumber

    text = ""

    with pdfplumber.open(file_path) as pdf:

        for page in pdf.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    return text


# ============================================================
# NORMALIZE TEXT
# ============================================================

def normalize_text(text):
    if not text:
        return ""

    text = text.lower()

    # Replace common separators with spaces
    text = re.sub(r"[/|•·]", " ", text)

    # Normalize multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# EXTRACT SKILLS
# ============================================================

def extract_skills_from_text(text, known_skills):

    if not text or not known_skills:
        return []

    normalized_text = normalize_text(text)

    extracted = set()

    # --------------------------------------------------------
    # Build NLP document
    # --------------------------------------------------------

    nlp = get_nlp()
    doc = nlp(text)


    # --------------------------------------------------------
    # Check every CAREER-SPECIFIC skill
    #
    # IMPORTANT:
    #
    # known_skills is already filtered by resume.py
    # according to the user's active career.
    #
    # Therefore:
    #
    # Data Analyst:
    #     SK0201
    #     SK0202
    #     SK0203
    #     SK0204
    #     SK0205
    #
    # Python from Data Engineer (SK0302)
    # will NOT be considered.
    # --------------------------------------------------------

    for skill in known_skills:

        skill_name = (
            skill.get("name")
            or skill.get("Skill name")
            or ""
        ).strip()

        if not skill_name:
            continue

        skill_lower = normalize_text(skill_name)

        if not skill_lower:
            continue


        # ----------------------------------------------------
        # Exact phrase matching
        #
        # Example:
        # "Data visualization"
        # matches:
        # "Power BI and data visualization"
        # ----------------------------------------------------

        pattern = r"(?<!\w)" + re.escape(skill_lower) + r"(?!\w)"

        if re.search(pattern, normalized_text):

            extracted.add(str(skill["_id"]))

            continue


        # ----------------------------------------------------
        # Handle common variations
        #
        # Example:
        # "Python (Basic)"
        # still matches "Python"
        # ----------------------------------------------------

        if skill_lower in normalized_text:

            extracted.add(str(skill["_id"]))

            continue


    # --------------------------------------------------------
    # spaCy entity matching
    #
    # This is supplementary, not the main matching method.
    # --------------------------------------------------------

    for ent in doc.ents:

        entity_text = normalize_text(ent.text)

        if not entity_text:
            continue

        for skill in known_skills:

            skill_name = (
                skill.get("name")
                or skill.get("Skill name")
                or ""
            ).strip()

            if not skill_name:
                continue

            skill_lower = normalize_text(skill_name)

            if skill_lower == entity_text:

                extracted.add(str(skill["_id"]))


    # --------------------------------------------------------
    # Token matching
    #
    # Useful for single-word skills such as:
    #
    # Python
    # Excel
    # SQL
    # Tableau
    #
    # But ONLY among career-specific skills.
    # --------------------------------------------------------

    token_values = set()

    for token in doc:

        token_text = normalize_text(token.text)

        if len(token_text) >= 2:

            token_values.add(token_text)


    for skill in known_skills:

        skill_name = (
            skill.get("name")
            or skill.get("Skill name")
            or ""
        ).strip()

        if not skill_name:
            continue

        skill_lower = normalize_text(skill_name)

        # Only do token comparison for single-word skills
        if " " not in skill_lower:

            if skill_lower in token_values:

                extracted.add(str(skill["_id"]))


    return list(extracted)