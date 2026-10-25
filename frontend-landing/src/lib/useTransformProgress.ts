import { useEffect, useState } from 'react';

// Scroll-driven progress for the particle morph. The transformation is mapped
// to the first viewport of scroll (0..1 as the user scrolls one screen),
// matching the reference's scroll-driven particle morphing.
//
// A tiny amount of "preloaded" progress so the plan is visible at rest (0)
// and the morph begins immediately on scroll.
export function useTransformProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      const sy = window.scrollY;
      const vh = window.innerHeight;
      // Map ~3.5 viewports of scroll to 0..1 for a slow, cinematic morph so the
      // 2D plan gradually transitions into the 3D bungalow rather than snapping.
      const p = Math.max(0, Math.min(1, sy / (vh * 3.5)));
      setProgress(p);
    };
    const tick = () => {
      onScroll();
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}
