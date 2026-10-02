"""
Text cleaning and normalization pipeline adhering to PRD Section 6.4 (FR-PROC-02).
Normalizes Unicode (NFKC), standardizes line endings, cleans control chars,
and de-hyphenates words across line breaks while protecting code formatting.
"""

import re
import unicodedata
from typing import List
from backend.app.rag.extractors.base import TextUnit


def clean_text(text: str, is_pdf: bool = False) -> str:
    """
    Cleans and normalizes raw text extracted from documents.
    Preserves paragraph breaks, list markers, and technical terminology.
    """
    if not text:
        return ""

    # 1. Unicode Normalization (NFKC)
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Normalize Line Endings (\r\n and \r -> \n)
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")

    # 3. Strip null bytes and non-printable control characters (keep \n, \t)
    cleaned_chars = [
        ch for ch in normalized
        if ch in ("\n", "\t") or (unicodedata.category(ch)[0] != "C" and ord(ch) >= 32)
    ]
    normalized = "".join(cleaned_chars)

    # 4. De-hyphenate words broken across line breaks in PDFs (e.g., "configu-\nration" -> "configuration")
    if is_pdf:
        normalized = re.sub(r"([A-Za-z]{2,})-\n([A-Za-z]{2,})", r"\1\2", normalized)

    # 5. Collapse excessive whitespace while preserving code blocks and paragraph boundaries
    # Replace 3 or more consecutive newlines with 2 newlines (standard paragraph break)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)

    # Replace multiple horizontal spaces/tabs (outside of newlines) with a single space
    lines = normalized.split("\n")
    processed_lines = []
    for line in lines:
        # Preserve indentation if code-like, otherwise collapse horizontal whitespace
        if line.startswith("    ") or line.startswith("\t"):
            processed_lines.append(line.rstrip())
        else:
            processed_lines.append(re.sub(r"[ \t]+", " ", line).strip())

    result = "\n".join(processed_lines).strip()
    return result


def clean_text_units(units: List[TextUnit], is_pdf: bool = False) -> List[TextUnit]:
    """Applies clean_text to all text units and filters out empty remnants."""
    cleaned_units: List[TextUnit] = []
    for unit in units:
        cleaned_content = clean_text(unit.content, is_pdf=is_pdf)
        if cleaned_content:
            unit.content = cleaned_content
            cleaned_units.append(unit)
    return cleaned_units
