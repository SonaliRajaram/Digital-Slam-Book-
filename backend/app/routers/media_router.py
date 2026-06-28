"""
One endpoint: upload a file, get back a URL. That URL then gets saved onto
a page via the EXISTING autosave endpoint (PATCH /pages/{id} with
{"photo_url": "..."}) — we don't need a separate "attach photo to page"
endpoint, because photo_url is just another field on Page that autosave
already knows how to update. This is good API design: don't build two
endpoints when composing two simple ones does the same job.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException

from ..storage import get_storage_provider, validate_image

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    PUBLIC — a friend writing their page calls this when they attach a
    photo. `UploadFile` is FastAPI's streaming file type; we read it fully
    into memory here (fine for our 8MB limit) before validating and
    handing off to whichever storage provider is configured.
    """
    contents = await file.read()

    try:
        validate_image(file, contents)
    except ValueError as e:
        # 400 = "the request itself was invalid" — distinct from 401/403
        # (auth problems) or 500 (our server's own fault).
        raise HTTPException(status_code=400, detail=str(e))

    storage = get_storage_provider()
    url = storage.save_file(file, contents)
    return {"url": url}
