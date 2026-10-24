import math
from typing import Dict, Any, Tuple


DEFAULT_CONFIG = {
    'default_building_width_m': 10.0,
    'default_building_length_m': 8.0,
    'wall_height_m': 2.8,
    'wall_thickness_m': 0.22,
    'floor_thickness_m': 0.12,
    'door_width_m': 0.95,
    'door_height_m': 2.1,
    'window_width_m': 1.3,
    'window_height_m': 1.2,
    'window_sill_height_m': 0.9,
}


def calculate_scale(
    image_width_px: int,
    image_height_px: int,
    calibration_params: Dict[str, Any] = None
) -> Tuple[float, bool, Dict[str, float]]:
    """
    Computes pixels-per-meter (PPM) scale.
    Returns:
        (pixels_per_meter, is_estimated, building_metric_dimensions)
    """
    params = calibration_params or {}

    # 1. User-supplied explicit reference distance
    ref_length_m = params.get('reference_length_meters')
    pixel_distance = params.get('pixel_distance')

    if ref_length_m and pixel_distance and float(ref_length_m) > 0 and float(pixel_distance) > 0:
        ppm = float(pixel_distance) / float(ref_length_m)
        total_width_m = image_width_px / ppm
        total_length_m = image_height_px / ppm
        return ppm, False, {
            'width': round(total_width_m, 2),
            'length': round(total_length_m, 2),
            'wallHeight': DEFAULT_CONFIG['wall_height_m'],
            'wallThickness': DEFAULT_CONFIG['wall_thickness_m'],
        }

    # 2. User-supplied known overall width or length
    known_width_m = params.get('known_width_meters')
    if known_width_m and float(known_width_m) > 0:
        ppm = image_width_px / float(known_width_m)
        total_length_m = image_height_px / ppm
        return ppm, False, {
            'width': round(float(known_width_m), 2),
            'length': round(total_length_m, 2),
            'wallHeight': DEFAULT_CONFIG['wall_height_m'],
            'wallThickness': DEFAULT_CONFIG['wall_thickness_m'],
        }

    # 3. Intelligent default scale:
    # Typical single-family residential floor plans span ~8m to 14m along their major axis.
    max_dim_px = max(image_width_px, image_height_px)
    assumed_major_axis_m = 11.0  # standard residential blueprint envelope
    ppm = max_dim_px / assumed_major_axis_m

    width_m = round(image_width_px / ppm, 2)
    length_m = round(image_height_px / ppm, 2)

    return ppm, True, {
        'width': width_m,
        'length': length_m,
        'wallHeight': DEFAULT_CONFIG['wall_height_m'],
        'wallThickness': DEFAULT_CONFIG['wall_thickness_m'],
    }
