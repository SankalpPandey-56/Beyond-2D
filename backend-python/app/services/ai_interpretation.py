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
    
    prompt = """You are an expert architectural blueprint computer vision analyzer.
Analyze the uploaded floor plan image and identify EVERY SINGLE ROOM across the ENTIRE house.
Do NOT stop at 2 or 3 rooms! Inspect all sections across the entire drawing:
1. Top-Left / North-West: Bedrooms side-by-side
2. Middle-Left / West: Bathrooms, toilets, utility/closet rooms
3. Bottom-Left / South-West: Master Bedroom / suite
4. Center / Core: Living Room, Family Room, Foyer
5. Right Side / East: Kitchen, Dining Area, Office or Bedroom
6. Bottom-Center / South: Entryway Porch / Foyer Vestibule

For EVERY room, return:
- "id": string (e.g. "bed_1", "bed_2", "bath_1", "master_bed", "living", "kitchen", "dining", "porch", "hallway")
- "name": string (exact labeled room name e.g. "Bedroom 1", "Master Bedroom", "Kitchen", "Living Room", "Bathroom", "Porch")
- "type": "bedroom"|"living"|"kitchen"|"bathroom"|"dining"|"hallway"|"office"|"porch"|"entrance"
- "relX": float (0.0 to 1.0, top-left X position relative to building footprint)
- "relZ": float (0.0 to 1.0, top-left Z position relative to building footprint)
- "relW": float (0.05 to 1.0, width along X)
- "relD": float (0.05 to 1.0, depth along Z)
- "dimensionsText": string (e.g. "3.5 m x 3.0 m")
- "furniture": list of furniture items seen (e.g. ["bed", "wardrobe"])

Also identify building dimensions:
- "dimensions": {"width": float, "length": float, "wallHeight": 2.8, "wallThickness": 0.22}
  (If labeled e.g. 10.0m x 8.0m or 14.0m x 8.9m, use exact labeled metric dimensions).

CRITICAL ARCHITECTURAL RULES:
- The extracted rooms together MUST span the full house footprint. Do NOT leave large areas empty.
- Adjacent rooms must share boundaries flush with ZERO VOID GAPS between rooms.
- Return ONLY valid JSON with {"dimensions": {...}, "rooms": [...]}. Do not include a walls array."""

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
