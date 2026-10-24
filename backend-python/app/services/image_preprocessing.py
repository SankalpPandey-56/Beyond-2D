import cv2
import numpy as np
from typing import Tuple, Dict, Any, Optional
from ..config import MAX_IMAGE_DIM, MAX_FILE_SIZE_BYTES

class PreprocessingResult:
    def __init__(
        self,
        orig_bgr: np.ndarray,
        clean_gray: np.ndarray,
        binary_walls: np.ndarray,
        bbox: Tuple[int, int, int, int],
        orig_dims: Tuple[int, int],
        deskew_angle: float = 0.0,
        warnings: Optional[list] = None
    ):
        self.orig_bgr = orig_bgr
        self.clean_gray = clean_gray
        self.binary_walls = binary_walls
        self.bbox = bbox  # (bx, by, bw, bh)
        self.orig_dims = orig_dims  # (width, height)
        self.deskew_angle = deskew_angle
        self.warnings = warnings or []

def detect_and_correct_skew(image_gray: np.ndarray, max_angle: float = 5.0) -> Tuple[np.ndarray, float]:
    """
    Detects small skew angles using probabilistic Hough transform on strong edge lines.
    If detected angle is significant and within max_angle, returns rotated image and angle.
    """
    edges = cv2.Canny(image_gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=120, minLineLength=80, maxLineGap=10)
    
    if lines is None:
        return image_gray, 0.0

    angles = []
    for line in lines:
        pts = line.reshape(-1)
        if len(pts) < 4:
            continue
        x1, y1, x2, y2 = int(pts[0]), int(pts[1]), int(pts[2]), int(pts[3])
        dx = x2 - x1
        dy = y2 - y1
        if abs(dx) > 1e-3:
            angle = float(np.degrees(np.arctan2(dy, dx)))
            # Focus on near-horizontal lines
            if abs(angle) < max_angle:
                angles.append(angle)
            elif abs(angle - 90) < max_angle:
                angles.append(angle - 90)
            elif abs(angle + 90) < max_angle:
                angles.append(angle + 90)

    if not angles or len(angles) < 5:
        return image_gray, 0.0

    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.25:
        return image_gray, 0.0

    # Rotate around center
    h, w = image_gray.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(image_gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated, median_angle

def extract_building_footprint_bbox(clean_gray: np.ndarray, binary_inv: np.ndarray) -> Tuple[int, int, int, int]:
    """
    Finds the exact outer bounding box of the architectural building drawing,
    isolating continuous solid walls from outer dimension lines, legends, and margin text.
    """
    h, w = clean_gray.shape[:2]

    # Filter dark solid wall pixels using connected components
    _, binary_strict = cv2.threshold(clean_gray, 85, 255, cv2.THRESH_BINARY_INV)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_strict, connectivity=8)
    wall_mask = np.zeros((h, w), dtype=np.uint8)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] > 80:
            wall_mask[labels == i] = 255

    wall_pts = np.argwhere(wall_mask > 0)
    if len(wall_pts) == 0:
        return 0, 0, w, h

    y_min, x_min = wall_pts.min(axis=0)
    y_max, x_max = wall_pts.max(axis=0)
    bx = int(x_min)
    by = int(y_min)
    bw = int(x_max - x_min)
    bh = int(y_max - y_min)

    if bw < w * 0.2 or bh < h * 0.2:
        return 0, 0, w, h

    return bx, by, bw, bh

def preprocess_floor_plan_image(image_bytes: bytes) -> PreprocessingResult:
    """
    Complete deterministic preprocessing:
    1. Validation
    2. Grayscale & Noise reduction
    3. Adaptive thresholding
    4. Skew correction
    5. Footprint bounding box localization
    """
    warnings = []
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds maximum limit of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB.")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        raise ValueError("Could not decode image bytes into valid image array.")

    h, w = img_bgr.shape[:2]
    if max(w, h) > MAX_IMAGE_DIM:
        warnings.append(f"Image dimension ({w}x{h}) exceeds recommended max {MAX_IMAGE_DIM}px; scaling down proportionally.")
        scale = MAX_IMAGE_DIM / float(max(w, h))
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = img_bgr.shape[:2]

    # Convert to grayscale
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Edge-preserving noise reduction
    filtered = cv2.bilateralFilter(gray, d=5, sigmaColor=50, sigmaSpace=50)

    # Deskew check
    clean_gray, skew_angle = detect_and_correct_skew(filtered)
    if abs(skew_angle) > 0.0:
        # Also rotate BGR image for overlays
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, skew_angle, 1.0)
        img_bgr = cv2.warpAffine(img_bgr, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        warnings.append(f"Corrected architectural image skew of {skew_angle:.2f} degrees.")

    # High-contrast adaptive thresholding for crisp dark walls on light background
    # Standard printed plans have black walls (low pixel value) on white/light background
    adaptive = cv2.adaptiveThreshold(
        clean_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 8
    )

    # Also Otsu threshold for solid thick wall segments
    _, otsu = cv2.threshold(clean_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Combined binary wall mask
    binary_walls = cv2.bitwise_or(adaptive, otsu)

    # Clean small isolated speckles
    clean_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary_walls = cv2.morphologyEx(binary_walls, cv2.MORPH_OPEN, clean_kernel, iterations=1)

    # Detect building drawing bounds
    bbox = extract_building_footprint_bbox(clean_gray, binary_walls)

    return PreprocessingResult(
        orig_bgr=img_bgr,
        clean_gray=clean_gray,
        binary_walls=binary_walls,
        bbox=bbox,
        orig_dims=(w, h),
        deskew_angle=skew_angle,
        warnings=warnings
    )
