import re

def clean_text(text: str) -> str:
    """
    Clean resume text before NLP processing
    """

    if not text:
        return ""

    # Convert multiple spaces/newlines into single space
    text = re.sub(r'\s+', ' ', text)

    # Remove special characters but keep important separators
    text = re.sub(r'[^a-zA-Z0-9.,+/#&()\- ]', ' ', text)

    # Remove extra dots and symbols
    text = re.sub(r'\.{2,}', ' ', text)

    # Normalize spacing again
    text = text.strip()

    return text