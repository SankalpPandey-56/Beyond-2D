// Minimal top nav matching the reference: small wordmark left, a couple of
// links right, ultra-thin. Fades in after preloader.
export function NavBar({ show }: { show: boolean }) {
  const handleExplore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.port === '3000') {
      window.location.href = '/';
    } else {
      window.location.href = '/studio';
    }
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-opacity duration-1000"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="flex items-center justify-between px-6 md:px-12 py-7">
        <span className="font-display text-[16px] tracking-tight text-[#e8d5b8] flex items-center gap-2">
          Beyond<span className="text-[#e8d5b8]/50"> 2D</span>
          <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#e8d5b8]/20 text-[#e8d5b8]/60">Studio</span>
        </span>
        <div className="flex items-center gap-6 md:gap-8 text-[11px] uppercase tracking-[0.25em] text-[#e8d5b8]/55 font-body">
          <a href="#work" className="hover:text-[#e8d5b8] transition-colors duration-500 hidden sm:inline">Work</a>
          <a
            href="/studio"
            onClick={handleExplore}
            className="pointer-events-auto px-5 py-2.5 rounded-full border border-[#e8d5b8]/30 hover:border-[#e8d5b8] bg-[#e8d5b8]/10 hover:bg-[#e8d5b8]/25 text-[#e8d5b8] font-medium tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(232,213,184,0.15)] flex items-center gap-2 hover:scale-105"
          >
            <span>Explore Now</span>
            <span className="text-[12px]">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
