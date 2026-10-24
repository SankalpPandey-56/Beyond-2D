import math
from typing import Dict, Any, Tuple
import numpy as np
import trimesh
from trimesh import transformations


# Material Visual Colors (RGBA uint8)
COLOR_FOUNDATION = [35, 40, 45, 255]
COLOR_WALL_EXTERIOR = [210, 215, 220, 255]
COLOR_WALL_INTERIOR = [235, 238, 240, 255]
COLOR_WALL_CAP = [45, 55, 65, 255]
COLOR_DOOR_WOOD = [145, 75, 25, 255]
COLOR_DOOR_THRESH = [100, 55, 15, 255]
COLOR_GLASS = [147, 197, 253, 115]  # semi-transparent light blue
COLOR_WINDOW_FRAME = [20, 25, 35, 255]

ROOM_TYPE_COLORS = {
    'living': [195, 165, 125, 255],     # Warm hardwood
    'bedroom': [185, 155, 120, 255],    # Natural wood
    'kitchen': [205, 215, 225, 255],    # Light ceramic tile
    'bathroom': [55, 65, 80, 255],      # Slate tile
    'dining': [180, 145, 110, 255],     # Rich oak
    'porch': [120, 115, 110, 255],      # Stone paver
    'hallway': [175, 170, 160, 255],
    'office': [160, 140, 115, 255],
}


def create_colored_box(extents, color, translation=(0, 0, 0), rotation_y=0.0):
    """
    Creates a 3D box mesh with visual RGBA color and spatial transformation.
    """
    mesh = trimesh.creation.box(extents=extents)
    mesh.visual.vertex_colors = np.tile(color, (len(mesh.vertices), 1))

    # Apply Rotation around Y axis
    if rotation_y != 0.0:
        r_mat = transformations.rotation_matrix(rotation_y, [0, 1, 0])
        mesh.apply_transform(r_mat)

    # Apply Translation
    if any(t != 0.0 for t in translation):
        t_mat = transformations.translation_matrix(translation)
        mesh.apply_transform(t_mat)

    return mesh


