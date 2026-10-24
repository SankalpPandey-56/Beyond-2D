import cv2
import base64
import numpy as np
from typing import List, Dict, Any, Tuple
from ..config import PALETTE_BGR

def generate_planpop_semantic_and_overlay(
    orig_bgr: np.ndarray,
    bbox: Tuple[int, int, int, int],
    wall_segments: List[Any],
    window_defs: List[Dict[str, Any]],
    door_defs: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]]
) -> Tuple[str, str, int]:
    """
    Renders 1:1 pixel-accurate PlanPop color-coded semantic map and diagnostic CAD overlay.
    Returns:
    - semantic_b64: Data URL of solid color-coded semantic image
    - overlay_b64: Data URL of blended CAD overlay on original floor plan
    - wall_pixel_count: Count of wall mask pixels for diagnostics
    """
    h, w = orig_bgr.shape[:2]
    bx, by, bw, bh = bbox

    # 1. Initialize crisp white semantic canvas at 1:1 original resolution
    semantic_bgr = np.ones((h, w, 3), dtype=np.uint8) * 255
    overlay_bgr = orig_bgr.copy()
    wall_mask = np.zeros((h, w), dtype=np.uint8)

    # Thicknesses for clear visual distinction
    wall_thickness_px = max(6, int(bw * 0.016))
    opening_thickness_px = max(4, int(bw * 0.012))

    # A. Draw Walls in Solid Red (0, 0, 255 in BGR)
    red_bgr = PALETTE_BGR["wall"]
    for seg in wall_segments:
        if isinstance(seg, dict):
            p1 = seg.get("_p1_px") or seg.get("p1_px")
            p2 = seg.get("_p2_px") or seg.get("p2_px")
        else:
            p1 = getattr(seg, "p1_px", None)
            p2 = getattr(seg, "p2_px", None)
        if p1 and p2:
            cv2.line(semantic_bgr, p1, p2, red_bgr, wall_thickness_px)
            cv2.line(overlay_bgr, p1, p2, red_bgr, wall_thickness_px)
            cv2.line(wall_mask, p1, p2, 255, wall_thickness_px)

    # B. Draw Windows in Solid Cyan (255, 255, 0 in BGR)
    cyan_bgr = PALETTE_BGR["window"]
    for win in window_defs:
        cv2.line(semantic_bgr, win["p1"], win["p2"], cyan_bgr, opening_thickness_px)
        cv2.line(overlay_bgr, win["p1"], win["p2"], cyan_bgr, opening_thickness_px)

    # C. Draw Doors in Solid Blue (255, 0, 0 in BGR)
    blue_bgr = PALETTE_BGR["door"]
    for dr in door_defs:
        cv2.line(semantic_bgr, dr["p1"], dr["p2"], blue_bgr, opening_thickness_px)
        cv2.line(overlay_bgr, dr["p1"], dr["p2"], blue_bgr, opening_thickness_px)

    # D. Room Annotation Markers in Solid Green (0, 255, 0 in BGR)
    green_bgr = PALETTE_BGR["annotation"]
    for r in rooms:
        rx = int(bx + r.get("relX", 0) * bw)
        rz = int(by + r.get("relZ", 0) * bh)
        rw = int(r.get("relW", 0.2) * bw)
        rd = int(r.get("relD", 0.2) * bh)
        cx = rx + rw // 2
        cz = rz + rd // 2
        cv2.circle(semantic_bgr, (cx, cz), 7, green_bgr, -1)
        cv2.circle(overlay_bgr, (cx, cz), 7, green_bgr, -1)

    # E. Scale Guide in Solid Magenta (255, 0, 255 in BGR)
    magenta_bgr = PALETTE_BGR["scale"]
    scale_px_len = int(bw * 0.2)
    y_guide = min(h - 10, by + bh + 35)
    cv2.line(semantic_bgr, (bx, y_guide), (bx + scale_px_len, y_guide), magenta_bgr, 4)

    # Blend overlay with original image (65% source + 35% CAD geometry)
    alpha_overlay = cv2.addWeighted(orig_bgr, 0.65, overlay_bgr, 0.35, 0)

    # Base64 encoding
    _, sem_buf = cv2.imencode(".png", semantic_bgr)
    sem_b64 = f"data:image/png;base64,{base64.b64encode(sem_buf).decode('utf-8')}"

    _, ovl_buf = cv2.imencode(".png", alpha_overlay)
    ovl_b64 = f"data:image/png;base64,{base64.b64encode(ovl_buf).decode('utf-8')}"

    wall_pixel_count = int(cv2.countNonZero(wall_mask))
    return sem_b64, ovl_b64, wall_pixel_count
