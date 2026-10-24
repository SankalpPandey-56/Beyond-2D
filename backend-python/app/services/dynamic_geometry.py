import math
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

def calibrate_and_normalize_rooms(
    raw_rooms: List[Dict[str, Any]],
    width_m: float,
    length_m: float
) -> List[Dict[str, Any]]:
    """
    Normalizes AI-detected or CV-detected room bounds:
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

    # Flush adjacent boundaries (if gap < 0.08, snap to midpoint)
    for i in range(len(cleaned)):
        for j in range(i + 1, len(cleaned)):
            rA = cleaned[i]
            rB = cleaned[j]

            # X-adjacency: rA East touches rB West
            rightA = rA["relX"] + rA["relW"]
            leftB = rB["relX"]
            if abs(rightA - leftB) < 0.08:
                mid_x = (rightA + leftB) / 2.0
                rA["relW"] = round(mid_x - rA["relX"], 3)
                old_rightB = rB["relX"] + rB["relW"]
                rB["relX"] = round(mid_x, 3)
                rB["relW"] = round(max(0.05, old_rightB - mid_x), 3)

            # Z-adjacency: rA South touches rB North
            bottomA = rA["relZ"] + rA["relD"]
            topB = rB["relZ"]
            if abs(bottomA - topB) < 0.08:
                mid_z = (bottomA + topB) / 2.0
                rA["relD"] = round(mid_z - rA["relZ"], 3)
                old_bottomB = rB["relZ"] + rB["relD"]
                rB["relZ"] = round(mid_z, 3)
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
