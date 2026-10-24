import { BuildingDimensions, OpeningData, RoomData, RoomType, WallData } from '@/lib/types';
import { RawAIPlanOutput } from '@/lib/ai/types';

const ROOM_COLORS: Record<RoomType, string> = {
  living: '#3b82f6',
  bedroom: '#10b981',
  kitchen: '#ec4899',
  bathroom: '#eab308',
  dining: '#f97316',
  hallway: '#64748b',
  office: '#8b5cf6',
  balcony: '#06b6d4',
  entrance: '#a855f7',
  porch: '#78716c',
};

export function validateAndNormalizeFloorPlan(raw: Partial<RawAIPlanOutput>): {
  dimensions: BuildingDimensions;
  rooms: RoomData[];
  walls: WallData[];
} {
  // 1. Sanitize Dimensions
  const rawDims = raw.dimensions || ({} as any);
  const width = Math.max(4.0, Math.min(40.0, Number(rawDims.width) || 10.0));
  const length = Math.max(4.0, Math.min(40.0, Number(rawDims.length) || 8.0));
  const wallHeight = Math.max(2.2, Math.min(4.5, Number(rawDims.wallHeight) || 2.8));
  const wallThickness = Math.max(0.12, Math.min(0.35, Number(rawDims.wallThickness) || 0.22));

  const dimensions: BuildingDimensions = {
    width: Math.round(width * 10) / 10,
    length: Math.round(length * 10) / 10,
    wallHeight: Math.round(wallHeight * 10) / 10,
    wallThickness: Math.round(wallThickness * 100) / 100,
  };

  // 2. Sanitize and Normalize Rooms
  const rawRooms = Array.isArray(raw.rooms) && raw.rooms.length > 0 ? raw.rooms : [];

  let rooms: RoomData[] = rawRooms.map((r, index) => {
    const rawType = (r.type || '').toLowerCase();
    const rawName = (r.name || '').toLowerCase();

    // Smart semantic classification
    let type: RoomType = 'living';
    if (rawType.includes('bed') || rawName.includes('bed')) {
      type = 'bedroom';
    } else if (rawType.includes('bath') || rawName.includes('bath') || rawName.includes('toilet') || rawName.includes('wc')) {
      type = 'bathroom';
    } else if (rawType.includes('kitchen') || rawName.includes('kitchen')) {
      type = 'kitchen';
    } else if (rawType.includes('din') || rawName.includes('din')) {
      type = 'dining';
    } else if (rawType.includes('porch') || rawName.includes('porch') || rawType.includes('patio') || rawName.includes('patio') || rawType.includes('veranda')) {
      type = 'porch';
    } else if (rawType.includes('entry') || rawName.includes('entry') || rawType.includes('entrance') || rawName.includes('entrance') || rawName.includes('foyer')) {
      type = 'entrance';
    } else if (rawType.includes('balcony') || rawName.includes('balcony')) {
      type = 'balcony';
    } else if (rawType.includes('office') || rawName.includes('office') || rawName.includes('study')) {
      type = 'office';
    } else if (rawType.includes('hall') || rawName.includes('hall') || rawName.includes('corridor')) {
      type = 'hallway';
    }

    let relX = Math.max(0, Math.min(0.96, Number(r.relX) || 0));
    let relZ = Math.max(0, Math.min(0.96, Number(r.relZ) || 0));
    let relW = Math.max(0.06, Math.min(1.0, Number(r.relW) || 0.3));
    let relD = Math.max(0.06, Math.min(1.0, Number(r.relD) || 0.3));

    // Clamp bounds to fit inside 0..1 footprint
    if (relX + relW > 1.0) relW = Math.max(0.06, 1.0 - relX);
    if (relZ + relD > 1.0) relD = Math.max(0.06, 1.0 - relZ);

    const cleanOpenings: OpeningData[] = Array.isArray(r.openings)
      ? r.openings.map((op, opIdx) => ({
          id: `op_${index}_${opIdx}`,
          type: op.type === 'window' ? 'window' : 'door',
          wallSide: op.wallSide || 'interior',
          position: Math.max(0.1, Math.min(0.9, Number(op.position) || 0.5)),
          width: op.type === 'window' ? 1.2 : 0.9,
        }))
      : [];

    return {
      id: r.id || `room_${index + 1}`,
      name: r.name ? String(r.name).trim() : `Room ${index + 1}`,
      type,
      color: r.color || ROOM_COLORS[type],
      relX: Math.round(relX * 1000) / 1000,
      relZ: Math.round(relZ * 1000) / 1000,
      relW: Math.round(relW * 1000) / 1000,
      relD: Math.round(relD * 1000) / 1000,
      dimensionsText: (r as any).dimensionsText || '',
      furniture: Array.isArray((r as any).furniture) ? (r as any).furniture : [],
      openings: cleanOpenings,
    };
  });

  if (rooms.length === 0) {
    rooms = [
      { id: 'room_1', name: 'Living Room', type: 'living', color: ROOM_COLORS.living, relX: 0, relZ: 0.375, relW: 0.4, relD: 0.4375 },
      { id: 'room_2', name: 'Bedroom 1', type: 'bedroom', color: ROOM_COLORS.bedroom, relX: 0, relZ: 0, relW: 0.35, relD: 0.375 },
      { id: 'room_3', name: 'Bathroom', type: 'bathroom', color: ROOM_COLORS.bathroom, relX: 0.35, relZ: 0, relW: 0.2, relD: 0.25 },
      { id: 'room_4', name: 'Bedroom 2', type: 'bedroom', color: ROOM_COLORS.bedroom, relX: 0.7, relZ: 0, relW: 0.3, relD: 0.375 },
    ];
  }

  // 3. Grid Snapping for Flush Alignment
  const SNAP_TOLERANCE = 0.03;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      // Snap X edges
      if (Math.abs(a.relX + a.relW - b.relX) < SNAP_TOLERANCE) {
        b.relX = a.relX + a.relW;
      } else if (Math.abs(b.relX + b.relW - a.relX) < SNAP_TOLERANCE) {
        a.relX = b.relX + b.relW;
      }

      // Snap Z edges
      if (Math.abs(a.relZ + a.relD - b.relZ) < SNAP_TOLERANCE) {
        b.relZ = a.relZ + a.relD;
      } else if (Math.abs(b.relZ + b.relD - a.relZ) < SNAP_TOLERANCE) {
        a.relZ = b.relZ + b.relD;
      }
    }
  }

  // 4. Generate Clean Non-Overlapping Wall Segments from Room Topologies
  const walls: WallData[] = [];
  const W = dimensions.width;
  const L = dimensions.length;
  const halfW = W / 2;
  const halfL = L / 2;

  // Helper: converts normalized coord to world metric
  const toWorldX = (relX: number) => relX * W - halfW;
  const toWorldZ = (relZ: number) => relZ * L - halfL;

  // We collect all 4 edges of every enclosed room
  interface RawEdge {
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    roomId: string;
    roomType: RoomType;
    side: 'N' | 'S' | 'W' | 'E';
  }

  const rawEdges: RawEdge[] = [];

  rooms.forEach(room => {
    // Skip full height walls for open porch
    if (room.type === 'porch') return;

    const left = toWorldX(room.relX);
    const right = toWorldX(room.relX + room.relW);
    const top = toWorldZ(room.relZ);
    const bottom = toWorldZ(room.relZ + room.relD);

    // North edge
    rawEdges.push({ startX: left, startZ: top, endX: right, endZ: top, roomId: room.id, roomType: room.type, side: 'N' });
    // South edge
    rawEdges.push({ startX: left, startZ: bottom, endX: right, endZ: bottom, roomId: room.id, roomType: room.type, side: 'S' });
    // West edge
    rawEdges.push({ startX: left, startZ: top, endX: left, endZ: bottom, roomId: room.id, roomType: room.type, side: 'W' });
    // East edge
    rawEdges.push({ startX: right, startZ: top, endX: right, endZ: bottom, roomId: room.id, roomType: room.type, side: 'E' });
  });

  // Deduplicate and classify interior vs exterior walls
  const used = new Set<number>();
  const sideMap: Record<'N' | 'S' | 'W' | 'E', 'north' | 'south' | 'west' | 'east'> = {
    N: 'north',
    S: 'south',
    W: 'west',
    E: 'east',
  };

  for (let i = 0; i < rawEdges.length; i++) {
    if (used.has(i)) continue;
    const e1 = rawEdges[i];

    // Look for matching coincident edge (opposite orientation or collinear)
    let isSharedInternal = false;
    let matchedE2: RawEdge | null = null;

    for (let j = i + 1; j < rawEdges.length; j++) {
      if (used.has(j)) continue;
      const e2 = rawEdges[j];

      // Check collinearity & overlap
      const sameH = Math.abs(e1.startZ - e1.endZ) < 0.05 && Math.abs(e2.startZ - e2.endZ) < 0.05 && Math.abs(e1.startZ - e2.startZ) < 0.15;
      const sameV = Math.abs(e1.startX - e1.endX) < 0.05 && Math.abs(e2.startX - e2.endX) < 0.05 && Math.abs(e1.startX - e2.startX) < 0.15;

      if (sameH) {
        // Horizontal overlap
        const min1 = Math.min(e1.startX, e1.endX);
        const max1 = Math.max(e1.startX, e1.endX);
        const min2 = Math.min(e2.startX, e2.endX);
        const max2 = Math.max(e2.startX, e2.endX);

        if (Math.abs(min1 - min2) < 0.25 && Math.abs(max1 - max2) < 0.25) {
          isSharedInternal = true;
          matchedE2 = e2;
          used.add(j);
          break;
        }
      } else if (sameV) {
        // Vertical overlap
        const min1 = Math.min(e1.startZ, e1.endZ);
        const max1 = Math.max(e1.startZ, e1.endZ);
        const min2 = Math.min(e2.startZ, e2.endZ);
        const max2 = Math.max(e2.startZ, e2.endZ);

        if (Math.abs(min1 - min2) < 0.25 && Math.abs(max1 - max2) < 0.25) {
          isSharedInternal = true;
          matchedE2 = e2;
          used.add(j);
          break;
        }
      }
    }

    used.add(i);

    // Architectural Rule: Skip walls between open-plan spaces
    if (isSharedInternal && matchedE2) {
      const r1Type = e1.roomType;
      const r2Type = matchedE2.roomType;
      // Kitchen <-> Dining is open concept
      if ((r1Type === 'kitchen' && r2Type === 'dining') || (r1Type === 'dining' && r2Type === 'kitchen')) {
        continue;
      }
      // Living <-> Entrance is open foyer transition
      if ((r1Type === 'living' && r2Type === 'entrance') || (r1Type === 'entrance' && r2Type === 'living')) {
        continue;
      }
    }

    // Determine if exterior: is it on outer perimeter or facing porch?
    const isPerimeterN = Math.abs(e1.startZ - (-halfL)) < 0.2 && Math.abs(e1.endZ - (-halfL)) < 0.2;
    const isPerimeterS = Math.abs(e1.startZ - halfL) < 0.2 && Math.abs(e1.endZ - halfL) < 0.2;
    const isPerimeterW = Math.abs(e1.startX - (-halfW)) < 0.2 && Math.abs(e1.endX - (-halfW)) < 0.2;
    const isPerimeterE = Math.abs(e1.startX - halfW) < 0.2 && Math.abs(e1.endX - halfW) < 0.2;

    const isExterior = !isSharedInternal && (isPerimeterN || isPerimeterS || isPerimeterW || isPerimeterE);

    // Extract openings belonging strictly to this wall
    const wallOpenings: OpeningData[] = [];
    const checkRoomOpenings = (roomId: string, side: 'N' | 'S' | 'W' | 'E') => {
      const room = rooms.find(r => r.id === roomId);
      if (!room || !room.openings) return;
      const targetSide = sideMap[side];
      for (const op of room.openings) {
        if (op.wallSide === targetSide) {
          // Prevent duplicates
          if (!wallOpenings.some(o => o.type === op.type && Math.abs(o.position - op.position) < 0.2)) {
            wallOpenings.push(op);
          }
        }
      }
    };

    checkRoomOpenings(e1.roomId, e1.side);
    if (isSharedInternal && matchedE2) {
      checkRoomOpenings(matchedE2.roomId, matchedE2.side);
    }

    // Fallback: If exterior wall has no window opening specified by AI, but belongs to an exterior bedroom/living/kitchen/dining, add a window!
    if (isExterior && wallOpenings.length === 0) {
      const room = rooms.find(r => r.id === e1.roomId);
      if (room && (room.type === 'bedroom' || room.type === 'living' || room.type === 'kitchen' || room.type === 'dining')) {
        wallOpenings.push({
          id: `win_${walls.length}`,
          type: 'window',
          wallSide: sideMap[e1.side],
          position: 0.5,
          width: 1.3,
        });
      }
    }

    // Fallback: If it is the main entrance on south perimeter, ensure it has the main entry door!
    if (isPerimeterS && Math.abs(e1.startX - (-halfW)) > 2.0 && Math.abs(e1.endX - halfW) > 2.0) {
      if (!wallOpenings.some(o => o.type === 'door')) {
        wallOpenings.push({
          id: `door_main_entry`,
          type: 'door',
          wallSide: 'south',
          position: 0.5,
          width: 1.0,
        });
      }
    }

    walls.push({
      id: `wall_${walls.length + 1}`,
      startX: e1.startX,
      startZ: e1.startZ,
      endX: e1.endX,
      endZ: e1.endZ,
      isExterior,
      height: dimensions.wallHeight,
      thickness: dimensions.wallThickness,
      openings: wallOpenings,
    });
  }

  return { dimensions, rooms, walls };
}
