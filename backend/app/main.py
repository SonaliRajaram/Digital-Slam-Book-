"""
The entry point. Running `uvicorn app.main:app --reload` starts the server.

CONCEPT: CORS (Cross-Origin Resource Sharing)
Your frontend (e.g. http://localhost:3000) and backend (http://localhost:8000)
run on different "origins" during development (different ports = different
origin, by browser rules). Browsers BLOCK requests between different origins
by default, as a security measure to stop malicious sites from silently
calling random APIs on your behalf. CORSMiddleware tells the browser
"these specific origins are allowed to talk to me."

In production you'll replace allow_origins with your real deployed
frontend URL — never leave it as "*" (allow everyone) once real user data
is involved.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import (
    auth_router,
    friends_router,
    pages_router,
    media_router,
    music_router,
    analytics_router,
    pdf_router,
)

# Creates all tables defined in models.py if they don't already exist.
# In a real production deploy you'd eventually replace this with Alembic
# migrations (covered in a later milestone) so schema changes are tracked
# and reversible — but for development, this is the standard quick start.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Digital Slam Book API",
    description="Backend powering the Digital Slam Book project.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # local Next.js dev server
        # add your deployed frontend URL here once hosted, e.g.:
        # "https://your-slam-book.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(friends_router.router)
app.include_router(pages_router.router)
app.include_router(media_router.router)
app.include_router(music_router.router)
app.include_router(analytics_router.router)
app.include_router(pdf_router.router)

# Serves anything in ./static at the URL path /static — this is what makes
# LocalStorage's returned URLs (http://localhost:8000/static/uploads/xyz.jpg)
# actually resolve to a real image in development. In production with
# Cloudinary, this mount is simply unused (Cloudinary serves its own URLs).
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "digital-slam-book-api"}
