# Beyond-2D: Django Architectural Backend

A production-minded Python Django REST API for converting 2D architectural floor-plan images into interactive, geometrically accurate 3D architectural models (`.glb` and structured CAD JSON).

---

## 1. Architecture & Technology Stack

* **Framework:** Python 3.12, Django 5.1, Django REST Framework (DRF)
* **Cross-Origin Access:** `django-cors-headers` (configured for Next.js frontend on `http://localhost:3000`)
* **Computer Vision:** OpenCV (`opencv-python-headless`) & Pillow for line extraction, room contour detection, thresholding, and morphological filtering
* **3D Geometry Engine:** `trimesh` & `shapely` for polygon extrusion, 3D wall apertures (window sills, door cutouts), floor plates, and binary `.glb` generation
* **Database:** SQLite (default for development; plug-and-play compatible with PostgreSQL)
* **Automated Testing:** `pytest`, `pytest-django`, Django Test Runner

---

## 2. Quickstart & Local Setup

### Prerequisites
* Python 3.12 (or 3.11+)

### Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python3.12 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Copy environment configuration
cp .env.example .env

# 5. Run database migrations
python manage.py migrate

# 6. Run the automated test suite (11 tests)
pytest

# 7. Start the Django development server
python manage.py runserver 8000
```

The API will be live at `http://localhost:8000/api/v1/`.

---

## 3. Modular Core Processing Pipeline

The conversion workflow follows a modular, non-destructive pipeline:

```
[2D Blueprint Image]
        │
        ▼
1. Validation & Preprocessing (PIL & OpenCV)
   - Integrity validation & dimension bounds check
   - Edge-preserving bilateral noise reduction
   - Adaptive Otsu/Gaussian line binarization
        │
        ▼
2. Scale Calibration (Meters / Pixels)
   - User-supplied reference length OR
   - Intelligent residential envelope scaling (8m - 14m default)
        │
        ▼
3. Architectural Feature Detection (OpenCV)
   - Horizontal & vertical directional morphological kernels
   - Probabilistic Hough Transform (HoughLinesP)
   - Enclosed space flood-fill & connected-component room contour extraction
   - Perimeter window vs interior doorway identification
        │
        ▼
4. Structured Geometry Extraction
   - Normalized (0.0 to 1.0) room coordinates (`relX`, `relZ`, `relW`, `relD`)
   - Centered metric world coordinates (X=West/East, Y=Up, Z=North/South)
   - Topological edge snapping to eliminate micro-gaps
        │
        ▼
5. 3D Model Generation (Trimesh)
   - Extruded room floor plates with PBR visual colors
   - Wall segments with physical geometric cutouts for doors & windows
   - Window sills, lintels, dark aluminum frames & reflective glass panes
   - Door jambs, floor thresholds & 55° swung wooden door leaves
   - Wall coping trim caps & foundation slab
        │
        ▼
6. Binary GLB Export & Model Validation
   - Assembles multi-material trimesh.Scene
   - Exports binary GLB (.glb)
   - Validates vertex/face density and bounds
```

---

## 4. API Endpoints Specification

All endpoints are versioned under `/api/v1/`:

