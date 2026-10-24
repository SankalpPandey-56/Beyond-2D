import os
import json
import base64
import urllib.request
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Search for environment keys in current dir, parent dir, and .env.local
load_dotenv()
load_dotenv('.env.local')
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
load_dotenv(os.path.join(root_dir, ".env.local"))
load_dotenv(os.path.join(root_dir, ".env"))

def query_vision_ai_interpretation(image_bytes: bytes, mime_type: str = "image/png") -> Optional[Dict[str, Any]]:
    """
    Calls Gemini Vision to analyze 2D architectural floor plan.
    Extracts room labels, spatial layout, exterior boundaries, and metric dimensions.
    Returns structured JSON layout, or None if unavailable.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None

    b64_data = base64.b64encode(image_bytes).decode("utf-8")
    
    prompt = """You are an expert CAD reverse-engineering system.
Analyze the floor plan drawing.
Your goal is to extract the EXACT structural wall centerlines with perfect collinearity and rectilinear alignment (90 degree angles), plus all room boundaries, doors, and windows.

Extract:
1. "dimensions": {"width": float, "length": float, "wallHeight": 2.8, "wallThickness": 0.22}
   (If labeled e.g. 10.0m x 8.0m or 14.0m x 8.9m, use exact labeled metric dimensions).
2. "walls": list of structural wall centerlines:
   - "id": string (e.g. "ext_north", "ext_east", "int_wall_1")
   - "start_norm": [x, z] normalized coordinates (0.0 to 1.0)
   - "end_norm": [x, z] normalized coordinates (0.0 to 1.0)
   - "isExterior": boolean
   - "thickness": float (0.22 for exterior, 0.15 for interior)
   - "openings": list of doors and windows on this wall: [{"type": "door"|"window", "position": float 0..1, "width": float}]
3. "doors": list of doors:
   - "id": string
   - "center_norm": [x, z]
   - "width_m": 0.9
4. "windows": list of windows:
   - "id": string
   - "center_norm": [x, z]
   - "width_m": 1.2
5. "rooms": list of rooms:
   - "id": string (e.g. "room_bed1", "room_living")
   - "name": string (exact labeled name e.g. "Bedroom 1", "Living Room", "Kitchen", "Bathroom", "Porch")
   - "type": "bedroom"|"living"|"kitchen"|"bathroom"|"dining"|"porch"|"hallway"|"office"
   - "relX": float 0..1 (top-left X)
   - "relZ": float 0..1 (top-left Z)
   - "relW": float 0..1 (width along X)
   - "relD": float 0..1 (depth along Z)
   - "dimensionsText": string (e.g. "3.5 m x 3.0 m")

CRITICAL CAD ALIGNMENT RULES:
- Every wall MUST be strictly horizontal (start_norm[1] == end_norm[1]) or vertical (start_norm[0] == end_norm[0]). No diagonal walls.
- Walls that share an axis line MUST share the EXACT same coordinate along that axis (perfect collinear snapping).
- Exterior walls must form a closed outer boundary perimeter around all rooms.
- Adjacent rooms must share boundaries flush with ZERO VOID GAPS between rooms.
- Return ONLY valid JSON."""

    candidate_models = ["gemini-3.1-flash-lite-preview", "gemini-3.1-flash-lite"]
    
    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}}
                ]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                text = res["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                if parsed and "rooms" in parsed and len(parsed["rooms"]) > 0:
                    return parsed
        except Exception as e:
            continue

    return None
