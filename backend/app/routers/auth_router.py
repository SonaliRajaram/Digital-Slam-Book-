"""
Two endpoints: register the owner (run once, ever), and log in.

WHY only one owner can ever register in practice:
We don't strictly block a second signup at the database level here (you
could add a uniqueness check on "only 1 row allowed" later), but in
practice your frontend will simply never expose a public "sign up" page —
you'll create your one owner account directly via this endpoint once,
then never call it again. This is a deliberate simplicity choice for v1.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas, models, auth
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
def register_owner(payload: schemas.OwnerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Owner).filter(models.Owner.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Owner already exists")

    owner = models.Owner(
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
    )
    db.add(owner)
    db.commit()

    token = auth.create_access_token({"sub": owner.email})
    return {"access_token": token}


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm expects fields named "username" and "password"
    # (an OAuth2 standard) — we treat "username" as the owner's email.
    owner = db.query(models.Owner).filter(models.Owner.email == form_data.username).first()

    if not owner or not auth.verify_password(form_data.password, owner.hashed_password):
        # Deliberately vague error message: we never reveal WHICH part was
        # wrong (email vs password). This prevents attackers from using
        # error messages to figure out which emails exist in our system.
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token({"sub": owner.email})
    return {"access_token": token}