### 1. Health Check
* **`GET /api/v1/health/`**
* **Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "Beyond-2D Architectural Geometry Engine",
  "version": "1.0.0",
  "dependencies": {
    "django": "5.1.15",
    "opencv": "4.10.0",
    "trimesh": "4.5.3",
    "numpy": "2.0.2",
    "shapely": "2.0.6",
    "pillow": "11.0.0"
  }
}
```

---

### 2. Upload Floor Plan
* **`POST /api/v1/floorplans/upload/`**
* **Content-Type:** `multipart/form-data`
* **Form Fields:**
  * `image` (required): PNG, JPG, JPEG, or WebP file
  * `known_width_meters` (optional): Float (e.g. `10.0`)
  * `reference_length_meters` (optional): Known dimension in meters
  * `pixel_distance` (optional): Corresponding distance in pixels
* **Response (201 Created):**
```json
{
  "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "uploaded",
  "image": {
    "filename": "floorplan.png",
    "url": "http://localhost:8000/media/uploads/2026/10/24/floorplan.png",
    "width": 1024,
    "height": 682,
    "file_size": 245600
  },
  "message": "Floor plan uploaded successfully. Ready for architectural analysis."
}
```

---

### 3. Analyze Floor Plan
* **`POST /api/v1/floorplans/{job_id}/analyze/`**
* **Response (200 OK):**
```json
{
  "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "awaiting_review",
  "confidence": 0.85,
  "warnings": [],
  "dimensions": {
    "width": 10.0,
    "length": 8.0,
    "wallHeight": 2.8,
    "wallThickness": 0.22
  },
  "rooms": [
    {
      "id": "room_1",
      "name": "Living Room",
      "type": "living",
      "color": "#3b82f6",
      "relX": 0.0,
      "relZ": 0.35,
      "relW": 0.55,
      "relD": 0.45,
      "dimensionsText": "5.5m x 3.6m",
      "openings": [
        {"id": "op_1", "type": "window", "wallSide": "west", "position": 0.5, "width": 1.3}
      ]
    }
  ],
  "walls": [
    {
      "id": "wall_1",
      "startX": -5.0,
      "startZ": -4.0,
      "endX": 0.0,
      "endZ": -4.0,
      "isExterior": true,
      "height": 2.8,
      "thickness": 0.22,
      "openings": [
        {"type": "window", "position": 0.5, "width": 1.3}
      ]
    }
  ],
  "diagnostics": {
    "detected_wall_segments": 18,
    "detected_room_count": 5,
    "wall_coverage_percent": 6.8
  }
}
```

---

### 4. Correct / Update Geometry
* **`PUT /api/v1/floorplans/{job_id}/geometry/update/`**
* **Content-Type:** `application/json`
* **Body:** Send updated `dimensions`, `rooms`, or `walls`.
* **Response (200 OK):** Returns updated geometry with `"is_user_corrected": true`.

---

### 5. Generate 3D Model (.glb)
* **`POST /api/v1/floorplans/{job_id}/generate-3d/`**
* **Response (200 OK):**
```json
{
  "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "completed",
  "model": {
    "glb_url": "http://localhost:8000/media/generated/2026/10/24/model_3fa85f64.glb",
    "file_size": 24500,
    "vertex_count": 384,
    "face_count": 520,
    "bounding_box": {
      "min": [-5.3, 0.0, -4.3],
      "max": [5.3, 3.0, 4.3],
      "dimensions": [10.6, 3.0, 8.6]
    },
    "generated_at": "2026-10-24T17:30:00Z"
  },
  "dimensions": {
    "width": 10.0,
    "length": 8.0,
    "wallHeight": 2.8,
    "wallThickness": 0.22
  },
  "message": "3D architectural model generated successfully in GLB format."
}
```

---

### 6. Query Job Status
* **`GET /api/v1/floorplans/{job_id}/status/`**
* **Response (200 OK):** Returns current job lifecycle stage, progress percentage (0-100), warnings, and asset availability flags.

---

### 7. Fetch Structured Geometry
* **`GET /api/v1/floorplans/{job_id}/geometry/`**
* **Response (200 OK):** Returns the structured CAD layout JSON.

---

### 8. Fetch 3D Model Metadata & GLB URL
* **`GET /api/v1/floorplans/{job_id}/model/`**
* **Response (200 OK):** Returns GLB download URL and mesh statistics.

---

## 5. Frontend Integration Guide (Next.js)

To connect the Next.js frontend with the Django backend:

1. In the root `.env.local` file of the Next.js app, set:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
2. In the upload handler:
   ```typescript
   const formData = new FormData();
   formData.append('image', file);

   // 1. Upload
   const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/floorplans/upload/`, {
     method: 'POST',
     body: formData,
   });
   const { job_id } = await uploadRes.json();

   // 2. Analyze
   const analyzeRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/floorplans/${job_id}/analyze/`, {
     method: 'POST',
   });
   const geometry = await analyzeRes.json();

   // 3. Generate 3D GLB
   const modelRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/floorplans/${job_id}/generate-3d/`, {
     method: 'POST',
   });
   const { model } = await modelRes.json();

   // 4. Load GLB directly in Three.js or React Three Fiber:
   // useGLTF(model.glb_url) or THREE.GLTFLoader().load(model.glb_url)
   ```

---

## 6. Running Tests

```bash
cd backend
source venv/bin/activate
pytest
```
Expected output: **11 passed in ~1.1s**.
