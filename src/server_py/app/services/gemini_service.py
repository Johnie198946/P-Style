import os
import json
import google.generativeai as genai
from PIL import Image
import io
from app.schemas.analysis_schemas import AnalysisResponse

# Configure API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class GeminiService:
    def __init__(self):
        # Use Flash for speed, or Pro for better reasoning.
        # Flash 1.5 is usually sufficient for structured JSON extraction.
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def analyze_image(self, image_bytes: bytes) -> AnalysisResponse:
        """
        Analyzes the uploaded image and returns a complete PhotoScience analysis report.
        """
        
        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes))

        prompt = """
        You are the "PhotoScience" AI, a Hollywood-grade Color Science & Composition Analysis Engine.
        
        Your task is to analyze the provided image and output a highly structured JSON report used to drive a futuristic dashboard (FUI).
        
        You must analyze two main domains:
        1. LIGHTROOM / COLOR SCIENCE: 
           - Generate "Tactical Parameters" for exposure, contrast, etc.
           - For every parameter, provide the current 'value', the physical 'min/max' of the slider, and a 'target_min' / 'target_max' range that you suggest the user should aim for to achieve a cinematic look.
           - Provide a "reason" for every suggestion in a concise, technical, military-briefing style.
           - Generate a "Spectrum Matrix" (12-channel HSL analysis).
           - Generate "Trinity Grading" (Shadows/Mids/Highlights color wheels).
           - Generate an "Advanced Curve" analysis for RGB/Red/Green/Blue channels with control points.
        
        2. COMPOSITION ANALYSIS:
           - Analyze the "Visual Structure", "Subject Weight", "Leading Lines", "Spatial Zones".
           - Determine the "Style" (e.g., Cyberpunk, Noir, Landscape, Minimalist).
           - Analyze the "Balance" (Horizontal/Vertical).
        
        OUTPUT FORMAT:
        Return ONLY a valid JSON object matching the following structure strictly. 
        Do not include Markdown formatting (```json).
        
        {
          "lightroom": {
            "brief": { "title": "MISSION REPORT", "content": "..." },
            "histogram": { "r": [...], "g": [...], "b": [...], "l": [...], "avg_l": 0.5, "shadows": 0.2, "midtones": 0.5, "highlights": 0.8 },
            "basic_panel": {
               "temp": { "value": 5500, "min": 2000, "max": 10000, "target_min": 5000, "target_max": 6000, "reason": "..." },
               "tint": { "value": 0, "min": -150, "max": 150, "target_min": -10, "target_max": 10, "reason": "..." },
               "exposure": { "value": 0, "min": -5, "max": 5, "target_min": 0.2, "target_max": 0.5, "reason": "..." },
               "contrast": { ... },
               "highlights": { ... },
               "shadows": { ... },
               "whites": { ... },
               "blacks": { ... },
               "texture": { ... },
               "clarity": { ... },
               "dehaze": { ... },
               "vibrance": { ... },
               "saturation": { ... }
            },
            "curve": {
               "rgb": [{"x":0,"y":0}, {"x":128,"y":128}, {"x":255,"y":255}],
               "red": [{"x":0,"y":0}, {"x":255,"y":255}],
               "green": [{"x":0,"y":0}, {"x":255,"y":255}],
               "blue": [{"x":0,"y":0}, {"x":255,"y":255}],
               "analysis": { "rgb": "...", "red": "..." },
               "tips": ["Tip 1", "Tip 2"]
            },
            "hsl": {
               "red": { "hue": 0, "saturation": 0, "luminance": 0 },
               ... (orange, yellow, green, aqua, blue, purple, magenta)
            },
            "split_toning": {
               "highlights": { "hue": 0, "saturation": 0, "reason": "..." },
               "midtones": { "hue": 0, "saturation": 0, "reason": "..." },
               "shadows": { "hue": 0, "saturation": 0, "reason": "..." },
               "balance": { "value": 0, "min": -100, "max": 100, "target_min": -10, "target_max": 10, "reason": "..." }
            },
            "spectrum": [
               { "name": "Red", "h": 0, "s": 0, "l": 0, "color": "#ff0000" },
               ... (12 channels)
            ]
          },
          "composition": {
             "structure": { "visual_frame": "...", "geometry": "...", "balance": "..." },
             "subject": { "position": "...", "weight_score": 85, "method": "...", "analysis": "..." },
             "lines": { "path": ["Step 1", "Step 2", "Step 3"], "guide": "..." },
             "zones": { "foreground": "...", "midground": "...", "background": "...", "perspective": "..." },
             "proportions": { "entities": "65%", "negative": "35%", "distribution": "..." },
             "balance": { "horizontal": "...", "vertical": "...", "strategy": "..." },
             "style": { "name": "...", "method": "...", "features": "..." }
          }
        }
        """

        try:
            response = self.model.generate_content(
                [prompt, image],
                generation_config={"response_mime_type": "application/json"}
            )
            
            # Parse JSON
            data = json.loads(response.text)
            
            # Validate with Pydantic (this ensures type safety)
            return AnalysisResponse(**data)

        except Exception as e:
            print(f"Gemini Analysis Error: {e}")
            # Return a fallback or re-raise
            # For now, we re-raise to let the route handle 500
            raise e

gemini_service = GeminiService()
