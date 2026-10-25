import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { samplePlan, sampleBungalow } from '@/lib/floorPlan';
import { smoothstep, lerp } from '@/lib/materials';

// Warm base color (cool plan state) and illuminated target color
const COOL = new THREE.Color('#dcdcdc');
const WARM = new THREE.Color('#f2e4cc');

// The defining visual: a single particle cloud that morphs from a flat 2D
// floor plan (lying on the ground) into the surface of a 3D bungalow.
// The morph is driven by `progress` (0 = plan, 1 = bungalow).
// White particles on black — monochrome, matching the reference aesthetic.
//
// Progress phases:
//   0.00 - 0.30  flat plan, subtle ambient drift, camera looking down
//   0.30 - 0.62  morph: particles lift and travel to bungalow surface targets
//   0.62 - 1.00  bungalow assembled, slow rotation, gentle float
export function MorphParticles({
  progress,
  count = 6000,
}: {
  progress: number;
  count?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  // Per-particle glow factor — a few particles glow more strongly
  const glow = useMemo(() => {
    const g = new Float32Array(count);
    for (let i = 0; i < count; i++) g[i] = Math.random() < 0.08 ? 1.6 + Math.random() * 0.8 : 0.7 + Math.random() * 0.3;
    return g;
  }, [count]);

  // Per-particle color buffer for warm illumination variation
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      c[i * 3] = COOL.r;
      c[i * 3 + 1] = COOL.g;
      c[i * 3 + 2] = COOL.b;
    }
    return c;
  }, [count]);

  const planPos = useMemo(() => samplePlan(count), [count]);
  const bungalowPos = useMemo(() => sampleBungalow(count), [count]);

  // current animated positions buffer
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    arr.set(planPos);
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    // per-particle random size variation via attribute
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) sizes[i] = 0.5 + Math.random() * 0.5;
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [count, planPos]);

  // slight per-particle phase offset for organic stagger
  const phases = useMemo(() => {
    const p = new Float32Array(count);
    for (let i = 0; i < count; i++) p[i] = Math.random();
    return p;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const arr = geometry.attributes.position.array as Float32Array;
    const mat = matRef.current;
    const pts = pointsRef.current;
    if (!mat || !pts) return;

    // Morph factor with easing and per-particle stagger
    const morph0 = 0.25;
    const morph1 = 0.72;
    const baseT = smoothstep(morph0, morph1, progress);

    // Global group rotation/float for final state
    const reveal = smoothstep(0.6, 0.85, progress);
    const rotY = reveal * t * 0.03;
    const floatY = reveal * Math.sin(t * 0.5) * 0.12;
    pts.rotation.y = rotY;
    pts.position.y = floatY;

    // Particle size grows slightly as they assemble into walls
    mat.size = lerp(0.045, 0.052, baseT);

    // Warm illumination: shift particle colour from cool grey to warm ivory
    // as the bungalow assembles, with per-particle glow variation
    const illum = smoothstep(0.5, 0.95, progress);
    const col = mat.color;
    col.r = lerp(COOL.r, WARM.r, illum);
    col.g = lerp(COOL.g, WARM.g, illum);
    col.b = lerp(COOL.b, WARM.b, illum);
    // Brightness rises gently with illumination
    mat.opacity = lerp(0.9, 0.96, illum);

    // Per-particle colour: glow particles warm up more
    const cArr = geometry.attributes.color.array as Float32Array;
    const warmPulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    if (illum > 0.01) {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const g = glow[i];
        const localIllum = illum * g * (0.7 + 0.3 * warmPulse);
        cArr[i3] = lerp(COOL.r, WARM.r * 1.1, Math.min(1, localIllum));
        cArr[i3 + 1] = lerp(COOL.g, WARM.g, Math.min(1, localIllum));
        cArr[i3 + 2] = lerp(COOL.b, WARM.b * 0.9, Math.min(1, localIllum));
      }
      geometry.attributes.color.needsUpdate = true;
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ph = phases[i];
      // staggered morph so particles don't all move at once
      const localT = smoothstep(0, 1, clamp01((baseT - ph * 0.18) / (1 - ph * 0.18)));

      const px = planPos[i3];
      const py = planPos[i3 + 1];
      const pz = planPos[i3 + 2];
      const bx = bungalowPos[i3];
      const by = bungalowPos[i3 + 1];
      const bz = bungalowPos[i3 + 2];

      // Add a curved path: particles arc upward during morph
      const arc = Math.sin(localT * Math.PI) * 0.8 * (0.5 + ph);
      let x = lerp(px, bx, localT);
      let y = lerp(py, by, localT) + arc;
      let z = lerp(pz, bz, localT);

      // ambient drift when settled in plan state
      const drift = (1 - baseT) * 0.02;
      x += Math.sin(t * 0.7 + ph * 12) * drift;
      z += Math.cos(t * 0.6 + ph * 9) * drift;

      // subtle shimmer on the assembled bungalow
      const shimmer = reveal * 0.012;
      x += Math.sin(t * 1.2 + ph * 20) * shimmer;
      y += Math.cos(t * 1.1 + ph * 16) * shimmer;

      arr[i3] = x;
      arr[i3 + 1] = y;
      arr[i3 + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color={'#dcdcdc'}
        size={0.05}
        transparent
        opacity={0.92}
        sizeAttenuation
        depthWrite={false}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
