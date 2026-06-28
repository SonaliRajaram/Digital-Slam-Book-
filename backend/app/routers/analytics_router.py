"""
CONCEPT: Derived data, computed on demand.
We discussed this in models.py: we never STORE counts like "total pages" as
a column, because storing a derived number risks it silently drifting out
of sync with reality (e.g. if a delete fails to also decrement a counter).
Instead, every analytics number here is calculated fresh, straight from
the source tables, every time the owner opens the dashboard. For a
slam book's scale (dozens to low hundreds of friends/pages), this is
fast enough that caching would be premature optimization.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    total_friends = db.query(models.Friend).filter(models.Friend.is_archived == False).count()  # noqa: E712
    total_pages = db.query(models.Page).filter(models.Page.is_archived == False).count()  # noqa: E712

    # "Most used music": count how many pages reference each music_url,
    # group by URL, sort descending, take the top one.
    most_used_music = (
        db.query(models.Page.music_url, func.count(models.Page.id).label("uses"))
        .filter(models.Page.music_url.isnot(None))
        .group_by(models.Page.music_url)
        .order_by(func.count(models.Page.id).desc())
        .first()
    )

    recent_friends = (
        db.query(models.Friend)
        .filter(models.Friend.is_archived == False)  # noqa: E712
        .order_by(models.Friend.created_at.desc())
        .limit(5)
        .all()
    )

    pages_with_photos = db.query(models.Page).filter(models.Page.photo_url.isnot(None)).count()

    return {
        "total_friends": total_friends,
        "total_pages": total_pages,
        "average_pages_per_friend": round(total_pages / total_friends, 1) if total_friends else 0,
        "pages_with_photos": pages_with_photos,
        "most_used_music_url": most_used_music[0] if most_used_music else None,
        "most_used_music_count": most_used_music[1] if most_used_music else 0,
        "recent_friends": [
            {"name": f.name, "created_at": f.created_at} for f in recent_friends
        ],
    }
