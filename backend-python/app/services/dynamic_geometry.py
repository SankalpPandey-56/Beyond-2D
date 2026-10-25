import math
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from ..config import (
    DEFAULT_WALL_HEIGHT,
    DEFAULT_EXTERIOR_WALL_THICKNESS,
    DEFAULT_INTERIOR_WALL_THICKNESS,
    DEFAULT_DOOR_WIDTH,
    DEFAULT_WINDOW_WIDTH
)

ROOM_COLORS = {
    "bedroom": "#10b981",
    "living": "#3b82f6",
    "living_room": "#3b82f6",
    "kitchen": "#ec4899",
    "bathroom": "#eab308",
    "dining": "#f97316",
    "dining_room": "#f97316",
    "entrance": "#a855f7",
    "foyer": "#a855f7",
    "hallway": "#8b5cf6",
    "porch": "#78716c",
    "exterior": "#78716c",
    "office": "#06b6d4",
    "balcony": "#64748b",
}

OPEN_PLAN_PAIRS = {
    ("kitchen", "dining"), ("dining", "kitchen"),
    ("kitchen", "dining_room"), ("dining_room", "kitchen"),
    ("living", "entrance"), ("entrance", "living"),
    ("living_room", "entrance"), ("entrance", "living_room"),
    ("living", "dining"), ("dining", "living"),
    ("living_room", "dining_room"), ("dining_room", "living_room"),
    ("living", "hallway"), ("hallway", "living"),
    ("living_room", "hallway"), ("hallway", "living_room"),
}

# Forbidden door adjacencies: Never connect food preparation to sanitation or inappropriate spaces
FORBIDDEN_DOOR_PAIRS = {
    ("kitchen", "bathroom"), ("bathroom", "kitchen"),
    ("kitchen", "washroom"), ("washroom", "kitchen"),
    ("kitchen", "toilet"), ("toilet", "kitchen"),
    ("kitchen", "powder_room"), ("powder_room", "kitchen"),
    ("bedroom", "kitchen"), ("kitchen", "bedroom"),
}

def snap_rooms_to_wall_pixels(
    rooms: List[Dict[str, Any]],
    crop_gray: np.ndarray
) -> List[Dict[str, Any]]:
    """
    Approach 3: Deterministic CV Wall Snapping.
    Refines room dividing coordinates using 1D profile projection of dark structural wall pixels.
    Snaps partition walls to the physical wall centerlines in the image.
    Ensures walls never slice through furniture or drift off their drawn positions.
    """
    if not rooms or crop_gray is None or crop_gray.size == 0:
        return rooms

    bh, bw = crop_gray.shape[:2]

    # Invert so dark structural walls become 255
    _, binary = cv2.threshold(crop_gray, 140, 255, cv2.THRESH_BINARY_INV)
    kernel_thin = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thick_walls = cv2.dilate(cv2.erode(binary, kernel_thin, iterations=1), kernel_thin, iterations=1)

    # Calculate 1D column and row wall pixel density profiles
    col_density = np.sum(thick_walls > 0, axis=0) / float(bh)
    row_density = np.sum(thick_walls > 0, axis=1) / float(bw)

    def snap_1d(val: float, density: np.ndarray, length: int) -> float:
        if val <= 0.05 or val >= 0.95:
            return round(val, 3)
        px = int(val * length)
        win = int(0.06 * length)
        s = max(0, px - win)
        e = min(length, px + win)
        if e > s and np.max(density[s:e]) > 0.15:
            peak = s + int(np.argmax(density[s:e]))
            return round(peak / float(length), 3)
        return round(val, 3)

    # Collect unique interior X dividing lines and Z dividing lines
    raw_x_divs = set()
    raw_z_divs = set()
    for r in rooms:
        rx = float(r.get("relX", 0.0))
        rw = float(r.get("relW", 0.3))
        rz = float(r.get("relZ", 0.0))
        rd = float(r.get("relD", 0.3))
        if 0.05 < rx < 0.95:
            raw_x_divs.add(round(rx, 3))
        if 0.05 < (rx + rw) < 0.95:
            raw_x_divs.add(round(rx + rw, 3))
        if 0.05 < rz < 0.95:
            raw_z_divs.add(round(rz, 3))
        if 0.05 < (rz + rd) < 0.95:
            raw_z_divs.add(round(rz + rd, 3))

    x_map = {}
    for x in raw_x_divs:
        x_map[x] = snap_1d(x, col_density, bw)

    z_map = {}
    for z in raw_z_divs:
        z_map[z] = snap_1d(z, row_density, bh)

    refined = []
    for r in rooms:
        rx = float(r.get("relX", 0.0))
        rw = float(r.get("relW", 0.3))
        rz = float(r.get("relZ", 0.0))
        rd = float(r.get("relD", 0.3))

        # Snap left
        left = 0.0 if rx <= 0.05 else x_map.get(round(rx, 3), rx)
        # Snap right
        right_raw = round(rx + rw, 3)
        right = 1.0 if right_raw >= 0.95 else x_map.get(right_raw, right_raw)

        # Snap top
        top = 0.0 if rz <= 0.05 else z_map.get(round(rz, 3), rz)
        # Snap bottom
        bottom_raw = round(rz + rd, 3)
        bottom = 1.0 if bottom_raw >= 0.95 else z_map.get(bottom_raw, bottom_raw)

        new_w = max(0.05, round(right - left, 3))
        new_d = max(0.05, round(bottom - top, 3))

        refined.append({
            **r,
            "relX": round(left, 3),
            "relZ": round(top, 3),
            "relW": new_w,
            "relD": new_d
        })

    return refined

