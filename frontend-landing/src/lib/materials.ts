export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