def generate_3d_building_mesh(geometry_data: Dict[str, Any]) -> Tuple[bytes, Dict[str, Any]]:
    """
    Constructs a complete 3D architectural model using Trimesh and exports it to binary GLB (.glb).
    """
    dimensions = geometry_data.get('dimensions', {})
    rooms = geometry_data.get('rooms', [])
    walls = geometry_data.get('walls', [])

    W = float(dimensions.get('width', 10.0))
    L = float(dimensions.get('length', 8.0))
    H = float(dimensions.get('wallHeight', 2.8))
    T = float(dimensions.get('wallThickness', 0.22))

    scene = trimesh.Scene()

    # 1. Foundation Base Slab
    base_slab = create_colored_box(
        extents=[W + 0.6, 0.2, L + 0.6],
        color=COLOR_FOUNDATION,
        translation=[0, 0.1, 0],
    )
    scene.add_geometry(base_slab, node_name='foundation_slab')

    # 2. Room Floor Plates
    for r in rooms:
        rel_x = float(r.get('relX', 0.0))
        rel_z = float(r.get('relZ', 0.0))
        rel_w = float(r.get('relW', 0.3))
        rel_d = float(r.get('relD', 0.3))

        room_w = rel_w * W
        room_d = rel_d * L
        room_center_x = (rel_x * W) + (room_w / 2.0) - (W / 2.0)
        room_center_z = (rel_z * L) + (room_d / 2.0) - (L / 2.0)

        is_porch = r.get('type') == 'porch'
        floor_thickness = 0.10 if is_porch else 0.08
        floor_y = 0.15 if is_porch else 0.24

        color = ROOM_TYPE_COLORS.get(r.get('type'), [180, 180, 180, 255])

        floor_mesh = create_colored_box(
            extents=[max(0.1, room_w - 0.02), floor_thickness, max(0.1, room_d - 0.02)],
            color=color,
            translation=[room_center_x, floor_y, room_center_z],
        )
        scene.add_geometry(floor_mesh, node_name=f"floor_{r.get('id', 'r')}")

    # 3. Dynamic Walls with Real Geometric Apertures (Doors & Windows)
    wall_base_y = 0.24 + (H / 2.0)

    for idx, w in enumerate(walls):
        x1 = float(w.get('startX', 0.0))
        z1 = float(w.get('startZ', 0.0))
        x2 = float(w.get('endX', 0.0))
        z2 = float(w.get('endZ', 0.0))

        dx = x2 - x1
        dz = z2 - z1
        length = math.hypot(dx, dz)
        if length < 0.15:
            continue

        mid_x = (x1 + x2) / 2.0
        mid_z = (z1 + z2) / 2.0
        angle = math.atan2(dz, dx)

        is_ext = bool(w.get('isExterior', False))
        wall_color = COLOR_WALL_EXTERIOR if is_ext else COLOR_WALL_INTERIOR

        openings = w.get('openings', [])
        win_op = next((op for op in openings if op.get('type') == 'window'), None)
        door_op = next((op for op in openings if op.get('type') == 'door'), None)

        if win_op and length > 1.1:
            # --- ARCHITECTURAL WINDOW WITH SILL & GLASS ---
            win_width = min(length * 0.55, float(win_op.get('width', 1.3)))
            side_seg_len = (length - win_width) / 2.0
            sill_h = 0.90
            lintel_h = max(0.25, H - 2.10)
            glass_h = H - sill_h - lintel_h

            # Left Wall Segment
            left_seg = create_colored_box(
                extents=[side_seg_len, H, T],
                color=wall_color,
                translation=[-length / 2.0 + side_seg_len / 2.0, 0, 0],
            )
            # Right Wall Segment
            right_seg = create_colored_box(
                extents=[side_seg_len, H, T],
                color=wall_color,
                translation=[length / 2.0 - side_seg_len / 2.0, 0, 0],
            )
            # Bottom Sill
            sill = create_colored_box(
                extents=[win_width, sill_h, T],
                color=wall_color,
                translation=[0, -H / 2.0 + sill_h / 2.0, 0],
            )
            # Top Lintel
            lintel = create_colored_box(
                extents=[win_width, lintel_h, T],
                color=wall_color,
                translation=[0, H / 2.0 - lintel_h / 2.0, 0],
            )
            # Glass Pane
            glass = create_colored_box(
                extents=[win_width, glass_h, T * 0.25],
                color=COLOR_GLASS,
                translation=[0, -H / 2.0 + sill_h + glass_h / 2.0, 0],
            )
            # Window Frame Border (Black Aluminum)
            frame_bar = create_colored_box(
                extents=[win_width, 0.04, T * 0.35],
                color=COLOR_WINDOW_FRAME,
                translation=[0, -H / 2.0 + sill_h + glass_h / 2.0, 0],
            )

            # Combine sub-meshes into wall composite
            wall_composite = trimesh.util.concatenate([left_seg, right_seg, sill, lintel, glass, frame_bar])

        elif door_op and length > 0.9:
            # --- ARCHITECTURAL DOORWAY (Extends to floor, with wooden swing leaf) ---
            door_width = min(length * 0.75, float(door_op.get('width', 0.95)))
            side_seg_len = (length - door_width) / 2.0
            lintel_h = max(0.25, H - 2.10)

            # Left Wall Segment
            left_seg = create_colored_box(
                extents=[side_seg_len, H, T],
                color=wall_color,
                translation=[-length / 2.0 + side_seg_len / 2.0, 0, 0],
            )
            # Right Wall Segment
            right_seg = create_colored_box(
                extents=[side_seg_len, H, T],
                color=wall_color,
                translation=[length / 2.0 - side_seg_len / 2.0, 0, 0],
            )
            # Top Lintel above doorway
            lintel = create_colored_box(
                extents=[door_width, lintel_h, T],
                color=wall_color,
                translation=[0, H / 2.0 - lintel_h / 2.0, 0],
            )
            # Floor Threshold
            thresh = create_colored_box(
                extents=[door_width, 0.04, T * 1.3],
                color=COLOR_DOOR_THRESH,
                translation=[0, -H / 2.0 + 0.02, 0],
            )
            # Open Wood Door Leaf (swung open 55 degrees)
            door_leaf = create_colored_box(
                extents=[door_width * 0.92, 2.06, 0.04],
                color=COLOR_DOOR_WOOD,
                translation=[-door_width / 2.0 + 0.05, -H / 2.0 + 1.03, 0.32],
                rotation_y=math.pi / 3.2,
            )

            wall_composite = trimesh.util.concatenate([left_seg, right_seg, lintel, thresh, door_leaf])

        else:
            # --- SOLID CONTINUOUS WALL ---
            wall_composite = create_colored_box(
                extents=[length, H, T],
                color=wall_color,
            )

        # Wall Coping Trim Cap on top
        cap = create_colored_box(
            extents=[length, 0.04, T + 0.03],
            color=COLOR_WALL_CAP,
            translation=[0, H / 2.0 + 0.02, 0],
        )
        wall_full = trimesh.util.concatenate([wall_composite, cap])

        # Position and orient wall in world space
        r_mat = transformations.rotation_matrix(-angle, [0, 1, 0])
        t_mat = transformations.translation_matrix([mid_x, wall_base_y, mid_z])
        world_transform = np.dot(t_mat, r_mat)
        wall_full.apply_transform(world_transform)

        scene.add_geometry(wall_full, node_name=f"wall_{idx + 1}")

    # Export to binary GLB (.glb)
    glb_bytes = trimesh.exchange.gltf.export_glb(scene)

    # Compute bounding box and stats
    total_vertices = sum(len(g.vertices) for g in scene.geometry.values() if hasattr(g, 'vertices'))
    total_faces = sum(len(g.faces) for g in scene.geometry.values() if hasattr(g, 'faces'))
    bounds = scene.bounds if len(scene.geometry) > 0 else np.zeros((2, 3))

    stats = {
        'vertex_count': int(total_vertices),
        'face_count': int(total_faces),
        'file_size_bytes': len(glb_bytes),
        'bounding_box': {
            'min': [round(float(v), 2) for v in bounds[0]],
            'max': [round(float(v), 2) for v in bounds[1]],
            'dimensions': [round(float(bounds[1][i] - bounds[0][i]), 2) for i in range(3)],
        },
    }

    return glb_bytes, stats
