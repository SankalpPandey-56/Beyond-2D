import os
from typing import Dict, Any, Tuple
import cv2
import numpy as np
from PIL import Image


ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB
MIN_DIMENSION_PX = 80
MAX_DIMENSION_PX = 8000
PROCESSING_MAX_DIM_PX = 1800  # Normalized resolution for consistent computer vision kernels


def validate_image_file(file_path: str) -> Dict[str, Any]:
    """
    Validates file existence, extension, size, and image integrity via PIL.
    """
    if not os.path.exists(file_path):
        raise ValueError(f"Image file does not exist: {file_path}")

    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size ({file_size / (1024*1024):.1f}MB) exceeds the 25MB limit.")

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '{ext}'. Allowed: PNG, JPG, JPEG, WEBP.")

    try:
        with Image.open(file_path) as img:
            img.verify()
        # Re-open after verify to read format and dimensions
        with Image.open(file_path) as img:
            width, height = img.size
            img_format = img.format or ext.lstrip('.').upper()
    except Exception as e:
        raise ValueError(f"Image validation failed: file is corrupted or unreadable ({str(e)}).")

    if width < MIN_DIMENSION_PX or height < MIN_DIMENSION_PX:
        raise ValueError(f"Image dimensions ({width}x{height}) are too small for architectural analysis.")

    if width > MAX_DIMENSION_PX or height > MAX_DIMENSION_PX:
        raise ValueError(f"Image dimensions ({width}x{height}) exceed maximum allowed ({MAX_DIMENSION_PX}px).")

    return {
        'width': width,
        'height': height,
        'file_size': file_size,
        'format': img_format,
        'extension': ext,
    }


def preprocess_floorplan(image_path: str) -> Tuple[np.ndarray, np.ndarray, float, Dict[str, Any]]:
    """
    Loads and preprocesses the floor-plan image for architectural feature extraction.
    Returns:
        binary_walls: Binary image where walls/lines are white (255) on black (0) background.
        gray_image: Cleaned grayscale image.
        scale_ratio: Processing scale relative to original resolution.
        metadata: Image diagnostic statistics.
    """
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"OpenCV could not decode image at {image_path}")

    # Handle Alpha channel if transparent PNG
    if len(img.shape) == 3 and img.shape[2] == 4:
        alpha = img[:, :, 3]
        bgr = img[:, :, :3]
        # Composite over pure white background
        white_bg = np.ones_like(bgr, dtype=np.uint8) * 255
        alpha_factor = (alpha / 255.0)[:, :, np.newaxis]
        img = (bgr * alpha_factor + white_bg * (1 - alpha_factor)).astype(np.uint8)

    orig_h, orig_w = img.shape[:2]

    # Convert to grayscale
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # Normalize image resolution for consistent morphological kernel sizes
    scale_ratio = 1.0
    max_dim = max(orig_h, orig_w)
    if max_dim > PROCESSING_MAX_DIM_PX:
        scale_ratio = PROCESSING_MAX_DIM_PX / max_dim
        new_w = int(orig_w * scale_ratio)
        new_h = int(orig_h * scale_ratio)
        gray = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Edge-preserving denoising (Bilateral Filter removes blueprint texture/noise while keeping lines sharp)
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

    # Background detection (Check if dark or light blueprint)
    mean_val = np.mean(denoised)
    is_dark_background = mean_val < 127

    if is_dark_background:
        # Blueprint with white lines on dark background: threshold to isolate lines
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        # Standard black/grey lines on white paper: invert so lines are white
        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=19,
            C=6,
        )

    # Morphological cleaning to remove isolated pixel speckles
    clean_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary_clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, clean_kernel, iterations=1)

    metadata = {
        'original_width': orig_w,
        'original_height': orig_h,
        'processed_width': gray.shape[1],
        'processed_height': gray.shape[0],
        'scale_ratio': scale_ratio,
        'is_dark_background': is_dark_background,
    }

    return binary_clean, gray, scale_ratio, metadata
