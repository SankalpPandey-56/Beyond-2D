import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { smoothstep, lerp } from '@/lib/materials';

// Scroll-driven camera matching the reference pacing:
//   0.00 : high, looking straight down at the flat plan
//   0.30 : tilting, descending
//   0.55 : three-quarter angle as morph completes
//   0.80+: slow orbit around the assembled bungalow + cursor parallax
export function CameraRig({
  progress,
  reducedMotion,
}: {
  progress: number;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const targetMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(({ clock }) => {
    mouse.current.x = lerp(mouse.current.x, targetMouse.current.x, 0.04);
    mouse.current.y = lerp(mouse.current.y, targetMouse.current.y, 0.04);

    const p = progress;
    const t = clock.getElapsedTime();

    // Keyframes — spread across the slower, longer morph timeline so the
    // descent from the top-down plan view to the 3D orbit unfolds gradually.
    const k0 = new THREE.Vector3(0, 16, 0.01); // straight down
    const k1 = new THREE.Vector3(0, 13, 5); // slight tilt
    const k2 = new THREE.Vector3(7, 9, 9); // three-quarter
    const k3 = new THREE.Vector3(9, 7.5, 11); // final

    let cam: THREE.Vector3;
    if (p < 0.4) {
      cam = k0.clone().lerp(k1, smoothstep(0, 0.4, p));
    } else if (p < 0.72) {
      cam = k1.clone().lerp(k2, smoothstep(0.4, 0.72, p));
    } else {
      cam = k2.clone().lerp(k3, smoothstep(0.72, 0.96, p));
    }

    // Slow orbit in final state
    const orbit = smoothstep(0.82, 1.0, p);
    cam.x += Math.cos(t * 0.002) * 1.0 * orbit;
    cam.z += Math.sin(t * 0.002) * 1.0 * orbit;

    // Cursor parallax (disabled in reduced motion)
    const par = smoothstep(0.5, 0.8, p) * (reducedMotion ? 0 : 1);
    cam.x += mouse.current.x * 0.7 * par;
    cam.y += -mouse.current.y * 0.35 * par;

    camera.position.copy(cam);
    camera.lookAt(0, 1.2, 0);
  });

  return null;
}
