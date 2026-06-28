"""
Sets up the connection to our database.

WHY SQLAlchemy?
SQLAlchemy is Python's most widely used ORM (Object Relational Mapper).
Instead of writing raw SQL like:
    SELECT * FROM friends WHERE id = 1
...we write Python classes, and SQLAlchemy translates them into SQL for us.
This makes the code portable: today we use SQLite (a single file, zero setup,
perfect for development). In production we just change ONE line (DATABASE_URL)
to point to PostgreSQL, and everything else keeps working unchanged.

WHY SQLite for dev / PostgreSQL for production?
- SQLite: no server to install, the whole DB is one file (slam_book.db).
  Great for fast local development.
- PostgreSQL: handles many simultaneous users, has stronger data integrity
  features, and is what almost every serious production app uses.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# In production, this comes from an environment variable (a secret you set
# on the hosting platform, never hard-coded in source code).
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./slam_book.db")

# connect_args is only needed for SQLite (it disallows multi-thread access
# by default; FastAPI is multi-threaded, so we relax that restriction here).
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# A "session" is a single conversation with the database: open, do work, close.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class every database model (table) will inherit from.
Base = declarative_base()


def get_db():
    """
    This is a FastAPI 'dependency'. FastAPI calls this for every request
    that needs database access, hands the session to your endpoint function,
    and guarantees the session is closed afterward (even if an error happens).
    This pattern prevents connection leaks.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
