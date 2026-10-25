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

def query_vision_ai_interpretation(
    image_bytes: bytes,
    crop_bytes: Optional[bytes] = None,
    mime_type: str = "image/png"
) -> Optional[Dict[str, Any]]:
    """
    Calls Gemini Vision to analyze 2D architectural floor plan.
    When crop_bytes is provided (Approach 3):
    - Image 1 is full blueprint with dimension annotations.
    - Image 2 is isolated footprint cropped to structural walls.
    Extracts room labels, spatial layout, exterior boundaries, and metric dimensions.
    Returns structured JSON layout, or None if unavailable.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None

    b64_full = base64.b64encode(image_bytes).decode("utf-8")

    if crop_bytes is not None:
        b64_crop = base64.b64encode(crop_bytes).decode("utf-8")
        prompt = """You are an expert architectural blueprint computer vision analyzer.
Image 1 is the full blueprint with dimension measurements (e.g. 10.0m x 8.0m or 15.0m x 10.0m).
Image 2 is the exact building footprint cropped to the structural exterior walls:
- relX = 0.0 is the left exterior wall, relX = 1.0 is the right exterior wall.
- relZ = 0.0 is the top exterior wall, relZ = 1.0 is the bottom exterior wall.

Analyze every room covering the entire floor plan. Inspect all sections across the drawing:
1. Top-Left / North-West: Bedrooms side-by-side
2. Middle-Left / West: Bathrooms, toilets, utility/closet rooms
3. Bottom-Left / South-West: Master Bedroom / suite
4. Center / Core: Living Room, Family Room, Foyer
5. Right Side / East: Kitchen, Dining Area, Office or Bedroom
6. Bottom-Center / South: Entryway Porch / Foyer Vestibule

Return JSON:
{
  "dimensions": {
    "width": float,
    "length": float,
    "wallHeight": 2.8,
    "wallThickness": 0.22
  },
  "rooms": [
    {
      "id": string (e.g. "bed_1", "bath_1", "living", "kitchen"),
      "name": string (exact labeled room name e.g. "Bedroom 1", "Master Bedroom", "Kitchen", "Living Room", "Bathroom", "Porch"),
      "type": "bedroom"|"living"|"kitchen"|"bathroom"|"dining"|"porch"|"hallway"|"entrance"|"office",
      "relX": float (0.0 to 1.0 relative to Image 2 cropped footprint),
      "relZ": float (0.0 to 1.0 relative to Image 2 cropped footprint),
      "relW": float (0.05 to 1.0),
      "relD": float (0.05 to 1.0),
      "dimensionsText": string,
      "furniture": list of furniture items seen (e.g. ["bed", "wardrobe"])
    }
  ]
}

CRITICAL ARCHITECTURAL RULES:
1. Extract building width and length from Image 1 measurement annotations if present, or scale realistically from aspect ratio.
2. Extract all room coordinates relative to Image 2 (the cropped building footprint).
3. The rooms together MUST cover the entire house layout. Do not leave large sections empty.
4. Adjacent rooms must share boundaries flush with ZERO VOID GAPS between rooms.
5. Identify DOORS:
   - "doors": [
       {"id": "door_1", "wall": "exterior"|"interior", "between": ["RoomA", "RoomB"|"outside"], "relX": float (0.0 to 1.0), "relZ": float (0.0 to 1.0), "width": float}
     ]
   - CRITICAL: Only detect doors where door swings or door openings are physically drawn. NEVER place a door between kitchen and bathroom/washroom!
6. Identify WINDOWS:
   - "windows": [
       {"id": "win_1", "wall": "north"|"south"|"east"|"west", "relX": float, "relZ": float, "width": float}
     ]
7. Return ONLY valid JSON with {"dimensions": {...}, "rooms": [...], "doors": [...], "windows": [...]}. Do not include a walls array."""

        parts = [
            {"text": prompt},
            {"text": "Image 1 (Full blueprint with dimension annotations):"},
            {"inline_data": {"mime_type": mime_type, "data": b64_full}},
            {"text": "Image 2 (Isolated building footprint cropped to structural walls):"},
            {"inline_data": {"mime_type": mime_type, "data": b64_crop}},
        ]
    else:
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
- Identify DOORS:
  "doors": [
    {"id": "door_1", "wall": "exterior"|"interior", "between": ["RoomA", "RoomB"|"outside"], "relX": float, "relZ": float, "width": float}
  ]
  Only detect doors where door swings or openings are actually drawn! NEVER place a door between kitchen and bathroom/washroom!
- Identify WINDOWS:
  "windows": [
    {"id": "win_1", "wall": "north"|"south"|"east"|"west", "relX": float, "relZ": float, "width": float}
  ]
- Return ONLY valid JSON with {"dimensions": {...}, "rooms": [...], "doors": [...], "windows": [...]}. Do not include a walls array."""

        parts = [
            {"text": prompt},
            {"inline_data": {"mime_type": mime_type, "data": b64_full}}
        ]

    candidate_models = ["gemini-2.5-flash", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"]

    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": parts}],
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
