"""
Unit tests for text extractors, text cleaner, and structure-aware chunker.
Adheres to PRD Sections 6.4, 7.1, 8.
"""

import io
import docx
import pypdf
import pytest
from backend.app.rag.extractors import get_extractor, TextUnit
from backend.app.rag.cleaner import clean_text, clean_text_units
from backend.app.rag.chunker import DocumentChunker
from backend.app.core.errors import AppException


def test_clean_text_normalization():
    raw = "Hello\tWorld!\r\nThis is a test-\nline with   excessive  spaces.\x00\x08"
    cleaned = clean_text(raw, is_pdf=True)
    assert "Hello World!" in cleaned
    assert "testline" in cleaned  # De-hyphenated
    assert "\x00" not in cleaned
    assert "\r" not in cleaned


def test_markdown_extractor():
    md_content = """# Overview
This is an overview of the platform.

## Installation
Run `npm install` to install dependencies.

```bash
docker-compose up -d
```
"""
    extractor = get_extractor("md")
    units = extractor.extract(md_content.encode("utf-8"), "guide.md")
    assert len(units) >= 2
    assert units[0].section_title == "Overview"
    assert "platform" in units[0].content
    assert units[1].section_title == "Installation"
    assert "docker-compose up -d" in units[1].content


def test_txt_extractor():
    txt_content = "Paragraph 1 line 1.\nParagraph 1 line 2.\n\nParagraph 2 line 1."
    extractor = get_extractor("txt")
    units = extractor.extract(txt_content.encode("utf-8"), "notes.txt")
    assert len(units) == 2
    assert "Paragraph 1" in units[0].content
    assert "Lines 1–2" in units[0].source_location
    assert "Paragraph 2" in units[1].content


def test_pdf_extractor_page_aware():
    # Build a 2-page in-memory PDF
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    extractor = get_extractor("pdf")
    # Empty blank pages should raise NO_EXTRACTABLE_TEXT
    with pytest.raises(AppException) as exc:
        extractor.extract(pdf_bytes, "blank.pdf")
    assert exc.value.code == "NO_EXTRACTABLE_TEXT"


def test_chunker_deterministic():
    chunker = DocumentChunker(chunk_size=200, chunk_overlap=30, min_chunk_chars=20)
    units = [
        TextUnit(content="Short introductory sentence.", page_number=1, source_location="Page 1"),
        TextUnit(
            content="This is a much longer paragraph intended to test splitting boundaries across multiple chunks. " * 3,
            page_number=2,
            source_location="Page 2",
        ),
    ]

    chunks = chunker.chunk_units(units)
    assert len(chunks) >= 2

    # Verify PDF page boundaries are strictly preserved (no chunk has mixed page numbers)
    assert chunks[0].page_number == 1
    assert chunks[0].source_location == "Page 1"
    for c in chunks[1:]:
        assert c.page_number == 2
        assert c.source_location == "Page 2"


def test_chunker_invalid_overlap_raises():
    with pytest.raises(ValueError):
        DocumentChunker(chunk_size=100, chunk_overlap=150)


def test_pdf_extractor_multi_page_text():
    import reportlab.pdfgen.canvas as rcanvas
    buf = io.BytesIO()
    c = rcanvas.Canvas(buf)
    c.drawString(100, 750, "This is page one documentation content for testing Trace.")
    c.showPage()
    c.drawString(100, 750, "This is page two architectural design specification.")
    c.showPage()
    c.save()
    pdf_bytes = buf.getvalue()

    extractor = get_extractor("pdf")
    units = extractor.extract(pdf_bytes, "multi.pdf")
    assert len(units) == 2
    assert units[0].page_number == 1
    assert "page one documentation content" in units[0].content
    assert units[1].page_number == 2
    assert "page two architectural design" in units[1].content


def test_cleaner_preserves_technical_content_and_urls():
    raw = """
    Check API documentation at https://api.trace.dev/v1/health.

    Here is code:

    def process_data(token: str) -> bool:
        return True
    """
    cleaned = clean_text(raw)
    assert "https://api.trace.dev/v1/health" in cleaned
    assert "def process_data(token: str) -> bool:" in cleaned

