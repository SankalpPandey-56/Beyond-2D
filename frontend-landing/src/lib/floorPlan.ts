import * as THREE from 'three';

// Floor plan of a modern flat, expressed as wall segments in 2D (x, z).
// These same segments are sampled to produce particle positions for the
// opening 2D plan state, and the bungalow surface is sampled for the 3D
// target state. The morph between them is the transformation.
export type Seg = [number, number, number, number];

export const PLAN: Seg[] = [
  // outer perimeter
  [-4, -3, 4, -3],
  [4, -3, 4, 3],
  [4, 3, -4, 3],
  [-4, 3, -4, -3],
  // internal partitions
  [-1.2, -3, -1.2, 0],
  [-1.2, 0, 1.5, 0],
  [1.5, 0, 1.5, -3],
  [-4, 1, -1.2, 1],
  [-1.2, 1, -1.2, 3],
  [1.5, 1, 4, 1],
  [1.5, 1, 1.5, 3],
  [-1.2, 1, -1.2, 2.2],
  [-1.2, 2.2, 1.5, 2.2],
];

// Sample N points evenly across all segments. Returns Float32Array (3*N),
// y=0 (flat on ground).
export function samplePlan(count: number): Float32Array {
  const lengths = PLAN.map((s) => Math.hypot(s[2] - s[0], s[3] - s[1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let d = (i / count) * total + Math.random() * (total / count) * 0.3;
    for (let s = 0; s < PLAN.length; s++) {
      if (d <= lengths[s]) {
        const t = d / lengths[s];
        const seg = PLAN[s];
        out[i * 3] = THREE.MathUtils.lerp(seg[0], seg[2], t) + (Math.random() - 0.5) * 0.04;
        out[i * 3 + 1] = 0;
        out[i * 3 + 2] = THREE.MathUtils.lerp(seg[1], seg[3], t) + (Math.random() - 0.5) * 0.04;
        break;
      }
      d -= lengths[s];
    }
  }
  return out;
}

// ---- Bungalow 3D surface sampling ----
// We define the bungalow as a set of boxes (walls + roof) and sample points
// on their surfaces. Each particle gets a target on the bungalow. The morph
// from plan -> bungalow is done by interpolating positions.

type Box = {
  pos: [number, number, number];
  size: [number, number, number];
  rotY?: number;
};

const WALL_H = 2.6;

const BUNGALOW: Box[] = [
  // outer walls (thin boxes along perimeter)
  { pos: [0, WALL_H / 2, -3], size: [8, WALL_H, 0.14] }, // front
  { pos: [0, WALL_H / 2, 3], size: [8, WALL_H, 0.14] }, // back
  { pos: [-4, WALL_H / 2, 0], size: [0.14, WALL_H, 6] }, // left
  { pos: [4, WALL_H / 2, 0], size: [0.14, WALL_H, 6] }, // right
  // internal partitions
  { pos: [-1.2, WALL_H / 2, -1.5], size: [0.12, WALL_H, 3] },
  { pos: [0.15, WALL_H / 2, 0], size: [2.7, WALL_H, 0.12] },
  { pos: [1.5, WALL_H / 2, -1.5], size: [0.12, WALL_H, 3] },
  { pos: [-2.6, WALL_H / 2, 1], size: [2.8, WALL_H, 0.12] },
  { pos: [-1.2, WALL_H / 2, 2], size: [0.12, WALL_H, 2] },
  { pos: [2.75, WALL_H / 2, 1], size: [2.5, WALL_H, 0.12] },
  { pos: [1.5, WALL_H / 2, 2], size: [0.12, WALL_H, 2] },
  { pos: [0.15, WALL_H / 2, 2.2], size: [2.7, WALL_H, 0.12] },
  // roof slab
  { pos: [0, WALL_H + 0.08, 0], size: [8.3, 0.16, 6.3] },
  // floor slab edge
  { pos: [0, 0.04, 0], size: [8.2, 0.08, 6.2] },
];

// Sample a point on the surface of an axis-aligned box (rotation applied after)
function sampleBox(b: Box): [number, number, number] {
  const face = Math.floor(Math.random() * 6);
  const [w, h, d] = b.size;
  let x: number, y: number, z: number;
  const u = Math.random();
  const v = Math.random();
  switch (face) {
    case 0: x = -w / 2; y = (u - 0.5) * h; z = (v - 0.5) * d; break; // -x
    case 1: x = w / 2; y = (u - 0.5) * h; z = (v - 0.5) * d; break; // +x
    case 2: x = (u - 0.5) * w; y = -h / 2; z = (v - 0.5) * d; break; // -y
    case 3: x = (u - 0.5) * w; y = h / 2; z = (v - 0.5) * d; break; // +y
    case 4: x = (u - 0.5) * w; y = (v - 0.5) * h; z = -d / 2; break; // -z
    default: x = (u - 0.5) * w; y = (v - 0.5) * h; z = d / 2; break; // +z
  }
  let px = x + b.pos[0];
  let py = y + b.pos[1];
  let pz = z + b.pos[2];
  if (b.rotY) {
    const c = Math.cos(b.rotY);
    const s = Math.sin(b.rotY);
    const rx = px - b.pos[0];
    const rz = pz - b.pos[2];
    px = b.pos[0] + rx * c - rz * s;
    pz = b.pos[2] + rx * s + rz * c;
  }
  return [px, py, pz];
}

// Sample N points across bungalow surfaces, weighted by surface area.
export function sampleBungalow(count: number): Float32Array {
  const areas = BUNGALOW.map((b) => {
    const [w, h, d] = b.size;
    return 2 * (w * h + w * d + h * d);
  });
  const total = areas.reduce((a, b) => a + b, 0);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total;
    for (let s = 0; s < BUNGALOW.length; s++) {
      if (r <= areas[s]) {
        const p = sampleBox(BUNGALOW[s]);
        out[i * 3] = p[0];
        out[i * 3 + 1] = p[1];
        out[i * 3 + 2] = p[2];
        break;
      }
      r -= areas[s];
    }
  }
  return out;
}
