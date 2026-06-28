"""
KEY DESIGN DECISION (per your latest instruction):
There is NO invitation token system. The book's main link is shared with
friends directly. When a friend starts writing, we simply create a Friend
row right then — `created_at` is stamped automatically by the database,
which is exactly what gives us correct FCFS ordering with zero extra logic.

The owner can archive (soft-delete) or permanently delete any friend (and
all their pages cascade-delete with them) if something shouldn't be kept.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models, auth
from ..database import get_db

router = APIRouter(prefix="/friends", tags=["friends"])


@router.post("/", response_model=schemas.FriendOut)
def create_friend(payload: schemas.FriendCreate, db: Session = Depends(get_db)):
    """
    PUBLIC endpoint — no auth required. Anyone with the link can call this
    once, the moment they start writing, to register themselves as a
    contributor. This is intentionally the ONLY public write endpoint.
    """
    friend = models.Friend(**payload.model_dump())
    db.add(friend)
    db.commit()
    db.refresh(friend)

    # Every new friend automatically gets one blank starting page,
    # matching your requirement: "Initially, one blank page appears."
    first_page = models.Page(friend_id=friend.id, page_number=1, content="")
    db.add(first_page)
    db.commit()

    return friend


@router.get("/", response_model=List[schemas.FriendWithPagesOut])
def list_friends_fcfs(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    """
    OWNER-ONLY endpoint (note the auth.get_current_owner_email dependency).
    Returns friends ordered by created_at ascending = First Come First Served,
    each with their pages already ordered by page_number (set up in
    models.py's relationship() definition).
    """
    query = db.query(models.Friend).order_by(models.Friend.created_at.asc())
    if not include_archived:
        query = query.filter(models.Friend.is_archived == False)  # noqa: E712
    return query.all()


@router.patch("/{friend_id}/archive")
def archive_friend(
    friend_id: int,
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    friend = db.query(models.Friend).filter(models.Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="Friend not found")
    friend.is_archived = True
    db.commit()
    return {"status": "archived", "friend_id": friend_id}


@router.delete("/{friend_id}")
def delete_friend_permanently(
    friend_id: int,
    db: Session = Depends(get_db),
    current_owner: str = Depends(auth.get_current_owner_email),
):
    friend = db.query(models.Friend).filter(models.Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="Friend not found")
    db.delete(friend)  # cascade="all, delete-orphan" in models.py removes their pages too
    db.commit()
    return {"status": "deleted", "friend_id": friend_id}
