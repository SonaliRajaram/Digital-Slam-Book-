"""
Two audiences:
- OWNER (auth required): add tracks to the library, organized by category.
  "Adding a track" here just means registering its URL + category in the
  database — the actual audio FILE upload reuses /media/upload (same
  validation pipeline), then the returned URL gets passed to POST /music/.
  We don't duplicate upload logic for a second file type.
- FRIENDS (public): browse the library by category to pick a song for
  their page, OR just paste their own external URL — handled entirely on
  the frontend by writing whatever URL they choose into page.music_url via
  the same autosave endpoint pages_router already exposes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, models, auth
from ..database import get_db

router = APIRouter(prefix="/music", tags=["music"])


@router.post("/", response_model=schemas.MusicTrackOut)
def add_track(
    payload: schemas.MusicTrackCreate,
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    track = models.MusicTrack(**payload.model_dump())
    db.add(track)
    db.commit()
    db.refresh(track)
    return track


@router.get("/", response_model=List[schemas.MusicTrackOut])
def list_tracks(category: Optional[str] = None, db: Session = Depends(get_db)):
    """
    PUBLIC — friends need to browse this while choosing a song, so this
    endpoint deliberately has NO auth dependency. Optional ?category=
    filter lets the frontend show "Romantic", "Friendship", etc. tabs.
    """
    query = db.query(models.MusicTrack)
    if category:
        query = query.filter(models.MusicTrack.category == category)
    return query.order_by(models.MusicTrack.category, models.MusicTrack.title).all()


@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(models.MusicTrack.category).distinct().all()
    return [r[0] for r in rows]


@router.delete("/{track_id}")
def delete_track(
    track_id: int,
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    track = db.query(models.MusicTrack).filter(models.MusicTrack.id == track_id).first()
    if track:
        db.delete(track)
        db.commit()
    return {"status": "deleted"}
