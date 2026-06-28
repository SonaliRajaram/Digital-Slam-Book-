"""
CONCEPT: Why an abstraction layer instead of calling Cloudinary directly
in the route function?

Imagine you wrote `cloudinary.upload(file)` directly inside your upload
endpoint. Two problems:
  1. You can't test it locally without real Cloudinary credentials.
  2. If you ever switch providers (or add a second one, e.g. video goes to
     S3 but images go to Cloudinary), you'd have to hunt down every place
     that calls Cloudinary and change it.

Instead, we define a CONTRACT (the StorageProvider base class) that says
"any storage backend must be able to save_file() and return a URL."
Routes only ever talk to that contract. Today it's backed by local disk;
tomorrow you flip STORAGE_PROVIDER=cloudinary in your environment variables
and nothing else in the codebase changes. This is the Repository Pattern.
"""

import os
import uuid
import shutil
from abc import ABC, abstractmethod
from fastapi import UploadFile

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB


class StorageProvider(ABC):
    @abstractmethod
    def save_file(self, file: UploadFile, contents: bytes) -> str:
        """Saves the file and returns a publicly accessible URL."""
        raise NotImplementedError


class LocalStorage(StorageProvider):
    """
    Saves to ./static/uploads on disk and serves it via FastAPI's
    StaticFiles mount (wired up in main.py). PERFECT for development,
    WRONG for production deploys with ephemeral disks — see module
    docstring above.
    """

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url

    def save_file(self, file: UploadFile, contents: bytes) -> str:
        ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, unique_name)
        with open(path, "wb") as f:
            f.write(contents)
        return f"{self.base_url}/{UPLOAD_DIR}/{unique_name}"


class CloudinaryStorage(StorageProvider):
    """
    Production implementation. Requires CLOUDINARY_URL env var
    (format: cloudinary://<api_key>:<api_secret>@<cloud_name>).

    Cloudinary's SDK auto-reads that env var, so once it's set on your
    hosting platform (Render/Railway/Vercel secrets), this just works —
    zero code changes needed beyond setting STORAGE_PROVIDER=cloudinary.
    """

    def save_file(self, file: UploadFile, contents: bytes) -> str:
        import cloudinary.uploader  # imported lazily so dev doesn't need
                                      # the cloudinary package installed
                                      # just to run locally

        result = cloudinary.uploader.upload(contents, resource_type="image")
        return result["secure_url"]


def get_storage_provider() -> StorageProvider:
    provider = os.getenv("STORAGE_PROVIDER", "local")
    if provider == "cloudinary":
        return CloudinaryStorage()
    return LocalStorage(base_url=os.getenv("BACKEND_BASE_URL", "http://localhost:8000"))


def validate_image(file: UploadFile, contents: bytes) -> None:
    """
    CONCEPT: Why validate on the SERVER, even though the frontend's <input>
    can restrict file types? Because the frontend's restriction is just a
    UI suggestion — anyone can bypass it entirely by calling your API
    directly (e.g. with curl). The server is the only place a validation
    rule can actually be trusted/enforced. Never trust the client.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(f"Unsupported file type: {file.content_type}")
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File too large (max 8MB)")
