"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { formatTimecode } from "@/lib/utils";

export interface RetentionData {
  points: Array<{ t: number; value: number }>;
  segments: Array<{ start: number; end: number; level: "strong" | "good" | "drop" | "weak"; label: string }>;
  basis: string;
  disclaimer: string;
}

const LEVEL = {
  strong: { fill: "rgba(34,197,94,0.12)", text: "text-good", dot: "bg-good" },
  good: { fill: "rgba(61,123,255,0.08)", text: "text-primary", dot: "bg-primary" },
  drop: { fill: "rgba(245,182,56,0.12)", text: "text-warn", dot: "bg-warn" },
  weak: { fill: "rgba(240,75,92,0.14)", text: "text-bad", dot: "bg-bad" },
};

export function RetentionChart({ data, duration, current, onSeek }: { data: RetentionData; duration: number; current: number; onSeek: (t: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 150;
  const x = (t: number) => (t / Math.max(0.001, duration)) * W;
  const y = (v: number) => H - 8 - (v / 100) * (H - 16);
  const pts = data.points;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${x(pts[pts.length - 1].t)},${H} L0,${H} Z` : "";
  const hv = hover !== null ? pts.reduce((b, p) => (Math.abs(p.t - hover) < Math.abs(b.t - hover) ? p : b), pts[0]) : null;
  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[150px] w-full cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(((e.clientX - r.left) / r.width) * duration);
          }}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - r.left) / r.width) * duration);
          }}
          role="img"
          aria-label="Heurystyczna prognoza atrakcyjności kolejnych fragmentów"
        >
          <defs>
            <linearGradient id="ret" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3d7bff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#3d7bff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {data.segments.map((s, i) => (
            <rect key={i} x={x(s.start)} y={0} width={Math.max(1, x(s.end) - x(s.start))} height={H} fill={LEVEL[s.level].fill} />
          ))}
          {[25, 50, 75].map((g) => (
            <line key={g} x1={0} x2={W} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#ret)" />
          <path d={line} fill="none" stroke="#5a8fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <line x1={x(current)} x2={x(current)} y1={0} y2={H} stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {hv && <circle cx={x(hv.t)} cy={y(hv.value)} r={4} fill="#fff" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hv && (
          <div className="pointer-events-none absolute top-1 rounded-md border border-border bg-elevated px-2 py-1 text-[11px] shadow-lg" style={{ left: `min(calc(${(hv.t / duration) * 100}% + 8px), calc(100% - 120px))` }}>
            {formatTimecode(hv.t)} · prognoza {Math.round(hv.value)}
          </div>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.segments.map((s, i) => (
          <li key={i}>
            <button onClick={() => onSeek(s.start)} className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-surface-2">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${LEVEL[s.level].dot}`} />
              <span className="tabular text-muted">{formatTimecode(s.start, false)}–{formatTimecode(s.end, false)}</span>
              <span className={LEVEL[s.level].text}>{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-warn/25 bg-warn/8 px-3 py-2 text-[11px] leading-relaxed text-[#f7cf7a]">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {data.disclaimer}
      </p>
    </div>
  );
}
