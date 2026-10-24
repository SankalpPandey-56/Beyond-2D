import trimesh
import numpy as np
from typing import List, Dict, Any, Tuple
from shapely.geometry import box as shapely_box

def build_floor_mesh(rooms: List[Dict[str, Any]], width_m: float, length_m: float) -> trimesh.Trimesh:
    """
    Creates 3D floor slabs for each room using trimesh extrusion.
    """
    meshes = []
    slab_thickness = 0.08

    for r in rooms:
        # Convert relative room coordinates to world metric coordinates centered at (0, 0)
        x_min = (r["relX"] - 0.5) * width_m
        x_max = (r["relX"] + r["relW"] - 0.5) * width_m
        z_min = (r["relZ"] - 0.5) * length_m
        z_max = (r["relZ"] + r["relD"] - 0.5) * length_m

        poly = shapely_box(x_min, z_min, x_max, z_max)
        slab = trimesh.creation.extrude_polygon(poly, height=slab_thickness)
        
        # Position slab so top is at Y = 0
        slab.apply_translation([0, -slab_thickness, 0])
        meshes.append(slab)

    if not meshes:
        return trimesh.Trimesh()

    return trimesh.util.concatenate(meshes)

def build_walls_mesh(walls: List[Dict[str, Any]]) -> trimesh.Trimesh:
    """
    Creates 3D extruded wall prisms along start -> end segments.
    """
    meshes = []

    for w in walls:
        sx, sz = w["startX"], w["startZ"]
        ex, ez = w["endX"], w["endZ"]
        thickness = w.get("thickness", 0.22)
        height = w.get("height", 2.80)

        dx = ex - sx
        dz = ez - sz
        length = np.hypot(dx, dz)
        if length < 0.1:
            continue

        # Normal vector perpendicular to wall segment
        nx = -dz / length
        nz = dx / length

        half_t = thickness / 2.0
        # 4 vertices of wall footprint in 2D
        v1 = (sx + nx * half_t, sz + nz * half_t)
        v2 = (ex + nx * half_t, ez + nz * half_t)
        v3 = (ex - nx * half_t, ez - nz * half_t)
        v4 = (sx - nx * half_t, sz - nz * half_t)

        poly = trimesh.path.polygons.Polygon([v1, v2, v3, v4])
        if not poly.is_valid or poly.is_empty:
            continue

        wall_mesh = trimesh.creation.extrude_polygon(poly, height=height)
        # In Three.js / OpenGL coordinates, Y is UP.
        # Trimesh extrude creates prism along Z; rotate to Y-up
        # Default trimesh extrude_polygon extrudes along Z: [x, y, z] -> we want [x, z, y]
        R = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
        wall_mesh.apply_transform(R)
        # Shift so bottom is at Y = 0
        wall_mesh.apply_translation([0, 0, 0])

        meshes.append(wall_mesh)

    if not meshes:
        return trimesh.Trimesh()

    return trimesh.util.concatenate(meshes)

def generate_building_scene(
    walls: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]],
    dims: Dict[str, Any]
) -> Tuple[trimesh.Scene, Dict[str, Any]]:
    """
    Constructs a complete validated 3D trimesh scene and computes its bounding box metadata.
    """
    width_m = dims.get("width", 10.0)
    length_m = dims.get("length", 8.0)

    floor_mesh = build_floor_mesh(rooms, width_m, length_m)
    walls_mesh = build_walls_mesh(walls)

    scene = trimesh.Scene()
    if not floor_mesh.is_empty:
        scene.add_geometry(floor_mesh, node_name="Floors")
    if not walls_mesh.is_empty:
        scene.add_geometry(walls_mesh, node_name="Walls")

    # Compute bounding box
    bounds = scene.bounds
    if bounds is not None:
        min_pt, max_pt = bounds
        size = max_pt - min_pt
        center = (min_pt + max_pt) / 2.0
        meta = {
            "sizeX": float(round(size[0], 2)),
            "sizeY": float(round(size[1], 2)),
            "sizeZ": float(round(size[2], 2)),
            "centerX": float(round(center[0], 2)),
            "centerY": float(round(center[1], 2)),
            "centerZ": float(round(center[2], 2)),
            "aspectRatio": float(round(size[0] / max(0.01, size[2]), 3))
        }
    else:
        meta = {
            "sizeX": width_m, "sizeY": dims.get("wallHeight", 2.8), "sizeZ": length_m,
            "centerX": 0.0, "centerY": dims.get("wallHeight", 2.8) / 2.0, "centerZ": 0.0,
            "aspectRatio": round(width_m / length_m, 3)
        }

    return scene, meta

def export_glb_bytes(scene: trimesh.Scene) -> bytes:
    """
    Exports the trimesh scene to binary GLB format.
    """
    return trimesh.exchange.gltf.export_glb(scene)

def export_obj_bytes(scene: trimesh.Scene) -> bytes:
    """
    Exports the trimesh scene to Wavefront OBJ format.
    """
    try:
        combined = scene.to_geometry()
    except Exception:
        combined = scene.dump(concatenate=True)
    return trimesh.exchange.obj.export_obj(combined).encode("utf-8")
