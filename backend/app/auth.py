"""
Handles everything about proving "you are the Owner."

CONCEPT: Why hash passwords?
If our database is ever leaked or stolen, plain-text passwords would let
an attacker log in as you on every other site where you reused that
password. A hash is a one-way mathematical scramble: we store the scramble,
never the original. When you log in, we scramble what you typed and check
if the scrambles match — we never need to "unscramble" anything.

We use bcrypt specifically (via passlib) because it's deliberately SLOW.
That sounds bad, but it's a feature: it makes brute-force password
guessing attacks computationally expensive for an attacker, while staying
fast enough (milliseconds) to be invisible to a real user logging in.

CONCEPT: Why JWT (JSON Web Tokens) instead of server-side sessions?
A session normally requires the server to remember "this session ID
belongs to this user" in memory or a database. A JWT instead packs the
user's identity into a signed token that the CLIENT holds (e.g. in
localStorage or an HttpOnly cookie). The server can verify the token's
signature without looking anything up — this is called being "stateless,"
and it's what lets your API scale horizontally (across multiple servers)
with zero extra coordination.

The trade-off: a JWT can't be instantly "revoked" the way deleting a
session row can. We accept this for v1, and use SHORT expiry times to
limit the blast radius if a token is ever stolen.
"""

from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os

# In production this MUST come from an environment variable / secret —
# never committed to source control. If this value leaks, anyone can
# forge valid tokens.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours, generous for an owner-only app

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Tells FastAPI's auto-docs (Swagger UI) where to send a login request to
# get a token, and tells FastAPI to look for "Authorization: Bearer <token>"
# headers on protected routes.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_owner_email(token: str = Depends(oauth2_scheme)) -> str:
    """
    A FastAPI dependency. Add `current_owner: str = Depends(get_current_owner_email)`
    to any endpoint's parameters, and FastAPI will automatically:
      1. Extract the bearer token from the request header
      2. Verify its signature and expiry
      3. Reject the request with 401 Unauthorized if anything is invalid
      4. Otherwise hand your endpoint the owner's email
    This is how we protect owner-only routes (dashboard, delete, etc.)
    without repeating auth-checking code in every single endpoint.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception
