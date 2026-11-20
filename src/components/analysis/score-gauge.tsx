"use client";
import { motion } from "motion/react";

export function ScoreGauge({ score, size = 168, label = "AI REEL SCORE", scaled }: { score: number; size?: number; label?: string; scaled?: boolean }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#f5b638" : "#f04b5c";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3d7bff" />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={10} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#gauge)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[44px] font-semibold leading-none tabular" style={{ color }}>{Math.round(score)}</span>
        <span className="mt-1 text-xs text-subtle">/ 100{scaled ? "*" : ""}</span>
        <span className="mt-1.5 text-[9px] font-semibold tracking-[0.2em] text-muted">{label}</span>
      </div>
    </div>
  );
}
