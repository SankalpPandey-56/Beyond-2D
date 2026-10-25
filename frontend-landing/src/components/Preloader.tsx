import { useEffect, useState } from 'react';

// Reference-style preloader: a percentage counter counting 0-100 over ~2.2s,
// then a curtain lift. Minimal, monochrome.
export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const dur = 2200;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setHidden(true);
          setTimeout(onComplete, 700);
        }, 300);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0a0e27] flex flex-col items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{ transform: hidden ? 'translateY(-100%)' : 'translateY(0)' }}
    >
      <div className="pre-counter font-display text-[14vw] md:text-[8vw] leading-none text-[#e8d5b8]/90 select-none">
        {count}
      </div>
      <div className="absolute bottom-10 left-0 right-0 px-6 md:px-12 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-[#e8d5b8]/40 font-body">
        <span>Beyond 2D</span>
        <span>Loading</span>
      </div>
    </div>
  );
}
