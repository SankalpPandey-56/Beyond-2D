// Minimal top nav matching the reference: small wordmark left, a couple of
// links right, ultra-thin. Fades in after preloader.
export function NavBar({ show }: { show: boolean }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-opacity duration-1000"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="flex items-center justify-between px-6 md:px-12 py-7">
        <span className="font-display text-[15px] tracking-tight text-[#e8d5b8]">
          Beyond<span className="text-[#e8d5b8]/50"> 2D</span>
        </span>
        <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.25em] text-[#e8d5b8]/55 font-body">
          <a href="#work" className="hover:text-[#e8d5b8] transition-colors duration-500">Work</a>
          <a href="#contact" className="hover:text-[#e8d5b8] transition-colors duration-500">Contact</a>
        </div>
      </div>
    </nav>
  );
}
