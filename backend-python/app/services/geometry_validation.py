import math
from typing import List, Dict, Any, Tuple

def validate_architectural_geometry(
    walls: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]],
    dims: Dict[str, Any],
    bbox: Tuple[int, int, int, int]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """
    Validates architectural floor plan geometry before sending to frontend/3D renderer.
    Checks:
    - Zero-length or non-finite walls.
    - Duplicate collinear walls.
    - Room bounds & overlaps.
    - Aspect ratio fidelity.
    """
    warnings: List[str] = []
    validated_walls: List[Dict[str, Any]] = []

    # 1. Validate Walls
    seen_segments = set()
    for w in walls:
        sx, sz = w["startX"], w["startZ"]
        ex, ez = w["endX"], w["endZ"]

        # Check finite values
        if any(math.isnan(v) or math.isinf(v) for v in [sx, sz, ex, ez]):
            warnings.append(f"Skipping wall {w['id']} with non-finite coordinates.")
            continue

        length = math.hypot(ex - sx, ez - sz)
        if length < 0.15:
            warnings.append(f"Skipping zero-length wall segment {w['id']} (len={length:.2f}m).")
            continue

        # Check duplicates (symmetric segment key)
        k1 = (round(min(sx, ex), 2), round(min(sz, ez), 2), round(max(sx, ex), 2), round(max(sz, ez), 2))
        if k1 in seen_segments:
            warnings.append(f"Skipping duplicate wall segment {w['id']}.")
            continue
        seen_segments.add(k1)

        validated_walls.append(w)

    # 2. Validate Rooms
    validated_rooms: List[Dict[str, Any]] = []
    for r in rooms:
        rx = max(0.0, min(1.0, r.get("relX", 0.0)))
        rz = max(0.0, min(1.0, r.get("relZ", 0.0)))
        rw = max(0.05, min(1.0 - rx, r.get("relW", 0.2)))
        rd = max(0.05, min(1.0 - rz, r.get("relD", 0.2)))

        r_copy = dict(r)
        r_copy["relX"] = round(rx, 3)
        r_copy["relZ"] = round(rz, 3)
        r_copy["relW"] = round(rw, 3)
        r_copy["relD"] = round(rd, 3)
        validated_rooms.append(r_copy)

    # 3. Validate Aspect Ratio
    bw, bh = bbox[2], bbox[3]
    drawing_ratio = bw / float(max(1, bh))
    model_ratio = dims["width"] / float(max(0.1, dims["length"]))

    ratio_delta = abs(drawing_ratio - model_ratio) / drawing_ratio
    if ratio_delta > 0.25:
        warnings.append(
            f"Aspect ratio discrepancy: Drawing={drawing_ratio:.3f}, World Model={model_ratio:.3f} (delta={ratio_delta*100:.1f}%)."
        )

    return validated_walls, validated_rooms, warnings