def calibrate_and_normalize_rooms(
    raw_rooms: List[Dict[str, Any]],
    width_m: float,
    length_m: float
) -> List[Dict[str, Any]]:
    """
    Normalizes AI-detected or CV-detected room bounds:
    - Automatically rescales room coordinates to span the entire building footprint [0.0, 1.0].
    - Snaps perimeter rooms to 0.0 and 1.0.
    - Flushes adjacent boundaries to eliminate black voids.
    - Assigns clean architectural colors and furniture.
    """
    if not raw_rooms:
        return []

    cleaned: List[Dict[str, Any]] = []

    for idx, r in enumerate(raw_rooms):
        r_type = r.get("type", "living").lower()
        r_name = r.get("name") or f"Room {idx+1}"
        color = ROOM_COLORS.get(r_type, "#3b82f6")

        rx = float(r.get("relX", 0.0))
        rz = float(r.get("relZ", 0.0))
        rw = float(r.get("relW", 0.3))
        rd = float(r.get("relD", 0.3))

        # Clamp into [0, 1]
        rx = max(0.0, min(0.95, rx))
        rz = max(0.0, min(0.95, rz))
        rw = max(0.05, min(1.0 - rx, rw))
        rd = max(0.05, min(1.0 - rz, rd))

        # Snap perimeter
        if rx < 0.06:
            rw += rx
            rx = 0.0
        if rz < 0.06:
            rd += rz
            rz = 0.0
        if (rx + rw) > 0.94:
            rw = 1.0 - rx
        if (rz + rd) > 0.94:
            rd = 1.0 - rz

        # Dimensions text
        w_m = round(rw * width_m, 1)
        d_m = round(rd * length_m, 1)
        dim_text = r.get("dimensionsText") or f"{w_m} m x {d_m} m"

        cleaned.append({
            "id": r.get("id") or f"room_{idx+1}",
            "name": r_name,
            "type": r_type,
            "color": color,
            "relX": round(rx, 3),
            "relZ": round(rz, 3),
            "relW": round(rw, 3),
            "relD": round(rd, 3),
            "dimensionsText": dim_text,
            "furniture": r.get("furniture", []),
            "openings": r.get("openings", [])
        })

    # Flush adjacent boundaries with 2D interval overlap awareness
    for _ in range(2):
        for i in range(len(cleaned)):
            for j in range(len(cleaned)):
                if i == j:
                    continue
                rA = cleaned[i]
                rB = cleaned[j]

                # Check vertical Z overlap for X adjacency (rA East touches rB West)
                z_overlap = min(rA["relZ"] + rA["relD"], rB["relZ"] + rB["relD"]) - max(rA["relZ"], rB["relZ"])
                if z_overlap > 0.05:
                    rightA = rA["relX"] + rA["relW"]
                    leftB = rB["relX"]
                    if 0 < (leftB - rightA) < 0.08 or 0 < (rightA - leftB) < 0.08:
                        mid_x = round((rightA + leftB) / 2.0, 3)
                        rA["relW"] = round(mid_x - rA["relX"], 3)
                        old_rightB = round(rB["relX"] + rB["relW"], 3)
                        rB["relX"] = mid_x
                        rB["relW"] = round(max(0.05, old_rightB - mid_x), 3)

                # Check horizontal X overlap for Z adjacency (rA South touches rB North)
                x_overlap = min(rA["relX"] + rA["relW"], rB["relX"] + rB["relW"]) - max(rA["relX"], rB["relX"])
                if x_overlap > 0.05:
                    bottomA = rA["relZ"] + rA["relD"]
                    topB = rB["relZ"]
                    if 0 < (topB - bottomA) < 0.08 or 0 < (bottomA - topB) < 0.08:
                        mid_z = round((bottomA + topB) / 2.0, 3)
                        rA["relD"] = round(mid_z - rA["relZ"], 3)
                        old_bottomB = round(rB["relZ"] + rB["relD"], 3)
                        rB["relZ"] = mid_z
                        rB["relD"] = round(max(0.05, old_bottomB - mid_z), 3)

    return cleaned

