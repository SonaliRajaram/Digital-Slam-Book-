"""
CONCEPT: Why generate the PDF on the SERVER, not in the browser?
You could use a browser JS library to "print" the page to PDF, but that
captures whatever's currently rendered (fonts that loaded, animations
mid-frame, etc.) — unreliable. Generating it server-side from the raw
database content guarantees a clean, consistent, complete document every
single time, regardless of what the owner's browser happens to be doing.

We use ReportLab here: a pure-Python PDF library, no external binary
dependencies (unlike wkhtmltopdf/Chromium-based tools), which keeps your
deployment simple — important since you're deploying on free hosting tiers
with limited build minutes/disk.
"""

import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    friends = (
        db.query(models.Friend)
        .filter(models.Friend.is_archived == False)  # noqa: E712
        .order_by(models.Friend.created_at.asc())  # FCFS, same ordering as the dashboard
        .all()
    )

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A5)
    width, height = A5
    margin = 1.5 * cm

    for friend in friends:
        pages = [p for p in friend.pages if not p.is_archived]
        for page in pages:
            # --- Header for this page: who wrote it ---
            c.setFont("Helvetica-Bold", 13)
            c.drawString(margin, height - margin, friend.name)
            c.setFont("Helvetica", 9)
            subtitle = friend.department or ""
            c.drawString(margin, height - margin - 0.5 * cm, subtitle)

            # --- Body text, wrapped manually since ReportLab doesn't
            # auto-wrap long strings for us ---
            c.setFont("Helvetica", 11)
            text_obj = c.beginText(margin, height - margin - 1.5 * cm)
            text_obj.setLeading(14)
            content = page.content or "(blank page)"
            max_chars_per_line = 48
            for raw_line in content.split("\n"):
                while len(raw_line) > max_chars_per_line:
                    text_obj.textLine(raw_line[:max_chars_per_line])
                    raw_line = raw_line[max_chars_per_line:]
                text_obj.textLine(raw_line)
            c.drawText(text_obj)

            c.setFont("Helvetica-Oblique", 7)
            c.drawString(margin, margin / 2, f"Page {page.page_number}")

            c.showPage()  # finalize this PDF page, start a new one

    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=slam_book.pdf"},
    )
