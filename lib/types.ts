export type EnvironmentMode = 'day' | 'night' | 'studio';
export type ShadingMode = 'solid' | 'wireframe' | 'rendered';
export type TransformTool = 'select' | 'move' | 'rotate' | 'scale';

export interface RoomData {
  id: string;
  name: string;
  type: 'living' | 'bedroom' | 'kitchen' | 'bathroom';
  color: string;
  // Normalized 0 to 1 coordinates within the building footprint
  relX: number;
  relZ: number;
  relW: number;
  relD: number;
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
  previewUrl: string; // 2D floor plan image URL or SVG data
}
