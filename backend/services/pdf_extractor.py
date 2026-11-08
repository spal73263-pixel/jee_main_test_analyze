import re
from typing import Dict, Any, List, Optional
import pdfplumber

def extract_text_and_tables_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Extracts structured text lines and tables across all pages of a PDF result report.
    """
    all_text = ""
    pages_text = []
    tables = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                pages_text.append(text)
                all_text += f"\n--- Page {page_idx + 1} ---\n" + text
                
                # Extract tables if present
                page_tables = page.extract_tables()
                if page_tables:
                    for t in page_tables:
                        # Clean table rows
                        cleaned_table = []
                        for row in t:
                            if row and any(cell is not None and str(cell).strip() for cell in row):
                                cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                                cleaned_table.append(cleaned_row)
                        if cleaned_table:
                            tables.append(cleaned_table)
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return {"raw_text": "", "pages": [], "tables": [], "error": str(e)}

    return {
        "raw_text": all_text,
        "pages": pages_text,
        "tables": tables,
        "error": None
    }
