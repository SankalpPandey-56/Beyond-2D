import os
from typing import List, Tuple, Dict
from dotenv import load_dotenv

load_dotenv()

# Server Settings
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8001"))
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

# CORS Origins
cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001")
CORS_ORIGINS: List[str] = [origin.strip() for origin in cors_raw.split(",") if origin.strip()]

# Vision / AI Configuration
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
AI_ENABLED: bool = os.getenv("AI_ENABLED", "true").lower() in ("1", "true", "yes")

# Processing Limits
MAX_IMAGE_DIM: int = 4096
MAX_FILE_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB

# Centralized Fixed Architectural Semantic Color Palette (RGB and BGR)
# Matching PlanPop standard:
# Walls: Red (255, 0, 0)
# Doors: Blue (0, 0, 255)
# Windows: Cyan (0, 255, 255)
# Labels / Annotations: Green (0, 255, 0)
# Stairs: Yellow (255, 255, 0)
# Scale / Dimension Guides: Magenta (255, 0, 255)
# Background / Unclassified: White (255, 255, 255)

PALETTE_RGB: Dict[str, Tuple[int, int, int]] = {
    "wall": (255, 0, 0),
    "door": (0, 0, 255),
    "window": (0, 255, 255),
    "annotation": (0, 255, 0),
    "stairs": (255, 255, 0),
    "scale": (255, 0, 255),
    "background": (255, 255, 255),
}

PALETTE_BGR: Dict[str, Tuple[int, int, int]] = {
    name: (rgb[2], rgb[1], rgb[0]) for name, rgb in PALETTE_RGB.items()
}

# Standard Architectural Default Dimensions (Meters)
DEFAULT_WALL_HEIGHT: float = 2.80
DEFAULT_EXTERIOR_WALL_THICKNESS: float = 0.22
DEFAULT_INTERIOR_WALL_THICKNESS: float = 0.15
DEFAULT_DOOR_WIDTH: float = 0.90
DEFAULT_WINDOW_WIDTH: float = 1.20
DEFAULT_SILL_HEIGHT: float = 0.90
DEFAULT_WINDOW_HEIGHT: float = 1.20
