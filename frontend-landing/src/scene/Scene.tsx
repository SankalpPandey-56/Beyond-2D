import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { MorphParticles } from './MorphParticles';
import { CameraRig } from './CameraRig';
import { smoothstep, lerp } from '@/lib/materials';

// A warm, travelling illumination that grows as the bungalow assembles.
// It slowly orbits the model, revealing walls, roof, and edges with soft
// falloff — cinematic and dreamy, not a harsh spotlight.
function CinematicLight({ progress }: { progress: number }) {
  const warmRef = useRef<THREE.PointLight>(null);
  const rimRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const reveal = smoothstep(0.6, 0.95, progress);

    // Warm key light orbits slowly, intensity grows with assembly
    if (warmRef.current) {
      const angle = t * 0.05;
      const radius = 7;
      warmRef.current.position.x = Math.cos(angle) * radius;
      warmRef.current.position.z = Math.sin(angle) * radius;
      warmRef.current.position.y = 4 + Math.sin(t * 0.3) * 1.2;
      warmRef.current.intensity = lerp(0, 18, reveal);
    }

    // Soft rim/spots light from the opposite side for edge definition
    if (rimRef.current) {
      const angle = t * 0.05 + Math.PI;
      rimRef.current.position.x = Math.cos(angle) * 6;
      rimRef.current.position.z = Math.sin(angle) * 6;
      rimRef.current.position.y = 5;
      rimRef.current.intensity = lerp(0, 6, reveal);
    }
  });

  return (
    <>
      <pointLight
        ref={warmRef}
        color={'#e8d5b8'}
        intensity={0}
        distance={22}
        decay={2}
      />
      <spotLight
        ref={rimRef}
        color={'#d4b896'}
        intensity={0}
        distance={24}
        decay={2}
        angle={0.7}
        penumbra={1}
      />
    </>
  );
}

// Soft pointer-following illumination. Tracks the cursor globally (so it works
// even when overlay sections sit above the canvas) and projects it onto a plane
// near the bungalow. A warm point light moves there with smooth lerped easing,
// blending with the champagne palette. Fades in only as the model assembles.
// Disabled on touch devices.
function PointerLight({ progress }: { progress: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 2.5, 0));
  const ndc = useRef(new THREE.Vector2(0, 0));
  const ndcTarget = useRef(new THREE.Vector2(0, 0));
  const active = useRef(false);

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (isTouch) return;
    active.current = true;

    const onMove = (e: MouseEvent) => {
      ndcTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndcTarget.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(() => {
    if (!lightRef.current || !active.current) return;

    // Smooth the NDC coordinates so the light eases toward the cursor
    ndc.current.x = lerp(ndc.current.x, ndcTarget.current.x, 0.07);
    ndc.current.y = lerp(ndc.current.y, ndcTarget.current.y, 0.07);

    const reveal = smoothstep(0.5, 0.85, progress);

    // Project the smoothed NDC point onto a plane at y≈2.5 via the camera
    const projected = new THREE.Vector3(ndc.current.x, ndc.current.y, 0.5);
    projected.unproject(camera);
    const dir = projected.sub(camera.position).normalize();
    const planeY = 2.5;
    const denom = dir.y;
    if (Math.abs(denom) > 1e-4) {
      const dist = (planeY - camera.position.y) / denom;
      if (dist > 0) {
        target.current.set(
          camera.position.x + dir.x * dist,
          planeY,
          camera.position.z + dir.z * dist
        );
      }
    }

    // Smooth follow for the light position + intensity
    lightRef.current.position.lerp(target.current, 0.08);
    lightRef.current.intensity = lerp(
      lightRef.current.intensity,
      22 * reveal,
      0.06
    );
  });

  return (
    <pointLight
      ref={lightRef}
      color={'#e8d5b8'}
      intensity={0}
      distance={18}
      decay={2}
    />
  );
}

export function Scene({
  progress,
  reducedMotion,
}: {
  progress: number;
  reducedMotion: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ position: [0, 16, 0.01], fov: 42, near: 0.1, far: 100 }}
    >
      <color attach="background" args={['#0a0e27']} />
      <fog attach="fog" args={['#0a0e27', 18, 40]} />

      {/* Base ambient — dim so the warm light reads cinematically */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 4]} intensity={0.25} />

      {/* Cinematic warm illumination — grows as bungalow assembles */}
      <CinematicLight progress={progress} />

      {/* Pointer-following soft illumination — champagne, fades in with reveal */}
      <PointerLight progress={progress} />

      <MorphParticles progress={progress} />

      <CameraRig progress={progress} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
