"""
Defines our database tables as Python classes.

ER DIAGRAM (text form, since this file can't draw):

  Owner (1) ------ (1) SlamBook
                          |
                          | (1 to many)
                          v
                       Friend  --(1 to many)-->  Page

WHY this shape?
- One Owner per slam book (you only need one account).
- A Friend belongs to exactly one slam book (foreign key: slam_book_id).
- A Page belongs to exactly one Friend (foreign key: friend_id).
- Pages are ordered WITHIN a friend by `page_number`.
- Friends are ordered relative to EACH OTHER by `created_at`
  (the timestamp their first page was created) -> this is what gives us
  First-Come-First-Served ordering without needing a separate "queue" table.

NORMALIZATION NOTE:
We don't store "total pages" or "friend count" as columns anywhere, because
those are *derived* data (you can always calculate them with a COUNT() query).
Storing derived data risks it going out of sync with reality. We'll compute
these live in the analytics endpoint instead.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Owner(Base):
    __tablename__ = "owners"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)

    # We NEVER store plain-text passwords. This column holds a bcrypt HASH,
    # which is a one-way scramble: easy to verify against, impossible to
    # reverse back into the original password. More on this in auth.py.
    hashed_password = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Friend(Base):
    __tablename__ = "friends"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    department = Column(String, nullable=True)
    relationship_to_owner = Column(String, nullable=True)
    year_met = Column(String, nullable=True)

    # This timestamp is what determines FCFS order. It's set automatically
    # the moment a friend's record is first created (i.e. when they start
    # writing their very first page) — nobody can manually fake an earlier
    # position, because the database itself stamps the time.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Soft delete: instead of permanently destroying a row the instant
    # someone clicks "delete", we flag it. This protects you from accidental
    # data loss and is standard industry practice ("archive, don't annihilate").
    is_archived = Column(Boolean, default=False)

    # `relationship()` is SQLAlchemy magic that lets us write
    # `some_friend.pages` in Python and get a list of Page objects back,
    # instead of writing a manual SQL JOIN every time.
    pages = relationship(
        "Page",
        back_populates="friend",
        cascade="all, delete-orphan",   # deleting a friend deletes their pages too
        order_by="Page.page_number",
    )


class MusicTrack(Base):
    __tablename__ = "music_tracks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)  # Romantic, Friendship, Funny, etc.
    url = Column(String, nullable=False)  # uploaded file URL or pasted YouTube/external URL
    uploaded_by_owner = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    friend_id = Column(Integer, ForeignKey("friends.id"), nullable=False, index=True)

    # Position of this page WITHIN this friend's set of pages (1, 2, 3...).
    page_number = Column(Integer, nullable=False)

    content = Column(Text, nullable=True)        # the written message
    photo_url = Column(String, nullable=True)     # set later once media upload exists
    music_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    is_archived = Column(Boolean, default=False)

    friend = relationship("Friend", back_populates="pages")
