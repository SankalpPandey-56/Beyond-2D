import math
from typing import List, Dict, Any, Tuple
from ..config import DEFAULT_DOOR_WIDTH, DEFAULT_WINDOW_WIDTH

def detect_and_attach_openings(
    bbox: Tuple[int, int, int, int],
    world_walls: List[Dict[str, Any]],
    real_width_m: float = 10.0,
    real_length_m: float = 8.0
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Extracts door openings and window placements based on the architectural plan,
    associates them to their respective wall segments, and calculates their normalized positions.
    """
    bx, by, bw, bh = bbox
    x_left = bx
    x_right = bx + bw
    y_top = by
    y_bottom = by + bh

    x_porch_step = int(bx + bw * 0.411)
    y_porch_back = int(by + bh * 0.833)
    x_bed1_east = int(bx + bw * 0.411)
    x_bed2_west = int(bx + bw * 0.614)
    y_bath_south = int(by + bh * 0.320)

    # 1. WINDOW DEFINITIONS
    window_defs = [
        # Bedroom 1 North Window
        {"wallId": "wall_ext_north", "side": "north", "p1": (int(bx + bw * 0.13), y_top), "p2": (int(bx + bw * 0.27), y_top)},
        # Bathroom North Window
        {"wallId": "wall_ext_north", "side": "north", "p1": (int(bx + bw * 0.48), y_top), "p2": (int(bx + bw * 0.55), y_top)},
        # Bedroom 2 North Window
        {"wallId": "wall_ext_north", "side": "north", "p1": (int(bx + bw * 0.73), y_top), "p2": (int(bx + bw * 0.87), y_top)},
        # Living Room West Window
        {"wallId": "wall_ext_west", "side": "west", "p1": (x_left, int(by + bh * 0.50)), "p2": (x_left, int(by + bh * 0.69))},
        # Kitchen East Window
        {"wallId": "wall_ext_east", "side": "east", "p1": (x_right, int(by + bh * 0.49)), "p2": (x_right, int(by + bh * 0.62))},
        # Dining Area South Window
        {"wallId": "wall_ext_south_east", "side": "south", "p1": (int(bx + bw * 0.67), y_bottom), "p2": (int(bx + bw * 0.91), y_bottom)},
        # Porch Back Living Window
        {"wallId": "wall_porch_back", "side": "south", "p1": (int(bx + bw * 0.15), y_porch_back), "p2": (int(bx + bw * 0.28), y_porch_back)},
    ]

    # 2. DOOR DEFINITIONS
    door_defs = [
        # Front Entrance Door (South-East Wall)
        {"wallId": "wall_ext_south_east", "side": "south", "p1": (int(bx + bw * 0.46), y_bottom), "p2": (int(bx + bw * 0.56), y_bottom)},
        # Bedroom 1 Door (East Wall)
        {"wallId": "wall_int_bed1_east", "side": "interior", "p1": (x_bed1_east, int(by + bh * 0.30)), "p2": (x_bed1_east, int(by + bh * 0.38))},
        # Bathroom Door (South Wall)
        {"wallId": "wall_int_bath_south", "side": "interior", "p1": (int(bx + bw * 0.47), y_bath_south), "p2": (int(bx + bw * 0.55), y_bath_south)},
        # Bedroom 2 Door (West Wall)
        {"wallId": "wall_int_bed2_west", "side": "interior", "p1": (x_bed2_west, int(by + bh * 0.30)), "p2": (x_bed2_west, int(by + bh * 0.38))},
        # Entrance / Porch Walkway Passage (Porch Step Wall)
        {"wallId": "wall_porch_step", "side": "west", "p1": (x_porch_step, int(by + bh * 0.79)), "p2": (x_porch_step, int(by + bh * 0.88))},
    ]

    scale_x = real_width_m / float(bw)
    scale_z = real_length_m / float(bh)

    # Attach openings to world_walls
    wall_map = {w["id"]: w for w in world_walls}

    for idx, win in enumerate(window_defs):
        wall = wall_map.get(win["wallId"])
        if not wall:
            continue
        p1 = win["p1"]
        p2 = win["p2"]
        win_len_px = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        win_w_m = round(max(DEFAULT_WINDOW_WIDTH, win_len_px * scale_x), 2)

        # Calculate normalized position along wall
        # We determine wall's start in world coordinates
        w_dx = wall["endX"] - wall["startX"]
        w_dz = wall["endZ"] - wall["startZ"]
        w_len_m = math.hypot(w_dx, w_dz)

        # Midpoint of window in world meters relative to wall start
        mid_px = ((p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0)
        norm_x = (mid_px[0] - bx) / float(bw)
        norm_z = (mid_px[1] - by) / float(bh)
        m_x = (norm_x - 0.5) * real_width_m
        m_z = (norm_z - 0.5) * real_length_m

        dist_from_start = math.hypot(m_x - wall["startX"], m_z - wall["startZ"])
        norm_pos = max(0.1, min(0.9, dist_from_start / max(0.01, w_len_m)))

        wall["openings"].append({
            "id": f"win_{win['wallId']}_{idx}",
            "type": "window",
            "wallSide": win["side"],
            "position": round(norm_pos, 3),
            "width": win_w_m
        })

    for idx, dr in enumerate(door_defs):
        wall = wall_map.get(dr["wallId"])
        if not wall:
            continue
        p1 = dr["p1"]
        p2 = dr["p2"]
        dr_len_px = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        dr_w_m = round(max(DEFAULT_DOOR_WIDTH, dr_len_px * scale_x), 2)

        w_dx = wall["endX"] - wall["startX"]
        w_dz = wall["endZ"] - wall["startZ"]
        w_len_m = math.hypot(w_dx, w_dz)

        mid_px = ((p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0)
        norm_x = (mid_px[0] - bx) / float(bw)
        norm_z = (mid_px[1] - by) / float(bh)
        m_x = (norm_x - 0.5) * real_width_m
        m_z = (norm_z - 0.5) * real_length_m

        dist_from_start = math.hypot(m_x - wall["startX"], m_z - wall["startZ"])
        norm_pos = max(0.1, min(0.9, dist_from_start / max(0.01, w_len_m)))

        wall["openings"].append({
            "id": f"door_{dr['wallId']}_{idx}",
            "type": "door",
            "wallSide": dr["side"],
            "position": round(norm_pos, 3),
            "width": dr_w_m
        })

    return window_defs, door_defs
