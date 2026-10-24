"""
PlanPop Fixed Semantic Palette for Computer Vision (Python / OpenCV)
"""

# RGB Palette
RGB_PALETTE = {
    "WALLS": (255, 0, 0),         # Red
    "DOORS": (0, 0, 255),         # Blue
    "WINDOWS": (0, 255, 255),      # Cyan
    "ANNOTATIONS": (0, 255, 0),    # Green
    "STAIRS": (255, 255, 0),       # Yellow
    "SCALE_GUIDES": (255, 0, 255), # Magenta
    "BACKGROUND": (255, 255, 255)  # White
}

# OpenCV BGR representations
BGR_PALETTE = {
    "WALLS": (0, 0, 255),         # Red in BGR
    "DOORS": (255, 0, 0),         # Blue in BGR
    "WINDOWS": (255, 255, 0),      # Cyan in BGR
    "ANNOTATIONS": (0, 255, 0),    # Green in BGR
    "STAIRS": (0, 255, 255),       # Yellow in BGR
    "SCALE_GUIDES": (255, 0, 255), # Magenta in BGR
    "BACKGROUND": (255, 255, 255)  # White in BGR
}

# Color tolerance bounds for HSV / RGB segmentation
# Walls (Pure Red): R > 160, G < 90, B < 90
# Doors (Pure Blue): B > 160, R < 90, G < 90
# Windows (Cyan): G > 160, B > 160, R < 90
# Annotations (Green): G > 160, R < 90, B < 90
