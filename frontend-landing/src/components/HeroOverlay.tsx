import { useEffect, useState } from 'react';

// Hero overlay matching the reference's text placement: large editorial
// headline, supporting line, and a small location/tag line. Positioned in the
// lower-left / lower-center area. Fades out as the user scrolls (morph starts).
export function HeroOverlay({ show }: { show: boolean }) {
  const [scrollP, setScrollP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrollP(Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 2.0))));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const opacity = show ? Math.max(0, 1 - scrollP * 1.4) : 0;
  const translateY = show ? scrollP * -30 : 0;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-end px-6 md:px-12 pb-[10vh] md:pb-[12vh]"
      style={{ opacity, transform: `translateY(${translateY}px)` }}
    >
      <div className="max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#e8d5b8]/45 mb-6 font-body">
          Architectural Visualisation
        </p>
        <h1 className="font-display text-[12vw] md:text-[7.5vw] leading-[0.95] text-[#e8d5b8] tracking-tight">
          <span className="block mask-line is-visible">
            <span>From flat lines</span>
          </span>
          <span className="block mask-line is-visible" style={{ transitionDelay: '0.15s' }}>
            <span className="italic font-light text-[#e8d5b8]/80">to living spaces.</span>
          </span>
        </h1>
        <div className="mt-8 max-w-md">
          <p className="font-body text-[15px] md:text-[16px] leading-relaxed text-[#e8d5b8]/55 font-light">
            Transform your floor plans into immersive 3D spaces.
            See your ideas take shape beyond two dimensions.
          </p>
          <div className="mt-8 flex items-center gap-5 pointer-events-auto">
            <a
              href="/studio"
              onClick={(e) => {
                e.preventDefault();
                if (window.location.port === '3000') window.location.href = '/';
                else window.location.href = '/studio';
              }}
              className="px-8 py-3.5 rounded-full bg-[#e8d5b8] hover:bg-white text-[#0a0e27] font-semibold text-[11px] uppercase tracking-[0.25em] transition-all duration-300 shadow-[0_4px_24px_rgba(232,213,184,0.35)] hover:scale-105 flex items-center gap-2.5"
            >
              <span>Explore Now</span>
              <span className="text-[14px]">→</span>
            </a>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#e8d5b8]/40 font-body hidden sm:inline">
              Or scroll to transform ↓
            </span>
          </div>
        </div>
        <p className="mt-10 text-[11px] uppercase tracking-[0.3em] text-[#e8d5b8]/35 font-body">
          Scroll to transform
        </p>
      </div>
    </div>
  );
}
