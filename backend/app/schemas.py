"""
These are NOT database models. They are "Pydantic schemas" — they define
the shape of data going INTO and OUT OF your API.

WHY separate from models.py?
Your database table might have columns you NEVER want to expose over the
network (e.g. hashed_password). Schemas let you control exactly what's
visible to the outside world. This separation is a core industry practice
called "not leaking your persistence layer through your API."

Pydantic also automatically VALIDATES incoming data — if a friend's name
is missing, FastAPI rejects the request with a clear error before your
code even runs. This is "input validation" done for you, for free.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ---------- Owner / Auth ----------

class OwnerCreate(BaseModel):
    email: EmailStr
    password: str


class OwnerLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Friend ----------

class FriendCreate(BaseModel):
    name: str
    nickname: Optional[str] = None
    department: Optional[str] = None
    relationship_to_owner: Optional[str] = None
    year_met: Optional[str] = None


class FriendOut(BaseModel):
    id: int
    name: str
    nickname: Optional[str]
    department: Optional[str]
    relationship_to_owner: Optional[str]
    year_met: Optional[str]
    created_at: datetime
    is_archived: bool

    class Config:
        # Lets Pydantic read data directly off SQLAlchemy objects,
        # not just plain dictionaries.
        from_attributes = True


# ---------- Page ----------

class PageCreate(BaseModel):
    content: Optional[str] = None
    photo_url: Optional[str] = None
    music_url: Optional[str] = None


class PageUpdate(BaseModel):
    # All optional: autosave might only be updating the text, for example.
    content: Optional[str] = None
    photo_url: Optional[str] = None
    music_url: Optional[str] = None


class PageOut(BaseModel):
    id: int
    friend_id: int
    page_number: int
    content: Optional[str]
    photo_url: Optional[str]
    music_url: Optional[str]
    updated_at: Optional[datetime]
    is_archived: bool

    class Config:
        from_attributes = True


class FriendWithPagesOut(FriendOut):
    pages: list[PageOut] = []


# ---------- Music ----------

class MusicTrackCreate(BaseModel):
    title: str
    category: str
    url: str


class MusicTrackOut(BaseModel):
    id: int
    title: str
    category: str
    url: str
    created_at: datetime

    class Config:
        from_attributes = True
