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
  const wallHeight = Math.max(2.0, Math.min(5.0, Number(rawDims.wallHeight) || 2.8));
  const wallThickness = Math.max(0.12, Math.min(0.4, Number(rawDims.wallThickness) || 0.2));

  const dimensions: BuildingDimensions = {
    width: Math.round(width * 10) / 10,
    length: Math.round(length * 10) / 10,
    wallHeight: Math.round(wallHeight * 10) / 10,
    wallThickness: Math.round(wallThickness * 100) / 100,
  };

  // 2. Sanitize and Normalize Rooms
  const rawRooms = Array.isArray(raw.rooms) && raw.rooms.length > 0 ? raw.rooms : [];

  let rooms: RoomData[] = rawRooms.map((r, index) => {
    const rawType = (r.type || 'living').toLowerCase();
    const type: RoomType = (
      ['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'hallway', 'office', 'balcony'].includes(rawType)
        ? rawType
        : 'living'
    ) as RoomType;

    let relX = Math.max(0, Math.min(0.95, Number(r.relX) || 0));
    let relZ = Math.max(0, Math.min(0.95, Number(r.relZ) || 0));
    let relW = Math.max(0.08, Math.min(1.0, Number(r.relW) || 0.3));
    let relD = Math.max(0.08, Math.min(1.0, Number(r.relD) || 0.3));

    // Clamp bounds to fit inside footprint
    if (relX + relW > 1.0) {
      relW = Math.max(0.08, 1.0 - relX);
    }
    if (relZ + relD > 1.0) {
      relD = Math.max(0.08, 1.0 - relZ);
    }

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
      openings: cleanOpenings,
    };
  });

  // If no valid rooms were parsed, generate a standard studio/1BHK fallback
  if (rooms.length === 0) {
    rooms = [
      {
        id: 'room_fallback_living',
        name: 'Living Room',
        type: 'living',
        color: ROOM_COLORS.living,
        relX: 0.0,
        relZ: 0.0,
        relW: 0.6,
        relD: 1.0,
      },
      {
        id: 'room_fallback_bed',
        name: 'Bedroom',
        type: 'bedroom',
        color: ROOM_COLORS.bedroom,
        relX: 0.6,
        relZ: 0.0,
        relW: 0.4,
        relD: 0.6,
      },
      {
        id: 'room_fallback_bath',
        name: 'Bathroom',
        type: 'bathroom',
        color: ROOM_COLORS.bathroom,
        relX: 0.6,
        relZ: 0.6,
        relW: 0.4,
        relD: 0.4,
      },
    ];
  }

  // 3. Coordinate Snapping (Flush Alignment)
  // Snap rooms whose edges are within 2.5% tolerance
  const SNAP_TOLERANCE = 0.025;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      // Horizontal edge snapping (a's right edge near b's left edge)
      const aRight = a.relX + a.relW;
      if (Math.abs(aRight - b.relX) < SNAP_TOLERANCE) {
        b.relX = aRight;
      } else if (Math.abs(b.relX + b.relW - a.relX) < SNAP_TOLERANCE) {
        a.relX = b.relX + b.relW;
      }

      // Vertical edge snapping (a's bottom edge near b's top edge)
      const aBottom = a.relZ + a.relD;
      if (Math.abs(aBottom - b.relZ) < SNAP_TOLERANCE) {
        b.relZ = aBottom;
      } else if (Math.abs(b.relZ + b.relD - a.relZ) < SNAP_TOLERANCE) {
        a.relZ = b.relZ + b.relD;
      }
    }
  }

  // 4. Generate Deterministic Walls
  const walls: WallData[] = [];
  const halfW = dimensions.width / 2;
  const halfL = dimensions.length / 2;

  // Exterior Perimeter Walls
  walls.push(
    { id: 'wall_ext_north', startX: -halfW, startZ: -halfL, endX: halfW, endZ: -halfL, isExterior: true },
    { id: 'wall_ext_south', startX: -halfW, startZ: halfL, endX: halfW, endZ: halfL, isExterior: true },
    { id: 'wall_ext_west', startX: -halfW, startZ: -halfL, endX: -halfW, endZ: halfL, isExterior: true },
    { id: 'wall_ext_east', startX: halfW, startZ: -halfL, endX: halfW, endZ: halfL, isExterior: true }
  );

  // Interior Divider Walls (generated from room boundaries)
  rooms.forEach((r, idx) => {
    const roomLeft = r.relX * dimensions.width - halfW;
    const roomRight = (r.relX + r.relW) * dimensions.width - halfW;
    const roomTop = r.relZ * dimensions.length - halfL;
    const roomBottom = (r.relZ + r.relD) * dimensions.length - halfL;

    // Internal vertical right wall if not at outer boundary
    if (r.relX + r.relW < 0.98) {
      walls.push({
        id: `wall_div_v_${idx}`,
        startX: roomRight,
        startZ: roomTop,
        endX: roomRight,
        endZ: roomBottom,
        isExterior: false,
      });
    }

    // Internal horizontal bottom wall if not at outer boundary
    if (r.relZ + r.relD < 0.98) {
      walls.push({
        id: `wall_div_h_${idx}`,
        startX: roomLeft,
        startZ: roomBottom,
        endX: roomRight,
        endZ: roomBottom,
        isExterior: false,
      });
    }
  });

  return { dimensions, rooms, walls };
}
