import { BuildingDimensions, RoomData, WallData } from '@/lib/types';

export interface RawAIPlanOutput {
  dimensions: BuildingDimensions;
  rooms: Array<{
    id?: string;
    name: string;
    type: string;
    relX: number;
    relZ: number;
    relW: number;
    relD: number;
    color?: string;
    openings?: Array<{
      type: 'door' | 'window';
      wallSide: 'north' | 'south' | 'east' | 'west' | 'interior';
      position?: number;
      width?: number;
    }>;
  }>;
  walls?: WallData[];
  confidence?: number;
  notes?: string;
}

export interface IFloorPlanProvider {
  name: string;
  defaultModel: string;
  analyzeFloorPlan(imageBase64: string, mimeType: string): Promise<RawAIPlanOutput>;
}
