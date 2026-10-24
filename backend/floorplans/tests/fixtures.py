import io
import cv2
import numpy as np
from PIL import Image


def create_synthetic_floorplan_image(width=500, height=400) -> bytes:
    """
    Draws a synthetic 2D architectural floor plan with walls, doors, and rooms.
    Returns PNG bytes.
    """
    # White background canvas
    canvas = np.ones((height, width, 3), dtype=np.uint8) * 255

    wall_color = (0, 0, 0)
    wall_thickness = 6

    # Perimeter walls
    cv2.rectangle(canvas, (40, 40), (width - 40, height - 40), wall_color, wall_thickness)

    # Interior dividing wall (horizontal)
    cv2.line(canvas, (40, height // 2), (width - 40, height // 2), wall_color, wall_thickness)

    # Interior dividing wall (vertical in top half)
    cv2.line(canvas, (width // 2, 40), (width // 2, height // 2), wall_color, wall_thickness)

    # Door gaps (openings)
    cv2.line(canvas, (width // 2 - 25, height // 2), (width // 2 + 25, height // 2), (255, 255, 255), wall_thickness + 2)
    cv2.line(canvas, (width // 2, 100), (width // 2, 140), (255, 255, 255), wall_thickness + 2)

    # Window indication (double lines on top exterior wall)
    cv2.line(canvas, (100, 40), (160, 40), (120, 120, 120), wall_thickness - 2)

    # Encode to PNG bytes
    success, buffer = cv2.imencode('.png', canvas)
    if not success:
        raise ValueError("Failed to encode synthetic floor plan image")

    return buffer.tobytes()
