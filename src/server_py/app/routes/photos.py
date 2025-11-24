from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import shutil
import os
import uuid
from typing import Optional
from app.state import UPLOADS_DB

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_photos(
    sourceImage: UploadFile = File(...),
    targetImage: Optional[UploadFile] = File(None)
):
    upload_id = str(uuid.uuid4())
    
    # Save Source Image
    source_filename = f"{upload_id}_source_{sourceImage.filename}"
    source_path = os.path.join(UPLOAD_DIR, source_filename)
    with open(source_path, "wb") as buffer:
        shutil.copyfileobj(sourceImage.file, buffer)
        
    # Save Target Image (if exists)
    target_path = None
    if targetImage:
        target_filename = f"{upload_id}_target_{targetImage.filename}"
        target_path = os.path.join(UPLOAD_DIR, target_filename)
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(targetImage.file, buffer)
    
    # In a real app, you'd upload to S3 and get a public URL.
    # Here we construct a local URL (assuming we mount /uploads as static)
    # For Gemini to access, these MUST be public URLs if using the URL method, 
    # OR we pass the file bytes directly to Gemini.
    # Since our GeminiService supports local paths, we just store the path.
    
    UPLOADS_DB[upload_id] = {
        "source": source_path,
        "target": target_path
    }
    
    return {
        "uploadId": upload_id,
        "source_image_url": f"/uploads/{source_filename}",
        "target_image_url": f"/uploads/{target_filename}" if target_path else None
    }
