import { useEffect, useRef } from 'react';
import { useReducedMotionPref } from '../lib/motion';

/**
 * Abstrakcyjna sieć połączeń: węzły (turkus/fiolet) połączone liniami,
 * po których płyną bursztynowe impulsy — skojarzenie z przepływem informacji i ciepła w sieci.
 * Przy ograniczeniu animacji rysowana jest jedna statyczna klatka.
 */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: 'tech' | 'ai';
}
interface Pulse {
  a: number;
  b: number;
  t: number;
  speed: number;
}

const COLORS = { tech: '45, 212, 191', ai: '167, 139, 250', heat: '251, 191, 36' };

export function NetworkBackground({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotionPref();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const linkDist = () => Math.min(190, Math.max(120, Math.min(w, h) / 4));

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(80, Math.max(26, (w * h) / 16000)) * density);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1 + Math.random() * 1.8,
        hue: Math.random() < 0.28 ? 'ai' : 'tech',
      }));
      pulses = [];
    };

    const neighbours = (i: number) => {
      const d = linkDist();
      const out: number[] = [];
      for (let j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy < d * d) out.push(j);
      }
      return out;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const d = linkDist();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < d) {
            const alpha = (1 - dist / d) * 0.22;
            ctx.strokeStyle = `rgba(${COLORS.tech}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      for (const p of pulses) {
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, `rgba(${COLORS.heat}, 0.95)`);
        g.addColorStop(1, `rgba(${COLORS.heat}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${COLORS[n.hue]}, 0.85)`;
        ctx.shadowColor = `rgba(${COLORS[n.hue]}, 0.9)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const step = () => {
      if (!running) return;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      if (pulses.length < Math.max(4, nodes.length / 6) && Math.random() < 0.06) {
        const a = Math.floor(Math.random() * nodes.length);
        const nb = neighbours(a);
        if (nb.length) pulses.push({ a, b: nb[Math.floor(Math.random() * nb.length)], t: 0, speed: 0.006 + Math.random() * 0.01 });
      }
      pulses = pulses.flatMap((p) => {
        p.t += p.speed;
        if (p.t < 1) return [p];
        const nb = neighbours(p.b).filter((x) => x !== p.a);
        if (nb.length && Math.random() < 0.6) return [{ a: p.b, b: nb[Math.floor(Math.random() * nb.length)], t: 0, speed: p.speed }];
        return [];
      });
      draw();
      raf = requestAnimationFrame(step);
    };

    setup();
    if (reduce) {
      // Statyczna klatka z kilkoma impulsami
      for (let i = 0; i < 6; i++) {
        const a = Math.floor(Math.random() * nodes.length);
        const nb = neighbours(a);
        if (nb.length) pulses.push({ a, b: nb[0], t: Math.random(), speed: 0 });
      }
      draw();
    } else {
      raf = requestAnimationFrame(step);
    }

    const onResize = () => {
      setup();
      if (reduce) draw();
    };
    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduce, density]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
