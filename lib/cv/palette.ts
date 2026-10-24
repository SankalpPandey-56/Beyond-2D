/**
 * PlanPop-Style Fixed Semantic Color Palette for Architectural Preprocessing
 * 
 * Elements must use exact, distinct RGB colors to enable deterministic computer vision
 * extraction via color segmentation and morphological contour analysis.
 */

export interface ElementColor {
  name: string;
  rgb: [number, number, number];
  hex: string;
  description: string;
}

export const PLANPOP_PALETTE = {
  WALLS: {
    name: 'Walls',
    rgb: [255, 0, 0] as [number, number, number],
    hex: '#FF0000',
    description: 'Structural exterior walls and interior partitions',
  },
  DOORS: {
    name: 'Doors',
    rgb: [0, 0, 255] as [number, number, number],
    hex: '#0000FF',
    description: 'Doorways, openings, and entrance passages',
  },
  WINDOWS: {
    name: 'Windows',
    rgb: [0, 255, 255] as [number, number, number],
    hex: '#00FFFF',
    description: 'Exterior and interior window openings',
  },
  ANNOTATIONS: {
    name: 'Annotations',
    rgb: [0, 255, 0] as [number, number, number],
    hex: '#00FF00',
    description: 'Dimension labels, room names, and text markings',
  },
  STAIRS: {
    name: 'Stairs',
    rgb: [255, 255, 0] as [number, number, number],
    hex: '#FFFF00',
    description: 'Staircases and steps',
  },
  SCALE_GUIDES: {
    name: 'Scale Guides',
    rgb: [255, 0, 255] as [number, number, number],
    hex: '#FF00FF',
    description: 'Scale bars, calibration lines, and grid markers',
  },
  BACKGROUND: {
    name: 'Background',
    rgb: [255, 255, 255] as [number, number, number],
    hex: '#FFFFFF',
    description: 'Unclassified space, floors, and empty background',
  },
} as const;

export type ElementType = keyof typeof PLANPOP_PALETTE;
