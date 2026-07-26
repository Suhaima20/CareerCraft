from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError


def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.

    Returns:
        Extracted text on success
        ERROR_READING_PDF if PDF is corrupted
        ERROR_ENCRYPTED_PDF if PDF is password protected
        ERROR_EMPTY_PDF if no text could be extracted
        ERROR_UNKNOWN for unexpected errors
    """

    try:
        reader = PdfReader(pdf_path)

        # Check encrypted PDF
        if reader.is_encrypted:
            return "ERROR_ENCRYPTED_PDF"

        extracted_text = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                extracted_text.append(page_text.strip())

        final_text = "\n".join(extracted_text).strip()

        if not final_text:
            return "ERROR_EMPTY_PDF"

        return final_text

    except PdfReadError:
        return "ERROR_READING_PDF"

    except Exception:
        return "ERROR_UNKNOWN"