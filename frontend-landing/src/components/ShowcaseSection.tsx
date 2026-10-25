import { useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';

// Second section — a continuation matching the reference's structure:
// after the morph reveal, a clean editorial section introducing the work,
// with generous negative space, hairline rules, and scroll-triggered reveals.
export function ShowcaseSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal, .mask-line');
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add('is-visible');
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="work"
      ref={ref}
      className="relative z-[2] bg-transparent"
    >

      {/* Intro statement */}
      <div className="min-h-screen flex flex-col justify-center px-6 md:px-12 py-32">
        <div className="max-w-5xl">
          <p className="reveal text-[11px] uppercase tracking-[0.35em] text-[#e8d5b8]/40 mb-10 font-body">
            ( The Reveal )
          </p>
          <h2 className="font-display text-[8vw] md:text-[5vw] leading-[1.0] text-[#e8d5b8] tracking-tight" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.6)' }}>
            <span className="block mask-line">
              <span>A plan, given</span>
            </span>
            <span className="block mask-line" style={{ transitionDelay: '0.12s' }}>
              <span className="italic font-light text-[#e8d5b8]/75">volume.</span>
            </span>
          </h2>
          <div className="mt-14 grid md:grid-cols-2 gap-10 md:gap-20 max-w-3xl">
            <p className="reveal font-body text-[16px] leading-relaxed text-[#e8d5b8]/55 font-light" style={{ transitionDelay: '0.2s', textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>
              Every line of the floor plan dissolves into particles and
              reassembles as a three-dimensional home — walls, roof, rooms and
              light, emerging from the page.
            </p>
            <p className="reveal font-body text-[16px] leading-relaxed text-[#e8d5b8]/45 font-light" style={{ transitionDelay: '0.3s', textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>
              Beyond 2D turns any 2D architectural drawing into an explorable
              spatial model. The transformation is the story.
            </p>
          </div>
        </div>
      </div>

      {/* Process row — three minimal steps */}
      <div className="px-6 md:px-12 pb-32">
        <div className="hairline mb-16" />
        <div className="grid md:grid-cols-3 gap-12 md:gap-20">
          {[
            { n: '01', t: 'Plan', d: 'A precise 2D floor plan, rendered as a field of particles on a dark plane.' },
            { n: '02', t: 'Dissolve', d: 'The particles lift, scatter, and travel — the flat lines becoming volume.' },
            { n: '03', t: 'Space', d: 'A fully realised 3D bungalow, slowly turning in light. Beyond two dimensions.' },
          ].map((s, i) => (
            <div key={s.n} className="reveal" style={{ transitionDelay: `${0.1 + i * 0.1}s` }}>
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#e8d5b8]/40 mb-4 font-body">
                {s.n} / {s.t}
              </div>
              <p className="font-display text-[24px] md:text-[28px] leading-snug text-[#e8d5b8]/90 tracking-tight" style={{ textShadow: '0 1px 16px rgba(0,0,0,0.5)' }}>
                {s.d}
              </p>
            </div>
          ))}
        </div>

        <div className="hairline mt-24 mb-16" />

        {/* CTA row */}
        <div id="contact" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 reveal">
          <div>
            <h3 className="font-display text-[32px] md:text-[42px] text-[#e8d5b8] leading-tight tracking-tight" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
              Bring your own plan to life.
            </h3>
            <p className="font-body text-[14px] text-[#e8d5b8]/45 mt-4 font-light max-w-md" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
              Beyond 2D turns any floor plan into an explorable 3D model — in minutes.
            </p>
          </div>
          <a
            href="#contact"
            className="pointer-events-auto inline-flex items-center gap-2.5 px-8 py-4 border border-[#e8d5b8]/15 hover:border-[#e8d5b8]/50 hover:bg-[#e8d5b8]/5 text-[11px] uppercase tracking-[0.25em] text-[#e8d5b8] transition-all duration-500 font-body"
          >
            Get in touch
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.25} />
          </a>
        </div>

        {/* Footer */}
        <div className="mt-32 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#e8d5b8]/25 font-body">
          <span>Beyond 2D — Architectural Visualisation</span>
          <span>2026</span>
        </div>
      </div>
    </section>
  );
}
