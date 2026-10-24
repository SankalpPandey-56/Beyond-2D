from typing import List, Optional, Tuple, Dict, Any, Union
from pydantic import BaseModel, Field

class OpeningSchema(BaseModel):
    id: str
    type: str = Field(..., description="'door' or 'window'")
    wallSide: str = Field("interior", description="'north' | 'south' | 'east' | 'west' | 'interior'")
    position: float = Field(..., ge=0.0, le=1.0, description="Normalized 0 to 1 along wall")
    width: float = Field(0.9, description="Physical opening width in meters")

class WallSchema(BaseModel):
    id: str
    startX: float
    startZ: float
    endX: float
    endZ: float
    isExterior: bool = True
    thickness: float = 0.22
    height: float = 2.80
    openings: List[OpeningSchema] = Field(default_factory=list)

class RoomSchema(BaseModel):
    id: str
    name: str
    type: str = Field(..., description="Room type: bedroom, living, kitchen, bathroom, etc.")
    color: str = "#3b82f6"
    relX: float = Field(..., ge=0.0, le=1.0)
    relZ: float = Field(..., ge=0.0, le=1.0)
    relW: float = Field(..., ge=0.0, le=1.0)
    relD: float = Field(..., ge=0.0, le=1.0)
    dimensionsText: Optional[str] = None
    furniture: List[str] = Field(default_factory=list)
    openings: List[Dict[str, Any]] = Field(default_factory=list)

class BuildingDimensionsSchema(BaseModel):
    width: float = Field(10.0, description="Building width in meters (X)")
    length: float = Field(8.0, description="Building depth/length in meters (Z)")
    wallHeight: float = Field(2.8, description="Wall height in meters (Y)")
    wallThickness: float = Field(0.22, description="Wall thickness in meters")

class FloorPlanLayoutSchema(BaseModel):
    dimensions: BuildingDimensionsSchema
    rooms: List[RoomSchema]
    walls: List[WallSchema] = Field(default_factory=list)

class FootprintDiagnosticsSchema(BaseModel):
    bbox_pixels: Tuple[int, int, int, int] = Field(..., description="[bx, by, bw, bh]")
    resolution: str
    aspectRatio: float
    porchBayPreserved: bool = True
    exteriorSegmentsCount: int = 6

class CVStatsSchema(BaseModel):
    semanticResolution: str
    wallMaskPixelCount: int
    totalExtractedWalls: int
    recoveredRoomsCount: int
    detectedDoorsCount: int
    detectedWindowsCount: int
    pipeline: str

class DiagnosticsSchema(BaseModel):
    semanticImageBase64: Optional[str] = None
    overlayImageBase64: Optional[str] = None
    footprint: Optional[FootprintDiagnosticsSchema] = None
    cvStats: Optional[CVStatsSchema] = None
    warnings: List[str] = Field(default_factory=list)

class AIMetadataSchema(BaseModel):
    provider: str = "FastAPI Python Deterministic Engine"
    model: str = "OpenCV-Shapely-PlanPop-CV"
    confidence: float = 0.98
    isFallback: bool = False
    processingTimeMs: int = 0
    message: Optional[str] = None

class FloorPlanAnalysisResponse(BaseModel):
    success: bool
    layout: FloorPlanLayoutSchema
    metadata: AIMetadataSchema
    diagnostics: Optional[DiagnosticsSchema] = None
    error: Optional[str] = None

class AnalysisRequestJSON(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = "image/png"
    fileName: Optional[str] = "floor_plan.png"
