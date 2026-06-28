from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError

def extract_text_from_pdf(pdf_path):
    try:
        text = ""

        reader = PdfReader(pdf_path)

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text

    except PdfReadError:
        return "ERROR_READING_PDF"

    except Exception as e:
        return f"ERROR: {str(e)}"