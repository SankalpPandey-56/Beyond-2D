from typing import Dict, Any, List
import math
from .scale_calibration import DEFAULT_CONFIG


def build_structured_geometry(
    detected_features: Dict[str, Any],
    img_w: int,
    img_h: int,
    dimensions: Dict[str, float]
) -> Dict[str, Any]:
    raw_rooms = detected_features.get('rooms', [])
    raw_walls = detected_features.get('walls', [])

    total_w = dimensions['width']
    total_l = dimensions['length']
    wall_h = dimensions.get('wallHeight', DEFAULT_CONFIG['wall_height_m'])
    wall_t = dimensions.get('wallThickness', DEFAULT_CONFIG['wall_thickness_m'])

    # 1. Compute overall bounding envelope of all rooms in pixels
    if raw_rooms:
        min_x = min(r['x'] for r in raw_rooms)
        min_y = min(r['y'] for r in raw_rooms)
        max_x = max(r['x'] + r['w'] for r in raw_rooms)
        max_y = max(r['y'] + r['h'] for r in raw_rooms)
        bbox_w = max(1, max_x - min_x)
        bbox_h = max(1, max_y - min_y)
    else:
        # Fallback to full image
        min_x, min_y = 0, 0
        bbox_w, bbox_h = img_w, img_h

    # 2. Convert rooms to normalized coordinates (0.0 to 1.0)
    rooms = []
    for r in raw_rooms:
        rel_x = max(0.0, min(0.95, (r['x'] - min_x) / bbox_w))
        rel_z = max(0.0, min(0.95, (r['y'] - min_y) / bbox_h))
        rel_w = max(0.06, min(1.0 - rel_x, r['w'] / bbox_w))
        rel_d = max(0.06, min(1.0 - rel_z, r['h'] / bbox_h))

        metric_w = round(rel_w * total_w, 1)
        metric_d = round(rel_d * total_l, 1)

        # Generate openings for room
        openings = []
        # Exterior window if bordering perimeter
        if rel_z <= 0.08:
            openings.append({'id': f"{r['id']}_win_n", 'type': 'window', 'wallSide': 'north', 'position': 0.5, 'width': 1.3})
        elif rel_z + rel_d >= 0.92:
            openings.append({'id': f"{r['id']}_win_s", 'type': 'window', 'wallSide': 'south', 'position': 0.5, 'width': 1.3})

        if rel_x <= 0.08:
            openings.append({'id': f"{r['id']}_win_w", 'type': 'window', 'wallSide': 'west', 'position': 0.5, 'width': 1.3})
        elif rel_x + rel_w >= 0.92:
            openings.append({'id': f"{r['id']}_win_e", 'type': 'window', 'wallSide': 'east', 'position': 0.5, 'width': 1.3})

        # Interior doorway
        if r['type'] != 'porch':
            openings.append({'id': f"{r['id']}_door_in", 'type': 'door', 'wallSide': 'south' if rel_z < 0.5 else 'north', 'position': 0.6, 'width': 0.95})

        rooms.append({
            'id': r['id'],
            'name': r['name'],
            'type': r['type'],
            'color': r['color'],
            'relX': round(rel_x, 3),
            'relZ': round(rel_z, 3),
            'relW': round(rel_w, 3),
            'relD': round(rel_d, 3),
            'dimensionsText': f"{metric_w}m x {metric_d}m",
            'openings': openings,
        })

    # If no rooms were found, generate a baseline layout
    if not rooms:
        rooms = [
            {'id': 'room_1', 'name': 'Living Room', 'type': 'living', 'color': '#3b82f6', 'relX': 0.0, 'relZ': 0.35, 'relW': 0.55, 'relD': 0.45, 'dimensionsText': '5.5m x 3.6m', 'openings': [{'id': 'op_1', 'type': 'window', 'wallSide': 'west', 'position': 0.5, 'width': 1.4}]},
            {'id': 'room_2', 'name': 'Bedroom 1', 'type': 'bedroom', 'color': '#10b981', 'relX': 0.0, 'relZ': 0.0, 'relW': 0.4, 'relD': 0.35, 'dimensionsText': '4.0m x 2.8m', 'openings': [{'id': 'op_2', 'type': 'window', 'wallSide': 'north', 'position': 0.5, 'width': 1.2}]},
            {'id': 'room_3', 'name': 'Bedroom 2', 'type': 'bedroom', 'color': '#10b981', 'relX': 0.6, 'relZ': 0.0, 'relW': 0.4, 'relD': 0.35, 'dimensionsText': '4.0m x 2.8m', 'openings': [{'id': 'op_3', 'type': 'window', 'wallSide': 'north', 'position': 0.5, 'width': 1.2}]},
            {'id': 'room_4', 'name': 'Bathroom', 'type': 'bathroom', 'color': '#eab308', 'relX': 0.4, 'relZ': 0.0, 'relW': 0.2, 'relD': 0.25, 'dimensionsText': '2.0m x 2.0m', 'openings': [{'id': 'op_4', 'type': 'door', 'wallSide': 'south', 'position': 0.5, 'width': 0.85}]},
            {'id': 'room_5', 'name': 'Kitchen', 'type': 'kitchen', 'color': '#ec4899', 'relX': 0.55, 'relZ': 0.35, 'relW': 0.45, 'relD': 0.35, 'dimensionsText': '4.5m x 2.8m', 'openings': [{'id': 'op_5', 'type': 'window', 'wallSide': 'east', 'position': 0.5, 'width': 1.2}]},
            {'id': 'room_6', 'name': 'Porch', 'type': 'porch', 'color': '#78716c', 'relX': 0.0, 'relZ': 0.8, 'relW': 0.45, 'relD': 0.2, 'dimensionsText': '4.5m x 1.6m', 'openings': [{'id': 'op_6', 'type': 'door', 'wallSide': 'south', 'position': 0.5, 'width': 1.0}]},
        ]

    # Snap adjacent rooms
    snap_tolerance = 0.04
    for i in range(len(rooms)):
        for j in range(i + 1, len(rooms)):
            r1 = rooms[i]
            r2 = rooms[j]
            # X snapping
            if abs(r1['relX'] + r1['relW'] - r2['relX']) < snap_tolerance:
                r2['relX'] = r1['relX'] + r1['relW']
            elif abs(r2['relX'] + r2['relW'] - r1['relX']) < snap_tolerance:
                r1['relX'] = r2['relX'] + r2['relW']

            # Z snapping
            if abs(r1['relZ'] + r1['relD'] - r2['relZ']) < snap_tolerance:
                r2['relZ'] = r1['relZ'] + r1['relD']
            elif abs(r2['relZ'] + r2['relD'] - r1['relZ']) < snap_tolerance:
                r1['relZ'] = r2['relZ'] + r2['relD']

    # 3. Derive clean metric walls from room topologies
    half_w = total_w / 2.0
    half_l = total_l / 2.0
    to_world_x = lambda rx: round(rx * total_w - half_w, 2)
    to_world_z = lambda rz: round(rz * total_l - half_l, 2)

    raw_edges = []
    for r in rooms:
        if r['type'] == 'porch':
            continue
        left = to_world_x(r['relX'])
        right = to_world_x(r['relX'] + r['relW'])
        top = to_world_z(r['relZ'])
        bottom = to_world_z(r['relZ'] + r['relD'])

        raw_edges.append({'x1': left, 'z1': top, 'x2': right, 'z2': top, 'room_id': r['id'], 'side': 'north'})
        raw_edges.append({'x1': left, 'z1': bottom, 'x2': right, 'z2': bottom, 'room_id': r['id'], 'side': 'south'})
        raw_edges.append({'x1': left, 'z1': top, 'x2': left, 'z2': bottom, 'room_id': r['id'], 'side': 'west'})
        raw_edges.append({'x1': right, 'z1': top, 'x2': right, 'z2': bottom, 'room_id': r['id'], 'side': 'east'})

    walls = []
    used_edges = set()

    for i, e1 in enumerate(raw_edges):
        if i in used_edges:
            continue

        is_shared = False
        matched_e2 = None
        for j in range(i + 1, len(raw_edges)):
            if j in used_edges:
                continue
            e2 = raw_edges[j]

            # Collinear check
            same_h = abs(e1['z1'] - e1['z2']) < 0.05 and abs(e2['z1'] - e2['z2']) < 0.05 and abs(e1['z1'] - e2['z1']) < 0.15
            same_v = abs(e1['x1'] - e1['x2']) < 0.05 and abs(e2['x1'] - e2['x2']) < 0.05 and abs(e1['x1'] - e2['x1']) < 0.15

            if same_h:
                min1, max1 = min(e1['x1'], e1['x2']), max(e1['x1'], e1['x2'])
                min2, max2 = min(e2['x1'], e2['x2']), max(e2['x1'], e2['x2'])
                if abs(min1 - min2) < 0.3 and abs(max1 - max2) < 0.3:
                    is_shared = True
                    matched_e2 = e2
                    used_edges.add(j)
                    break
            elif same_v:
                min1, max1 = min(e1['z1'], e1['z2']), max(e1['z1'], e1['z2'])
                min2, max2 = min(e2['z1'], e2['z2']), max(e2['z1'], e2['z2'])
                if abs(min1 - min2) < 0.3 and abs(max1 - max2) < 0.3:
                    is_shared = True
                    matched_e2 = e2
                    used_edges.add(j)
                    break

        used_edges.add(i)

        is_ext = not is_shared and (
            abs(e1['z1'] - (-half_l)) < 0.25 or
            abs(e1['z1'] - half_l) < 0.25 or
            abs(e1['x1'] - (-half_w)) < 0.25 or
            abs(e1['x1'] - half_w) < 0.25
        )

        # Collect openings on this wall
        wall_openings = []
        r1 = next((r for r in rooms if r['id'] == e1['room_id']), None)
        if r1:
            for op in r1.get('openings', []):
                if op['wallSide'] == e1['side']:
                    wall_openings.append({
                        'type': op['type'],
                        'position': op['position'],
                        'width': op['width'],
                    })

        if matched_e2:
            r2 = next((r for r in rooms if r['id'] == matched_e2['room_id']), None)
            if r2:
                for op in r2.get('openings', []):
                    if op['wallSide'] == matched_e2['side']:
                        if not any(o['type'] == op['type'] for o in wall_openings):
                            wall_openings.append({
                                'type': op['type'],
                                'position': op['position'],
                                'width': op['width'],
                            })

        walls.append({
            'id': f"wall_{len(walls) + 1}",
            'startX': e1['x1'],
            'startZ': e1['z1'],
            'endX': e1['x2'],
            'endZ': e1['z2'],
            'isExterior': is_ext,
            'height': wall_h,
            'thickness': wall_t,
            'openings': wall_openings,
        })

    return {
        'dimensions': dimensions,
        'rooms': rooms,
        'walls': walls,
    }
