from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.gemini_service import gemini_service
from app.schemas.analysis_schemas import AnalysisResponse

router = APIRouter()

@router.post("/", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    Core analysis endpoint.
    Receives an image file, sends it to Gemini Vision Pro, 
    and returns a structured 'PhotoScience' report.
    """
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Read file content
        contents = await file.read()
        
        # Call Gemini Service
        analysis_result = await gemini_service.analyze_image(contents)
        
        return analysis_result

    except Exception as e:
        print(f"Analysis Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
