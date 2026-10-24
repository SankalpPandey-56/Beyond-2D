import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import HOST, PORT, CORS_ORIGINS
from .api.routes import router

app = FastAPI(
    title="Beyond-2D Python Backend (Version B)",
    description="Deterministic Architectural Floor-Plan to 3D Generation Engine using FastAPI, OpenCV, Shapely & Trimesh.",
    version="2.0.0",
)

# Enable CORS for local Next.js frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow any origin during local dual-testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
async def root():
    return {
        "message": "Beyond-2D Version B Python Engine Active",
        "documentation": "/docs",
        "health": "/health",
        "analyzeEndpoint": "/api/analyze-floorplan"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