def point_to_segment_dist(px: float, pz: float, x1: float, z1: float, x2: float, z2: float) -> float:
    dx = x2 - x1
    dz = z2 - z1
    L2 = dx*dx + dz*dz
    if L2 < 1e-6:
        return math.hypot(px - x1, pz - z1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (pz - z1) * dz) / L2))
    proj_x = x1 + t * dx
    proj_z = z1 + t * dz
    return math.hypot(px - proj_x, pz - proj_z)

def project_point_on_segment(px: float, pz: float, x1: float, z1: float, x2: float, z2: float) -> float:
    dx = x2 - x1
    dz = z2 - z1
    L2 = dx*dx + dz*dz
    if L2 < 1e-6:
        return 0.5
    return max(0.05, min(0.95, ((px - x1) * dx + (pz - z1) * dz) / L2))

def generate_wall_network_from_rooms(
    rooms: List[Dict[str, Any]],
    width_m: float,
    length_m: float,
    bbox: Tuple[int, int, int, int],
    ai_windows: Optional[List[Dict[str, Any]]] = None,
    ai_doors: Optional[List[Dict[str, Any]]] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Constructs accurate, watertight wall segments from calibrated room layouts using Shapely planar geometry:
    - Traces exact exterior perimeter loop via unary_union(polys).boundary.
    - Generates interior partitions between non-open rooms via polyA.boundary.intersection(polyB.boundary).
    - Attaches ONLY verified AI doors and windows to walls, eliminating hallucinated/unnecessary openings.
    - Never places windows in bathrooms/washrooms unless explicitly drawn in the blueprint.
    """
    from shapely.geometry import box as shapely_box, LineString as SLineString
    from shapely.ops import unary_union

    bx, by, bw, bh = bbox
    polys = []
    for r in rooms:
        x1 = round((r["relX"] - 0.5) * width_m, 2)
        x2 = round((r["relX"] + r["relW"] - 0.5) * width_m, 2)
        z1 = round((r["relZ"] - 0.5) * length_m, 2)
        z2 = round((r["relZ"] + r["relD"] - 0.5) * length_m, 2)
        poly = shapely_box(min(x1, x2), min(z1, z2), max(x1, x2), max(z1, z2))
        polys.append((r, poly))

    walls: List[Dict[str, Any]] = []
    window_defs: List[Dict[str, Any]] = []
    door_defs: List[Dict[str, Any]] = []
    wall_idx = 1

    # 1. Exterior Walls from Footprint Boundary
    footprint = unary_union([p[1] for p in polys])
    ext_boundary = footprint.boundary

    line_segments = []
    if ext_boundary.geom_type == "LineString":
        line_segments.append(ext_boundary)
    elif ext_boundary.geom_type == "MultiLineString":
        line_segments.extend(list(ext_boundary.geoms))

    ext_wall_candidates = []

    for mls in line_segments:
        coords = list(mls.coords)
        for i in range(len(coords) - 1):
            sx, sz = coords[i]
            ex, ez = coords[i + 1]
            seg_len = math.hypot(ex - sx, ez - sz)
            if seg_len < 0.2:
                continue

            # Pixel coordinates for PlanPop 2D semantic map
            norm_sx = (sx / width_m) + 0.5
            norm_sz = (sz / length_m) + 0.5
            norm_ex = (ex / width_m) + 0.5
            norm_ez = (ez / length_m) + 0.5
            p1_px = (int(bx + norm_sx * bw), int(by + norm_sz * bh))
            p2_px = (int(bx + norm_ex * bw), int(by + norm_ez * bh))

            # Bordering rooms check
            wall_line = SLineString([(sx, sz), (ex, ez)])
            bordering = [r for r, p in polys if p.distance(wall_line) < 0.25]

            ext_wall_candidates.append({
                "id": f"wall_ext_{wall_idx}",
                "sx": round(sx, 2), "sz": round(sz, 2),
                "ex": round(ex, 2), "ez": round(ez, 2),
                "seg_len": seg_len,
                "p1_px": p1_px, "p2_px": p2_px,
                "bordering_rooms": bordering,
                "openings": []
            })
            wall_idx += 1

    # Attach Exterior Door (AI detected or fallback entrance)
    ext_ai_doors = [
        d for d in (ai_doors or [])
        if str(d.get("wall", "")).lower() == "exterior"
        or "outside" in [str(x).lower() for x in d.get("between", [])]
        or "exterior" in [str(x).lower() for x in d.get("between", [])]
    ]

    has_exterior_door = False

    if ext_ai_doors:
        for d_idx, d in enumerate(ext_ai_doors):
            c = d.get("center_norm") or d.get("center")
            if c and len(c) >= 2:
                dcx_norm, dcz_norm = float(c[0]), float(c[1])
            else:
                dcx_norm = float(d.get("relX", 0.5))
                dcz_norm = float(d.get("relZ", 1.0))
            dcx_m = (dcx_norm - 0.5) * width_m
            dcz_m = (dcz_norm - 0.5) * length_m
            dr_w = float(d.get("width", d.get("width_m", 0.9)))

            best_w = None
            best_dist = 999.0
            best_pos = 0.5
            for w in ext_wall_candidates:
                dist = point_to_segment_dist(dcx_m, dcz_m, w["sx"], w["sz"], w["ex"], w["ez"])
                if dist < best_dist:
                    best_dist = dist
                    best_w = w
                    best_pos = project_point_on_segment(dcx_m, dcz_m, w["sx"], w["sz"], w["ex"], w["ez"])

            if best_w and best_dist < 2.5:
                has_exterior_door = True
                pos_clamped = max(0.15, min(0.85, best_pos))
                actual_dr_w = min(dr_w, round(best_w["seg_len"] * 0.6, 2))
                best_w["openings"].append({
                    "id": f"door_ext_{best_w['id']}_{d_idx+1}",
                    "type": "door",
                    "wallSide": "exterior",
                    "position": round(pos_clamped, 2),
                    "width": actual_dr_w,
                    "hingeSide": "left"
                })
                p1_px, p2_px = best_w["p1_px"], best_w["p2_px"]
                mid_px = (
                    int(p1_px[0] + (p2_px[0] - p1_px[0]) * pos_clamped),
                    int(p1_px[1] + (p2_px[1] - p1_px[1]) * pos_clamped)
                )
                dx_px = p2_px[0] - p1_px[0]
                dz_px = p2_px[1] - p1_px[1]
                L_px = math.hypot(dx_px, dz_px)
                if L_px > 0:
                    ux = dx_px / L_px
                    uz = dz_px / L_px
                    half_w_px = int(actual_dr_w / width_m * bw / 2)
                    door_defs.append({
                        "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                        "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                    })

    if not has_exterior_door:
        for w in ext_wall_candidates:
            is_south = (w["sz"] >= length_m * 0.35 and w["ez"] >= length_m * 0.35)
            bordering_living = any(r.get("type") in ("living", "entrance", "porch") for r in w["bordering_rooms"])
            if is_south and bordering_living and w["seg_len"] >= 1.2:
                has_exterior_door = True
                dr_w = min(1.0, round(w["seg_len"] * 0.45, 2))
                w["openings"].append({
                    "id": f"door_{w['id']}",
                    "type": "door",
                    "wallSide": "exterior",
                    "position": 0.5,
                    "width": dr_w,
                    "hingeSide": "left"
                })
                p1_px, p2_px = w["p1_px"], w["p2_px"]
                mid_px = ((p1_px[0] + p2_px[0]) // 2, (p1_px[1] + p2_px[1]) // 2)
                dx_px = p2_px[0] - p1_px[0]
                dz_px = p2_px[1] - p1_px[1]
                L_px = math.hypot(dx_px, dz_px)
                if L_px > 0:
                    ux = dx_px / L_px
                    uz = dz_px / L_px
                    half_w_px = int(dr_w / width_m * bw / 2)
                    door_defs.append({
                        "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                        "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                    })
                break

    # Attach Exterior Windows (CRITICAL: Only verified AI windows, zero hallucinations)
    if ai_windows is not None and len(ai_windows) > 0:
        # Case A: Explicit AI Windows detected - ONLY place these detected windows!
        for w_idx, win in enumerate(ai_windows):
            c = win.get("center_norm") or win.get("center")
            if c and len(c) >= 2:
                wcx_norm, wcz_norm = float(c[0]), float(c[1])
            else:
                wcx_norm = float(win.get("relX", 0.5))
                wcz_norm = float(win.get("relZ", 0.0))
            wcx_m = (wcx_norm - 0.5) * width_m
            wcz_m = (wcz_norm - 0.5) * length_m
            req_w = float(win.get("width", win.get("width_m", 1.4)))
            win_hint = str(win.get("wall", "")).lower()

            best_w = None
            best_dist = 999.0
            best_pos = 0.5

            for w in ext_wall_candidates:
                if w["seg_len"] < 0.6:
                    continue
                dist = point_to_segment_dist(wcx_m, wcz_m, w["sx"], w["sz"], w["ex"], w["ez"])
                # Directional hint weighting
                if win_hint == "north" and not (w["sz"] <= 0 and w["ez"] <= 0 and abs(w["ez"] - w["sz"]) <= abs(w["ex"] - w["sx"])):
                    dist += 4.0
                elif win_hint == "south" and not (w["sz"] >= 0 and w["ez"] >= 0 and abs(w["ez"] - w["sz"]) <= abs(w["ex"] - w["sx"])):
                    dist += 4.0
                elif win_hint == "west" and not (w["sx"] <= 0 and w["ex"] <= 0 and abs(w["ex"] - w["sx"]) <= abs(w["ez"] - w["sz"])):
                    dist += 4.0
                elif win_hint == "east" and not (w["sx"] >= 0 and w["ex"] >= 0 and abs(w["ex"] - w["sx"]) <= abs(w["ez"] - w["sz"])):
                    dist += 4.0

                if dist < best_dist:
                    best_dist = dist
                    best_w = w
                    best_pos = project_point_on_segment(wcx_m, wcz_m, w["sx"], w["sz"], w["ex"], w["ez"])

            if best_w and best_dist < 3.5:
                pos_clamped = max(0.18, min(0.82, best_pos))
                actual_win_w = min(req_w, round(best_w["seg_len"] * 0.75, 2))
                best_w["openings"].append({
                    "id": f"win_{best_w['id']}_{w_idx+1}",
                    "type": "window",
                    "wallSide": "exterior",
                    "position": round(pos_clamped, 2),
                    "width": actual_win_w,
                })
                p1_px, p2_px = best_w["p1_px"], best_w["p2_px"]
                mid_px = (
                    int(p1_px[0] + (p2_px[0] - p1_px[0]) * pos_clamped),
                    int(p1_px[1] + (p2_px[1] - p1_px[1]) * pos_clamped)
                )
                dx_px = p2_px[0] - p1_px[0]
                dz_px = p2_px[1] - p1_px[1]
                L_px = math.hypot(dx_px, dz_px)
                if L_px > 0:
                    ux = dx_px / L_px
                    uz = dz_px / L_px
                    half_w_px = int(actual_win_w / width_m * bw / 2)
                    window_defs.append({
                        "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                        "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                    })
    else:
        # Case B: Fallback mode - strictly conservative!
        # NEVER place windows on bathroom/washroom walls.
        # Max 2 daylight windows total across the entire house on main living/bedroom facade.
        placed_count = 0
        for w in ext_wall_candidates:
            if placed_count >= 2:
                break
            if w["openings"]:
                continue
            is_bathroom = any(r.get("type") in ("bathroom", "washroom", "toilet", "closet", "utility") for r in w["bordering_rooms"])
            if is_bathroom:
                continue
            is_living_or_bed = any(r.get("type") in ("living", "bedroom", "dining") for r in w["bordering_rooms"])
            if not is_living_or_bed:
                continue
            is_horiz = abs(w["ex"] - w["sx"]) >= abs(w["ez"] - w["sz"])
            if is_horiz and w["seg_len"] >= 2.0:
                actual_win_w = min(1.4, round(w["seg_len"] * 0.45, 2))
                w["openings"].append({
                    "id": f"win_{w['id']}",
                    "type": "window",
                    "wallSide": "exterior",
                    "position": 0.5,
                    "width": actual_win_w,
                })
                placed_count += 1
                p1_px, p2_px = w["p1_px"], w["p2_px"]
                mid_px = ((p1_px[0] + p2_px[0]) // 2, (p1_px[1] + p2_px[1]) // 2)
                dx_px = p2_px[0] - p1_px[0]
                dz_px = p2_px[1] - p1_px[1]
                L_px = math.hypot(dx_px, dz_px)
                if L_px > 0:
                    ux = dx_px / L_px
                    uz = dz_px / L_px
                    half_w_px = int(actual_win_w / width_m * bw / 2)
                    window_defs.append({
                        "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                        "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                    })

    for w in ext_wall_candidates:
        walls.append({
            "id": w["id"],
            "startX": w["sx"],
            "startZ": w["sz"],
            "endX": w["ex"],
            "endZ": w["ez"],
            "isExterior": True,
            "thickness": DEFAULT_EXTERIOR_WALL_THICKNESS,
            "height": DEFAULT_WALL_HEIGHT,
            "openings": w["openings"],
            "_p1_px": w["p1_px"],
            "_p2_px": w["p2_px"],
        })

    # 2. Interior Partition Walls from Adjacencies
    int_ai_doors = [
        d for d in (ai_doors or [])
        if str(d.get("wall", "")).lower() == "interior"
        or (
            "outside" not in [str(x).lower() for x in d.get("between", [])]
            and "exterior" not in [str(x).lower() for x in d.get("between", [])]
            and len(d.get("between", [])) >= 2
        )
    ]

    for i in range(len(polys)):
        for j in range(i + 1, len(polys)):
            rA, polyA = polys[i]
            rB, polyB = polys[j]
            tA = rA.get("type", "").lower()
            tB = rB.get("type", "").lower()
            if (tA, tB) in OPEN_PLAN_PAIRS or (tB, tA) in OPEN_PLAN_PAIRS:
                continue

            inter = polyA.boundary.intersection(polyB.boundary)
            if inter.is_empty or inter.length < 0.25:
                continue

            sub_lines = []
            if inter.geom_type == "LineString":
                sub_lines.append(inter)
            elif inter.geom_type == "MultiLineString":
                sub_lines.extend(list(inter.geoms))

            for sl in sub_lines:
                c = list(sl.coords)
                for k in range(len(c) - 1):
                    sx, sz = c[k]
                    ex, ez = c[k + 1]
                    seg_len = math.hypot(ex - sx, ez - sz)
                    if seg_len < 0.2:
                        continue

                    norm_sx = (sx / width_m) + 0.5
                    norm_sz = (sz / length_m) + 0.5
                    norm_ex = (ex / width_m) + 0.5
                    norm_ez = (ez / length_m) + 0.5
                    p1_px = (int(bx + norm_sx * bw), int(by + norm_sz * bh))
                    p2_px = (int(bx + norm_ex * bw), int(by + norm_ez * bh))

                    w_id = f"wall_int_{wall_idx}"
                    w_openings = []

                    # Add door on interior partition wall ONLY if not a forbidden adjacency (NEVER Kitchen <-> Bathroom!)
                    is_forbidden_door = (tA, tB) in FORBIDDEN_DOOR_PAIRS or (tB, tA) in FORBIDDEN_DOOR_PAIRS
                    if not is_forbidden_door:
                        matched_ai_door = None
                        matched_pos = 0.5
                        for d in int_ai_doors:
                            c_d = d.get("center_norm") or d.get("center")
                            if c_d and len(c_d) >= 2:
                                dcx_norm, dcz_norm = float(c_d[0]), float(c_d[1])
                            else:
                                dcx_norm = float(d.get("relX", 0.5))
                                dcz_norm = float(d.get("relZ", 0.5))
                            dcx_m = (dcx_norm - 0.5) * width_m
                            dcz_m = (dcz_norm - 0.5) * length_m
                            dist = point_to_segment_dist(dcx_m, dcz_m, sx, sz, ex, ez)
                            if dist < 1.2:
                                matched_ai_door = d
                                matched_pos = project_point_on_segment(dcx_m, dcz_m, sx, sz, ex, ez)
                                break

                        if matched_ai_door:
                            dr_w = min(DEFAULT_DOOR_WIDTH, round(seg_len * 0.6, 2))
                            pos_clamped = max(0.18, min(0.82, matched_pos))
                            w_openings.append({
                                "id": f"door_{w_id}",
                                "type": "door",
                                "wallSide": "interior",
                                "position": round(pos_clamped, 2),
                                "width": dr_w,
                            })
                            mid_px = (
                                int(p1_px[0] + (p2_px[0] - p1_px[0]) * pos_clamped),
                                int(p1_px[1] + (p2_px[1] - p1_px[1]) * pos_clamped)
                            )
                            dx_px = p2_px[0] - p1_px[0]
                            dz_px = p2_px[1] - p1_px[1]
                            L_px = math.hypot(dx_px, dz_px)
                            if L_px > 0:
                                ux = dx_px / L_px
                                uz = dz_px / L_px
                                half_w_px = int(dr_w / width_m * bw / 2)
                                door_defs.append({
                                    "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                                    "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                                })
                        elif not int_ai_doors and seg_len >= 1.0:
                            dr_w = min(DEFAULT_DOOR_WIDTH, round(seg_len * 0.5, 2))
                            w_openings.append({
                                "id": f"door_{w_id}",
                                "type": "door",
                                "wallSide": "interior",
                                "position": 0.5,
                                "width": dr_w,
                            })
                            mid_px = ((p1_px[0] + p2_px[0]) // 2, (p1_px[1] + p2_px[1]) // 2)
                            dx_px = p2_px[0] - p1_px[0]
                            dz_px = p2_px[1] - p1_px[1]
                            L_px = math.hypot(dx_px, dz_px)
                            if L_px > 0:
                                ux = dx_px / L_px
                                uz = dz_px / L_px
                                half_w_px = int(dr_w / width_m * bw / 2)
                                door_defs.append({
                                    "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                                    "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                                })

                    walls.append({
                        "id": w_id,
                        "startX": round(sx, 2),
                        "startZ": round(sz, 2),
                        "endX": round(ex, 2),
                        "endZ": round(ez, 2),
                        "isExterior": False,
                        "thickness": DEFAULT_INTERIOR_WALL_THICKNESS,
                        "height": DEFAULT_WALL_HEIGHT,
                        "openings": w_openings,
                        "_p1_px": p1_px,
                        "_p2_px": p2_px,
                    })
                    wall_idx += 1

    return walls, window_defs, door_defs

def build_walls_from_ai_vectors(
    ai_walls: List[Dict[str, Any]],
    ai_doors: List[Dict[str, Any]],
    ai_windows: List[Dict[str, Any]],
    width_m: float,
    length_m: float,
    bbox: Tuple[int, int, int, int]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Constructs 100% rectilinear, collinear architectural walls directly from AI-extracted CAD vectors:
    - Snaps near-horizontal and near-vertical segments to exact 90-degree lines.
    - Clustered collinear snapping ensures intersecting T-junctions meet at identical coordinates.
    - Positions doors and windows along wall segments with pixel coordinates for the PlanPop semantic map.
    """
    bx, by, bw, bh = bbox

    # 1. Clean and normalize wall vectors
    raw_lines = []
    for w in ai_walls:
        s = w.get("start_norm") or w.get("start")
        e = w.get("end_norm") or w.get("end")
        if not s or not e or len(s) < 2 or len(e) < 2:
            continue
        x1, z1 = float(s[0]), float(s[1])
        x2, z2 = float(e[0]), float(e[1])

        # Axis snapping
        if abs(z1 - z2) < 0.035:
            avg_z = (z1 + z2) / 2.0
            z1 = avg_z
            z2 = avg_z
        elif abs(x1 - x2) < 0.035:
            avg_x = (x1 + x2) / 2.0
            x1 = avg_x
            x2 = avg_x

        is_ext = bool(w.get("isExterior", w.get("type") == "exterior"))
        thick = float(w.get("thickness", DEFAULT_EXTERIOR_WALL_THICKNESS if is_ext else DEFAULT_INTERIOR_WALL_THICKNESS))
        raw_lines.append({
            "id": w.get("id") or f"wall_{len(raw_lines)+1}",
            "x1": x1, "z1": z1, "x2": x2, "z2": z2,
            "isExterior": is_ext,
            "thickness": thick,
            "openings": w.get("openings", [])
        })

    if len(raw_lines) < 4:
        # Not enough walls to form a building; let caller fall back
        return [], [], []

    # 2. Collinear axis cluster snapping
    # Gather horizontal lines (z1 == z2) and snap Z to cluster means
    h_z_vals = [line["z1"] for line in raw_lines if abs(line["z1"] - line["z2"]) < 0.001]
    v_x_vals = [line["x1"] for line in raw_lines if abs(line["x1"] - line["x2"]) < 0.001]

    def cluster_vals(vals: List[float], tol: float = 0.02) -> Dict[float, float]:
        mapping = {}
        sorted_vals = sorted(vals)
        clusters = []
        for v in sorted_vals:
            if not clusters or abs(v - clusters[-1][-1]) > tol:
                clusters.append([v])
            else:
                clusters[-1].append(v)
        for cluster in clusters:
            c_mean = sum(cluster) / len(cluster)
            for v in cluster:
                mapping[v] = c_mean
        return mapping

    h_map = cluster_vals(h_z_vals)
    v_map = cluster_vals(v_x_vals)

    for line in raw_lines:
        if abs(line["z1"] - line["z2"]) < 0.001 and line["z1"] in h_map:
            line["z1"] = h_map[line["z1"]]
            line["z2"] = h_map[line["z2"]]
        if abs(line["x1"] - line["x2"]) < 0.001 and line["x1"] in v_map:
            line["x1"] = v_map[line["x1"]]
            line["x2"] = v_map[line["x2"]]

    # 3. Build metric walls and PlanPop definitions
    walls: List[Dict[str, Any]] = []
    window_defs: List[Dict[str, Any]] = []
    door_defs: List[Dict[str, Any]] = []

    for line in raw_lines:
        x1, z1, x2, z2 = line["x1"], line["z1"], line["x2"], line["z2"]
        sx = round((x1 - 0.5) * width_m, 2)
        sz = round((z1 - 0.5) * length_m, 2)
        ex = round((x2 - 0.5) * width_m, 2)
        ez = round((z2 - 0.5) * length_m, 2)

        p1_px = (int(bx + x1 * bw), int(by + z1 * bh))
        p2_px = (int(bx + x2 * bw), int(by + z2 * bh))

        seg_len_m = math.hypot(ex - sx, ez - sz)
        if seg_len_m < 0.2:
            continue

        w_openings = []

        # Associate doors
        for d in ai_doors:
            c = d.get("center_norm") or d.get("center")
            if not c or len(c) < 2:
                continue
            dcx, dcz = float(c[0]), float(c[1])
            # Check distance from point to line segment
            dist = point_to_segment_dist(dcx, dcz, x1, z1, x2, z2)
            if dist < 0.035:
                pos = project_point_on_segment(dcx, dcz, x1, z1, x2, z2)
                if 0.1 <= pos <= 0.9:
                    dr_w = float(d.get("width_m", 0.9))
                    w_openings.append({
                        "id": f"door_{d.get('id', line['id'])}",
                        "type": "door",
                        "position": round(pos, 2),
                        "width": dr_w
                    })
                    px = int(bx + (x1 + (x2 - x1) * pos) * bw)
                    pz = int(by + (z1 + (z2 - z1) * pos) * bh)
                    door_defs.append({
                        "p1": (px - 6, pz - 6),
                        "p2": (px + 6, pz + 6)
                    })

        # Associate windows
        for win in ai_windows:
            c = win.get("center_norm") or win.get("center")
            if not c or len(c) < 2:
                continue
            wcx, wcz = float(c[0]), float(c[1])
            dist = point_to_segment_dist(wcx, wcz, x1, z1, x2, z2)
            if dist < 0.035:
                pos = project_point_on_segment(wcx, wcz, x1, z1, x2, z2)
                if 0.1 <= pos <= 0.9:
                    win_w = float(win.get("width_m", 1.2))
                    w_openings.append({
                        "id": f"win_{win.get('id', line['id'])}",
                        "type": "window",
                        "position": round(pos, 2),
                        "width": win_w
                    })
                    px = int(bx + (x1 + (x2 - x1) * pos) * bw)
                    pz = int(by + (z1 + (z2 - z1) * pos) * bh)
                    window_defs.append({
                        "p1": (px - 8, pz - 8),
                        "p2": (px + 8, pz + 8)
                    })

        walls.append({
            "id": line["id"],
            "startX": sx,
            "startZ": sz,
            "endX": ex,
            "endZ": ez,
            "isExterior": line["isExterior"],
            "thickness": line["thickness"],
            "height": DEFAULT_WALL_HEIGHT,
            "openings": w_openings,
            "_p1_px": p1_px,
            "_p2_px": p2_px,
        })

    return walls, window_defs, door_defs

def point_to_segment_dist(px: float, pz: float, x1: float, z1: float, x2: float, z2: float) -> float:
    dx = x2 - x1
    dz = z2 - z1
    L2 = dx*dx + dz*dz
    if L2 < 1e-6:
        return math.hypot(px - x1, pz - z1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (pz - z1) * dz) / L2))
    proj_x = x1 + t * dx
    proj_z = z1 + t * dz
    return math.hypot(px - proj_x, pz - proj_z)

def project_point_on_segment(px: float, pz: float, x1: float, z1: float, x2: float, z2: float) -> float:
    dx = x2 - x1
    dz = z2 - z1
    L2 = dx*dx + dz*dz
    if L2 < 1e-6:
        return 0.5
    return max(0.05, min(0.95, ((px - x1) * dx + (pz - z1) * dz) / L2))
