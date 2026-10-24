import base64
from fastapi import APIRouter, File, UploadFile, Request, HTTPException, Response
from fastapi.responses import JSONResponse
from typing import Optional
from ..services.pipeline import execute_floor_plan_pipeline
from ..services.mesh_generation import generate_building_scene, export_glb_bytes, export_obj_bytes
from ..schemas import FloorPlanAnalysisResponse, AnalysisRequestJSON

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Beyond-2D Python Backend (Version B)",
        "version": "2.0.0",
        "stack": ["FastAPI", "OpenCV", "NumPy", "Shapely", "Trimesh"]
    }

@router.post("/api/analyze-floorplan")
async def analyze_floorplan(
    request: Request,
    file: Optional[UploadFile] = File(None)
):
    """
    Main architectural analysis endpoint compatible with the Beyond-2D frontend.
    Accepts either multipart/form-data with 'file', or JSON with 'imageBase64'.
    """
    image_bytes = b""
    file_name = "uploaded_floorplan.png"

    # Case 1: Multipart File Upload
    if file is not None:
        file_name = file.filename or file_name
        image_bytes = await file.read()
    else:
        # Case 2: JSON Body with imageBase64
        try:
            body = await request.json()
            raw_b64 = body.get("imageBase64") or body.get("image") or ""
            file_name = body.get("fileName") or file_name
            if raw_b64:
                clean_b64 = raw_b64.split(",")[-1]
                image_bytes = base64.b64decode(clean_b64)
        except Exception:
            pass

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Missing floor plan image. Provide multipart 'file' or JSON 'imageBase64'."
        )

    try:
        result = execute_floor_plan_pipeline(image_bytes, file_name=file_name)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Floor plan pipeline processing error: {str(e)}"
        )

@router.post("/api/export-glb")
async def export_glb(request: Request):
    """
    Exports a 3D binary model (.glb) from floor plan geometry using Trimesh.
    """
    try:
        body = await request.json()
        layout = body.get("layout", body)
        walls = layout.get("walls", [])
        rooms = layout.get("rooms", [])
        dims = layout.get("dimensions", {"width": 10.0, "length": 8.0, "wallHeight": 2.8})

        scene, _ = generate_building_scene(walls, rooms, dims)
        glb_data = export_glb_bytes(scene)

        return Response(
            content=glb_data,
            media_type="model/gltf-binary",
            headers={"Content-Disposition": "attachment; filename=Beyond-2D_House_Model_v2.glb"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GLB export failed: {str(e)}")

@router.post("/api/export-obj")
async def export_obj(request: Request):
    """
    Exports a 3D Wavefront model (.obj) from floor plan geometry using Trimesh.
    """
    try:
        body = await request.json()
        layout = body.get("layout", body)
        walls = layout.get("walls", [])
        rooms = layout.get("rooms", [])
        dims = layout.get("dimensions", {"width": 10.0, "length": 8.0, "wallHeight": 2.8})

        scene, _ = generate_building_scene(walls, rooms, dims)
        obj_data = export_obj_bytes(scene)

        return Response(
            content=obj_data,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=Beyond-2D_House_Model_v2.obj"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OBJ export failed: {str(e)}")
