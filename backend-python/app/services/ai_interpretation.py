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
    
    prompt = """You are an expert architectural blueprint computer vision engine.
Analyze the uploaded 2D floor plan image.
Identify:
1. Real building dimensions in meters (width along X, depth/length along Z). If labeled on image (e.g. 10.0m x 8.0m), use the exact labeled dimensions.
2. Every room:
   - id (e.g. 'room_1', 'bed_1')
   - name (exact labeled name e.g. 'Bedroom 1', 'Master Bedroom', 'Kitchen', 'Living Room', 'Bathroom', 'Porch')
   - type (one of: 'bedroom', 'living', 'kitchen', 'bathroom', 'hallway', 'balcony', 'office', 'dining', 'entrance', 'porch')
   - relX, relZ: normalized top-left position (0.0 to 1.0)
   - relW, relD: normalized width and depth (0.0 to 1.0)
   - dimensionsText (e.g. '3.5 m x 3.0 m')
   - furniture: list of furniture items seen
   - openings: list of doors or windows on this room's walls: [{"type": "door"|"window", "wallSide": "north"|"south"|"east"|"west", "position": float 0..1}]
3. Every wall segment:
   - id (e.g. 'wall_1')
   - startX, startZ, endX, endZ (in meters, centered at 0, 0: from -width/2 to +width/2, -length/2 to +length/2)
   - isExterior: boolean
   - thickness: float (0.22 for exterior, 0.15 for interior)
   - openings: list of doors and windows on this wall: [{"type": "door"|"window", "position": float 0..1, "width": float in meters}]

CRITICAL GEOMETRY RULES:
- All rooms must fit inside [0.0, 1.0] along X and Z.
- Adjacent rooms must share boundaries flush with ZERO VOID GAPS between rooms.
- Exterior boundaries must reflect the true building footprint, including porches or bay step-backs.
- Output ONLY valid JSON matching this structure."""

    candidate_models = ["gemini-3.1-flash-lite-preview", "gemini-3.5-flash", "gemini-1.5-flash"]
    
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
            with urllib.request.urlopen(req, timeout=18) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                text = res["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                if parsed and "rooms" in parsed and len(parsed["rooms"]) > 0:
                    return parsed
        except Exception as e:
            continue

    return None
