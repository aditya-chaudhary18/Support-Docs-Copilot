import io
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page count (Page X of Y)."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 760, "Support Docs Copilot — Grounded Session Export")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(40, 752, letter[0] - 40, 752)

        # Running footer
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawString(letter[0] - 40 - self.stringWidth(page_str, "Helvetica", 8), 28, page_str)
        self.drawString(40, 28, "Confidential • Strictly Grounded in Technical Documentation")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, 38, letter[0] - 40, 38)

        self.restoreState()


def clean_xml_chars(text: str) -> str:
    """Escapes special XML/HTML entities for ReportLab Paragraphs."""
    if not text:
        return ""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Convert markdown bold/code to basic styling
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font face='Courier' color='#0F766E'><b>\1</b></font>", text)
    return text.replace("\n", "<br/>")


def generate_session_pdf(
    title: str,
    session_id: str,
    created_at: Optional[datetime],
    messages: List[Any],
    selected_document_names: Optional[List[str]] = None,
) -> bytes:
    """
    Generates a readable, multi-page PDF document for a chat session adhering to PRD requirements.
    Supports long conversations, word wrapping, page breaks, and citation provenance.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=46,
    )

    base_styles = getSampleStyleSheet()

    # Custom typography styles
    header_style = ParagraphStyle(
        "DocTitle",
        parent=base_styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )

    subhead_style = ParagraphStyle(
        "DocSubtitle",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0284C7"),
        spaceAfter=14,
    )

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )

    meta_val_style = ParagraphStyle(
        "MetaValue",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    turn_header_style = ParagraphStyle(
        "TurnHeader",
        parent=base_styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=12,
        spaceAfter=6,
    )

    user_label_style = ParagraphStyle(
        "UserLabel",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4338CA"),
    )

    user_text_style = ParagraphStyle(
        "UserText",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1E1B4B"),
    )

    asst_label_style = ParagraphStyle(
        "AsstLabel",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F766E"),
    )

    asst_text_style = ParagraphStyle(
        "AsstText",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#0F172A"),
    )

    source_title_style = ParagraphStyle(
        "SourceTitle",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0369A1"),
    )

    source_excerpt_style = ParagraphStyle(
        "SourceExcerpt",
        parent=base_styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # 1. Title Banner
    story.append(Paragraph("SUPPORT DOCS COPILOT", header_style))
    story.append(Paragraph("Strict Grounded Technical Assistant • Provenance &amp; Verification Report", subhead_style))

    # 2. Session Metadata Grid
    export_time_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    created_time_str = created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if created_at else export_time_str
    scope_str = ", ".join(selected_document_names) if selected_document_names else "All Indexed Documents in Knowledge Base"

    meta_table_data = [
        [
            Paragraph("<b>Session Title:</b>", meta_label_style),
            Paragraph(clean_xml_chars(title), meta_val_style),
            Paragraph("<b>Export Date:</b>", meta_label_style),
            Paragraph(export_time_str, meta_val_style),
        ],
        [
            Paragraph("<b>Session ID:</b>", meta_label_style),
            Paragraph(clean_xml_chars(session_id[:18] + "..."), meta_val_style),
            Paragraph("<b>Created Date:</b>", meta_label_style),
            Paragraph(created_time_str, meta_val_style),
        ],
        [
            Paragraph("<b>Document Scope:</b>", meta_label_style),
            Paragraph(clean_xml_chars(scope_str), meta_val_style),
            Paragraph("<b>Grounding Model:</b>", meta_label_style),
            Paragraph("Neon pgvector HNSW + Gemini Flash", meta_val_style),
        ],
    ]

    meta_table = Table(meta_table_data, colWidths=[90, 180, 90, 172])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=14))

    # 3. Turns
    turn = 1
    i = 0
    while i < len(messages):
        msg = messages[i]
        role = getattr(msg, "role", None) or (msg.get("role") if isinstance(msg, dict) else "")
        content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "")

        if role == "user":
            turn_flowables = []
            turn_flowables.append(Paragraph(f"Turn {turn}", turn_header_style))

            # User Question Card
            question_table = Table(
                [
                    [
                        Paragraph("<b>OPERATOR QUESTION</b>", user_label_style),
                    ],
                    [
                        Paragraph(clean_xml_chars(content), user_text_style),
                    ],
                ],
                colWidths=[532],
            )
            question_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EEF2FF")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#C7D2FE")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ])
            )
            turn_flowables.append(question_table)
            turn_flowables.append(Spacer(1, 8))

            # Check if next message is assistant
            if i + 1 < len(messages):
                next_msg = messages[i + 1]
                next_role = getattr(next_msg, "role", None) or (next_msg.get("role") if isinstance(next_msg, dict) else "")
                if next_role == "assistant":
                    asst_content = getattr(next_msg, "content", None) or (next_msg.get("content") if isinstance(next_msg, dict) else "")
                    sources = getattr(next_msg, "sources", None) or (next_msg.get("sources") if isinstance(next_msg, dict) else []) or []

                    asst_table = Table(
                        [
                            [
                                Paragraph("<b>TRACE ASSISTANT SYNTHESIS (GROUNDED)</b>", asst_label_style),
                            ],
                            [
                                Paragraph(clean_xml_chars(asst_content), asst_text_style),
                            ],
                        ],
                        colWidths=[532],
                    )
                    asst_table.setStyle(
                        TableStyle([
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
                            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBF7D0")),
                            ("LEFTPADDING", (0, 0), (-1, -1), 8),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                            ("TOPPADDING", (0, 0), (-1, -1), 6),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ])
                    )
                    turn_flowables.append(asst_table)
                    turn_flowables.append(Spacer(1, 8))

                    # Cited Sources
                    if sources:
                        source_rows = []
                        source_rows.append([
                            Paragraph(f"<b>RETRIEVED GROUNDED PASSAGES ({len(sources)})</b>", meta_label_style)
                        ])
                        for src in sources:
                            src_id = src.get("source_id", "S1")
                            doc_name = src.get("filename") or "Unknown Document"
                            page = src.get("page_number") or 1
                            sec = src.get("section_title") or src.get("source_location") or "Extracted Section"
                            sim = src.get("similarity")
                            sim_str = f" • Match: {round(float(sim) * 100)}%" if sim is not None else ""
                            chunk_id = src.get("chunk_id", "N/A")
                            excerpt = (src.get("excerpt") or "").strip()

                            src_header = f"<b>[{src_id}] {doc_name}</b> — Page {page}, {sec}{sim_str} (Chunk: <code>{chunk_id[:16]}...</code>)"
                            source_rows.append([Paragraph(clean_xml_chars(src_header), source_title_style)])
                            if excerpt:
                                source_rows.append([Paragraph(f"&ldquo;{clean_xml_chars(excerpt[:400])}&rdquo;", source_excerpt_style)])

                        source_table = Table(source_rows, colWidths=[532])
                        source_table.setStyle(
                            TableStyle([
                                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                                ("TOPPADDING", (0, 0), (-1, -1), 4),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                            ])
                        )
                        turn_flowables.append(source_table)
                    else:
                        no_sources_table = Table(
                            [[Paragraph("<i>No retrieved citations associated with this response.</i>", source_excerpt_style)]],
                            colWidths=[532],
                        )
                        turn_flowables.append(no_sources_table)

                    i += 1

            turn_flowables.append(Spacer(1, 10))
            turn_flowables.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

            # Keep short turn elements together where reasonable
            story.append(KeepTogether(turn_flowables[:2]))
            for f in turn_flowables[2:]:
                story.append(f)

            turn += 1
        else:
            i += 1

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
