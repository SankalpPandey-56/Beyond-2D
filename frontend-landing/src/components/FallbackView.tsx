// Static fallback for no-WebGL devices: a monochrome SVG of the floor plan
// morphing concept — the plan outline with a hint of rising volume.
export function FallbackView() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e27]">
      <svg viewBox="-5 -4 10 8" className="w-full h-full max-h-screen" preserveAspectRatio="xMidYMid meet">
        <g stroke="#e8d5b8" strokeWidth="0.03" fill="none" opacity="0.7">
          {/* floor plan */}
          <rect x="-4" y="-3" width="8" height="6" />
          <line x1="-1.2" y1="-3" x2="-1.2" y2="0" />
          <line x1="-1.2" y1="0" x2="1.5" y2="0" />
          <line x1="1.5" y1="0" x2="1.5" y2="-3" />
          <line x1="-4" y1="1" x2="-1.2" y2="1" />
          <line x1="-1.2" y1="1" x2="-1.2" y2="3" />
          <line x1="1.5" y1="1" x2="4" y2="1" />
          <line x1="1.5" y1="1" x2="1.5" y2="3" />
          {/* rising hint */}
          <line x1="-4" y1="-3" x2="-4" y2="0" />
          <line x1="4" y1="-3" x2="4" y2="0" />
          <line x1="-4" y1="3" x2="-4" y2="0" />
          <line x1="4" y1="3" x2="4" y2="0" />
          <line x1="-4" y1="0" x2="0" y2="1.4" />
          <line x1="4" y1="0" x2="0" y2="1.4" />
        </g>
        <text x="0" y="-3.6" textAnchor="middle" fill="#c4ad8e" fontSize="0.28" fontFamily="sans-serif" letterSpacing="0.05em">
          BEYOND 2D
        </text>
      </svg>
    </div>
  );
}
