import os
import io
from typing import Dict, Any, Tuple
import trimesh


def validate_glb_model(file_path_or_bytes: Any) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Inspects and validates that a GLB model is structurally sound, contains vertices, and is re-loadable.
    Returns:
        (is_valid, message, stats)
    """
    try:
        if isinstance(file_path_or_bytes, (str, os.PathLike)):
            if not os.path.exists(file_path_or_bytes):
                return False, f"File does not exist: {file_path_or_bytes}", {}
            size = os.path.getsize(file_path_or_bytes)
            if size < 256:
                return False, f"GLB file is too small ({size} bytes)", {}
            scene_or_mesh = trimesh.load(file_path_or_bytes, file_type='glb')
        elif isinstance(file_path_or_bytes, bytes):
            if len(file_path_or_bytes) < 256:
                return False, f"GLB binary is too small ({len(file_path_or_bytes)} bytes)", {}
            scene_or_mesh = trimesh.load(io.BytesIO(file_path_or_bytes), file_type='glb')
        else:
            return False, "Unsupported input type for GLB validation", {}

        if isinstance(scene_or_mesh, trimesh.Scene):
            geoms = list(scene_or_mesh.geometry.values())
            if not geoms:
                return False, "GLB scene contains no geometry nodes", {}
            total_vertices = sum(len(g.vertices) for g in geoms if hasattr(g, 'vertices'))
            total_faces = sum(len(g.faces) for g in geoms if hasattr(g, 'faces'))
            bounds = scene_or_mesh.bounds
        elif isinstance(scene_or_mesh, trimesh.Trimesh):
            total_vertices = len(scene_or_mesh.vertices)
            total_faces = len(scene_or_mesh.faces)
            bounds = scene_or_mesh.bounds
        else:
            return False, f"Unknown trimesh object type: {type(scene_or_mesh)}", {}

        if total_vertices < 8 or total_faces < 4:
            return False, f"Model has insufficient geometric complexity ({total_vertices} verts, {total_faces} faces)", {}

        stats = {
            'vertex_count': int(total_vertices),
            'face_count': int(total_faces),
            'bounding_box': {
                'min': [round(float(v), 2) for v in bounds[0]],
                'max': [round(float(v), 2) for v in bounds[1]],
            },
        }

        return True, "Valid GLB architectural model", stats

    except Exception as e:
        return False, f"Failed to load or parse GLB model: {str(e)}", {}
