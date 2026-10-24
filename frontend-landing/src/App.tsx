import { useEffect, useState } from 'react';
import { Scene } from '@/scene/Scene';
import { FallbackView } from '@/components/FallbackView';
import { NavBar } from '@/components/NavBar';
import { HeroOverlay } from '@/components/HeroOverlay';
import { Preloader } from '@/components/Preloader';
import { ShowcaseSection } from '@/components/ShowcaseSection';
import { CursorGlow } from '@/components/CursorGlow';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTransformProgress } from '@/lib/useTransformProgress';

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function App() {
  const reduced = useReducedMotion();
  const [webglOk, setWebglOk] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const progress = useTransformProgress();

  useEffect(() => {
    setWebglOk(detectWebGL());
  }, []);

  return (
    <div className="relative bg-[#0a0e27] grain vignette">
      <Preloader onComplete={() => setLoaded(true)} />
      <NavBar show={loaded} />

      {/* Fixed full-screen particle canvas behind the hero */}
      <div className="fixed inset-0 z-0">
        {webglOk ? (
          <Scene progress={progress} reducedMotion={reduced} />
        ) : (
          <FallbackView />
        )}
      </div>

      {/* Hero text overlay — fades on scroll as the morph begins */}
      <HeroOverlay show={loaded} />

      {/* Scroll spacer that drives the morph (first ~3.5 viewports) */}
      <div className="relative h-[350vh] z-[1] pointer-events-none" />

      {/* Second section — sits above the canvas with its own bg */}
      <div className="relative z-[2]">
        <ShowcaseSection />
      </div>

      {/* Glowing cursor with a continuous trailing aura */}
      <CursorGlow />
    </div>
  );
}

export default App;
