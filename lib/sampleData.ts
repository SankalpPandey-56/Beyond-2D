import { ProjectData } from './types';

// High-fidelity SVG floor plans encoded as data URIs for instant preview
const SAMPLE_FLOORPLAN_1_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400">
  <rect width="500" height="400" fill="%231a1a1a"/>
  <rect x="30" y="30" width="440" height="340" fill="none" stroke="%23666" stroke-width="8"/>
  <line x1="260" y1="30" x2="260" y2="370" stroke="%23666" stroke-width="6"/>
  <line x1="30" y1="210" x2="260" y2="210" stroke="%23666" stroke-width="6"/>
  <line x1="260" y1="180" x2="470" y2="180" stroke="%23666" stroke-width="6"/>
  
  <!-- Living Room -->
  <rect x="34" y="34" width="222" height="172" fill="%23253342" opacity="0.6"/>
  <text x="70" y="120" fill="%2393c5fd" font-family="sans-serif" font-size="16" font-weight="bold">LIVING ROOM</text>
  <text x="70" y="145" fill="%2360a5fa" font-family="sans-serif" font-size="12">5.5m x 4.2m</text>
  
  <!-- Kitchen -->
  <rect x="34" y="214" width="222" height="152" fill="%23372c38" opacity="0.6"/>
  <text x="80" y="280" fill="%23f472b6" font-family="sans-serif" font-size="16" font-weight="bold">KITCHEN</text>
  <text x="80" y="305" fill="%23f472b6" font-family="sans-serif" font-size="12">5.5m x 3.8m</text>
  
  <!-- Master Bedroom -->
  <rect x="264" y="34" width="202" height="142" fill="%23243c2c" opacity="0.6"/>
  <text x="285" y="100" fill="%2386efac" font-family="sans-serif" font-size="15" font-weight="bold">MASTER BEDROOM</text>
  <text x="285" y="125" fill="%2386efac" font-family="sans-serif" font-size="12">4.5m x 3.6m</text>
  
  <!-- Bathroom -->
  <rect x="264" y="184" width="202" height="182" fill="%233b3726" opacity="0.6"/>
  <text x="310" y="270" fill="%23fde047" font-family="sans-serif" font-size="16" font-weight="bold">BATHROOM</text>
  <text x="310" y="295" fill="%23fde047" font-family="sans-serif" font-size="12">4.5m x 4.4m</text>
  
  <!-- Doors & Windows -->
  <line x1="120" y1="210" x2="160" y2="210" stroke="%23eb7724" stroke-width="6"/>
  <line x1="260" y1="90" x2="260" y2="130" stroke="%23eb7724" stroke-width="6"/>
  <line x1="260" y1="230" x2="260" y2="270" stroke="%23eb7724" stroke-width="6"/>
</svg>`;

const SAMPLE_FLOORPLAN_2_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400">
  <rect width="500" height="400" fill="%231a1a1a"/>
  <rect x="40" y="40" width="420" height="320" fill="none" stroke="%23666" stroke-width="8"/>
  <line x1="200" y1="40" x2="200" y2="360" stroke="%23666" stroke-width="6"/>
  
  <!-- Studio Living Area -->
  <rect x="44" y="44" width="152" height="312" fill="%23243c2c" opacity="0.6"/>
  <text x="60" y="190" fill="%2386efac" font-family="sans-serif" font-size="15" font-weight="bold">STUDIO BED</text>
  
  <!-- Open Hall -->
  <rect x="204" y="44" width="252" height="312" fill="%23253342" opacity="0.6"/>
  <text x="240" y="190" fill="%2393c5fd" font-family="sans-serif" font-size="16" font-weight="bold">OPEN LIVING</text>
</svg>`;

export const SAMPLE_PROJECTS: ProjectData[] = [
  {
    id: 'proj_villa_01',
    title: 'Modern Villa 2D (Sample)',
    updatedAt: 'Just now',
    previewUrl: SAMPLE_FLOORPLAN_1_SVG,
    dimensions: {
      width: 10.0,
      length: 8.0,
      wallHeight: 2.8,
      wallThickness: 0.22,
    },
    rooms: [
      {
        id: 'room_living',
        name: 'Living Room',
        type: 'living',
        color: '#3b82f6',
        relX: 0.0,
        relZ: 0.0,
        relW: 0.55,
        relD: 0.55,
      },
      {
        id: 'room_kitchen',
        name: 'Kitchen & Dining',
        type: 'kitchen',
        color: '#ec4899',
        relX: 0.0,
        relZ: 0.55,
        relW: 0.55,
        relD: 0.45,
      },
      {
        id: 'room_bed',
        name: 'Master Bedroom',
        type: 'bedroom',
        color: '#10b981',
        relX: 0.55,
        relZ: 0.0,
        relW: 0.45,
        relD: 0.45,
      },
      {
        id: 'room_bath',
        name: 'Bathroom',
        type: 'bathroom',
        color: '#eab308',
        relX: 0.55,
        relZ: 0.45,
        relW: 0.45,
        relD: 0.55,
      },
    ],
  },
  {
    id: 'proj_studio_02',
    title: 'Downtown Studio Flat',
    updatedAt: '2 hours ago',
    previewUrl: SAMPLE_FLOORPLAN_2_SVG,
    dimensions: {
      width: 7.5,
      length: 6.0,
      wallHeight: 2.6,
      wallThickness: 0.18,
    },
    rooms: [
      {
        id: 'room_studio_bed',
        name: 'Bedroom Suite',
        type: 'bedroom',
        color: '#10b981',
        relX: 0.0,
        relZ: 0.0,
        relW: 0.45,
        relD: 1.0,
      },
      {
        id: 'room_studio_lounge',
        name: 'Open Lounge',
        type: 'living',
        color: '#3b82f6',
        relX: 0.45,
        relZ: 0.0,
        relW: 0.55,
        relD: 1.0,
      },
    ],
  },
];
