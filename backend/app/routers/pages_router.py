"""
Everything about individual pages: adding a new blank page, autosaving
content into one, deleting one, and renumbering afterward.

CONCEPT: Why is autosave just a PATCH, not anything fancier?
Autosave does NOT need websockets or special infrastructure. The frontend
simply calls this same PATCH endpoint every few seconds (or a few seconds
after the friend stops typing — called "debouncing", we'll wire that up on
the frontend side). Each call fully overwrites that page's content with
the latest draft. Because PATCH is naturally "idempotent enough" here
(calling it twice with the same data has the same end result), this is
safe to call repeatedly without special handling.

CONCEPT: Why renumber pages after a delete?
If a friend has pages [1, 2, 3] and deletes page 2, leaving [1, 3] would
break "Next/Previous" navigation logic on the frontend (it would expect
page_number to always increase by exactly 1). So after any delete, we
re-number the remaining pages to stay sequential. This is wrapped in a
single database transaction — if anything fails halfway, ALL changes roll
back together, so we never end up with corrupted, inconsistent numbering.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db

router = APIRouter(prefix="/pages", tags=["pages"])


@router.post("/friend/{friend_id}", response_model=schemas.PageOut)
def add_new_page(friend_id: int, db: Session = Depends(get_db)):
    """
    PUBLIC — the friend who is currently writing calls this when they
    click "Add New Page". No owner auth needed; we only need to know
    which friend_id this page belongs to (the frontend already knows this
    from the friend record it created at the start).
    """
    friend = db.query(models.Friend).filter(models.Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="Friend not found")

    current_max = (
        db.query(models.Page)
        .filter(models.Page.friend_id == friend_id, models.Page.is_archived == False)  # noqa: E712
        .count()
    )
    new_page = models.Page(friend_id=friend_id, page_number=current_max + 1, content="")
    db.add(new_page)
    db.commit()
    db.refresh(new_page)
    return new_page


@router.patch("/{page_id}", response_model=schemas.PageOut)
def autosave_page(page_id: int, payload: schemas.PageUpdate, db: Session = Depends(get_db)):
    """
    PUBLIC — called repeatedly by the frontend's autosave timer.
    Only updates fields that were actually sent (others stay untouched),
    using Pydantic's exclude_unset so a partial save never wipes out
    other fields by accident.
    """
    page = db.query(models.Page).filter(models.Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(page, field, value)

    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}")
def delete_page(page_id: int, db: Session = Depends(get_db)):
    """
    PUBLIC by design: per your latest requirement, the friend writing (or
    you, the owner, from the dashboard) should be able to delete a page
    without friction. We then renumber the remaining pages of that same
    friend so navigation stays sequential — all inside one transaction.
    """
    page = db.query(models.Page).filter(models.Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    friend_id = page.friend_id
    db.delete(page)
    db.flush()  # apply the delete within the transaction before renumbering

    remaining = (
        db.query(models.Page)
        .filter(models.Page.friend_id == friend_id)
        .order_by(models.Page.page_number.asc())
        .all()
    )
    for index, p in enumerate(remaining, start=1):
        p.page_number = index

    db.commit()
    return {"status": "deleted", "page_id": page_id, "remaining_pages": len(remaining)}


@router.get("/friend/{friend_id}", response_model=list[schemas.PageOut])
def list_pages_for_friend(friend_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Page)
        .filter(models.Page.friend_id == friend_id, models.Page.is_archived == False)  # noqa: E712
        .order_by(models.Page.page_number.asc())
        .all()
    )
