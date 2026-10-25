import math
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
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

def generate_wall_network_from_rooms(
    rooms: List[Dict[str, Any]],
    width_m: float,
    length_m: float,
    bbox: Tuple[int, int, int, int]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Constructs accurate, watertight wall segments from calibrated room layouts using Shapely planar geometry:
    - Traces exact exterior perimeter loop via unary_union(polys).boundary.
    - Generates interior partitions between non-open rooms via polyA.boundary.intersection(polyB.boundary).
    - Automatically adds doors on partition walls and windows on exterior walls.
    """
    from shapely.geometry import box as shapely_box, LineString, MultiLineString
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

            w_id = f"wall_ext_{wall_idx}"
            w_openings = []

            # Add window if long exterior wall
            if seg_len >= 1.6:
                win_w = min(1.4, round(seg_len * 0.45, 2))
                w_openings.append({
                    "id": f"win_{w_id}",
                    "type": "window",
                    "wallSide": "exterior",
                    "position": 0.5,
                    "width": win_w,
                })
                mid_px = ((p1_px[0] + p2_px[0]) // 2, (p1_px[1] + p2_px[1]) // 2)
                dx_px = p2_px[0] - p1_px[0]
                dz_px = p2_px[1] - p1_px[1]
                L_px = math.hypot(dx_px, dz_px)
                if L_px > 0:
                    ux = dx_px / L_px
                    uz = dz_px / L_px
                    half_w_px = int(win_w / width_m * bw / 2)
                    window_defs.append({
                        "p1": (int(mid_px[0] - ux * half_w_px), int(mid_px[1] - uz * half_w_px)),
                        "p2": (int(mid_px[0] + ux * half_w_px), int(mid_px[1] + uz * half_w_px)),
                    })

            walls.append({
                "id": w_id,
                "startX": round(sx, 2),
                "startZ": round(sz, 2),
                "endX": round(ex, 2),
                "endZ": round(ez, 2),
                "isExterior": True,
                "thickness": DEFAULT_EXTERIOR_WALL_THICKNESS,
                "height": DEFAULT_WALL_HEIGHT,
                "openings": w_openings,
                "_p1_px": p1_px,
                "_p2_px": p2_px,
            })
            wall_idx += 1

    # 2. Interior Partition Walls from Adjacencies
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

                    # Add door on interior partition wall
                    if seg_len >= 1.0:
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
