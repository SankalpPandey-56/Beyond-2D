import { useEffect, useRef } from 'react';

// Glowing-point cursor with a single continuous trailing aura that fades out
// smoothly. Drawn on a full-screen canvas so the trail reads as one unbroken
// ribbon (quadratic-curve stroke with a head-to-tail alpha gradient) rather
// than a string of discrete circles. Disabled on touch devices and reduced
// motion (which keeps the native cursor and no trail).
export function CursorGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reduced) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: w / 2, y: h / 2 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);

    // Eased follow positions. The head eases slowly toward the mouse for a
    // dreamy, floating lag, and the trail eases even more slowly behind it,
    // producing a long comet tail that settles gently when you stop.
    let hx = mouse.x;
    let hy = mouse.y;
    let fx = mouse.x;
    let fy = mouse.y;
    const trail: { x: number; y: number }[] = [];
    const MAX = 30;

    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      ctx.clearRect(0, 0, w, h);

      hx += (mouse.x - hx) * 0.085;
      hy += (mouse.y - hy) * 0.085;
      fx += (mouse.x - fx) * 0.05;
      fy += (mouse.y - fy) * 0.05;
      trail.push({ x: fx, y: fy });
      if (trail.length > MAX) trail.shift();

      if (trail.length > 2) {
        const first = trail[0];
        const last = trail[trail.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Two passes: a wide soft outer halo, then a tighter inner core. Both
        // use a head-to-tail alpha gradient so the ribbon fades as one piece.
        for (let pass = 0; pass < 2; pass++) {
          const baseWidth = pass === 0 ? 16 : 4.5;
          const peakAlpha = pass === 0 ? 0.08 : 0.55;

          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          for (let i = 1; i < trail.length - 1; i++) {
            const xc = (trail[i].x + trail[i + 1].x) / 2;
            const yc = (trail[i].y + trail[i + 1].y) / 2;
            ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
          }
          ctx.lineTo(last.x, last.y);

          const grad = ctx.createLinearGradient(first.x, first.y, first.x + dx, first.y + dy);
          grad.addColorStop(0, 'rgba(232, 213, 184, 0)');
          grad.addColorStop(0.65, `rgba(232, 213, 184, ${peakAlpha * 0.4})`);
          grad.addColorStop(1, `rgba(232, 213, 184, ${peakAlpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = baseWidth;
          ctx.stroke();
        }
      }

      // Wide, very faint ambient glow at the real cursor position — a minimal
      // halo that follows wherever the cursor goes without competing with the
      // bright head.
      const amb = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
      amb.addColorStop(0, 'rgba(232, 213, 184, 0.06)');
      amb.addColorStop(0.5, 'rgba(232, 213, 184, 0.025)');
      amb.addColorStop(1, 'rgba(232, 213, 184, 0)');
      ctx.fillStyle = amb;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2);
      ctx.fill();

      // Bright glowing head, eased toward the cursor for a floating feel.
      const aura = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26);
      aura.addColorStop(0, 'rgba(255, 244, 220, 0.95)');
      aura.addColorStop(0.35, 'rgba(232, 213, 184, 0.4)');
      aura.addColorStop(1, 'rgba(232, 213, 184, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(hx, hy, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 250, 240, 0.98)';
      ctx.beginPath();
      ctx.arc(hx, hy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
