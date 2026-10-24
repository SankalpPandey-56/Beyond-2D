export type EnvironmentMode = 'day' | 'night' | 'studio';
export type ShadingMode = 'solid' | 'wireframe' | 'rendered';
export type TransformTool = 'select' | 'move' | 'rotate' | 'scale';
export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'hallway' | 'balcony' | 'office' | 'dining' | 'entrance' | 'porch';

export interface OpeningData {
  id: string;
  type: 'door' | 'window';
  wallSide: 'north' | 'south' | 'east' | 'west' | 'interior';
  position: number; // 0 to 1 along wall
  width: number; // in meters (default 0.9m for doors, 1.2m for windows)
}

export interface RoomData {
  id: string;
  name: string;
  type: RoomType;
  color: string;
  // Normalized 0 to 1 coordinates within the building footprint
  relX: number;
  relZ: number;
  relW: number;
  relD: number;
  dimensionsText?: string;
  furniture?: string[];
  openings?: OpeningData[];
}

export interface WallData {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  isExterior: boolean;
  thickness?: number;
  height?: number;
  openings?: OpeningData[];
}

export interface BuildingDimensions {
  width: number;      // meters (X)
  length: number;     // meters (Z)
  wallHeight: number; // meters (Y)
  wallThickness: number; // meters
}

export interface ProjectData {
  id: string;
  title: string;
  updatedAt: string;
  dimensions: BuildingDimensions;
  rooms: RoomData[];
  walls?: WallData[];
  previewUrl: string; // 2D floor plan image URL or SVG data
  aiMetadata?: {
    provider: string;
    model: string;
    confidence: number;
    isFallback: boolean;
    processingTimeMs: number;
    message?: string;
  };
}

export interface AIAnalysisRequest {
  imageBase64: string;
  mimeType: string;
  fileName?: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  layout: {
    dimensions: BuildingDimensions;
    rooms: RoomData[];
    walls?: WallData[];
  };
  metadata: {
    provider: string;
    model: string;
    confidence: number;
    isFallback: boolean;
    processingTimeMs: number;
    message?: string;
  };
  error?: string;
}
