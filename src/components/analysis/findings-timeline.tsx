"use client";
import { cn, formatTimecode } from "@/lib/utils";

export interface TimelineFinding {
  id: string;
  start: number;
  end: number;
  severity: "GOOD" | "WARN" | "BAD";
  problem: string | null;
  shotDescription: string;
}

const SEV = { GOOD: "bg-good", WARN: "bg-warn", BAD: "bg-bad" } as const;

/** Interaktywna oś czasu pod odtwarzaczem: sceny, uwagi AI (kolory), playhead; klik = przejście do momentu. */
export function FindingsTimeline({ duration, current, findings, scenes, selectedId, onSeek, onSelect }: { duration: number; current: number; findings: TimelineFinding[]; scenes: Array<{ start: number; end: number }>; selectedId?: string | null; onSeek: (t: number) => void; onSelect: (id: string) => void }) {
  const pct = (t: number) => `${(Math.max(0, Math.min(duration, t)) / Math.max(0.001, duration)) * 100}%`;
  // rozkład uwag na „tory”, by nie nachodziły na siebie
  const lanes: TimelineFinding[][] = [];
  [...findings].sort((a, b) => a.start - b.start).forEach((f) => {
    const lane = lanes.find((l) => l[l.length - 1].end <= f.start + 0.05);
    if (lane) lane.push(f);
    else lanes.push([f]);
  });
  const step = duration <= 8 ? 1 : duration <= 20 ? 4 : duration <= 45 ? 5 : duration <= 120 ? 15 : 30;
  const ticks = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step).filter((t) => t < duration - step * 0.4);
  return (
    <div className="select-none">
      <div
        className="relative h-7 cursor-pointer rounded-md bg-surface-2"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        {scenes.map((s, i) => (
          <div key={i} className={cn("absolute inset-y-0 border-l border-border-strong", i % 2 ? "bg-surface-3/60" : "")} style={{ left: pct(s.start), width: `calc(${pct(s.end)} - ${pct(s.start)})` }}>
            <span className="absolute left-1 top-1 text-[9px] text-subtle">{i + 1}</span>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ left: pct(current) }} />
      </div>
      <div className="relative mt-1.5 space-y-1">
        {lanes.map((lane, li) => (
          <div key={li} className="relative h-3">
            {lane.map((f) => (
              <button
                key={f.id}
                title={`${formatTimecode(f.start)}–${formatTimecode(f.end)} · ${f.problem ?? f.shotDescription}`}
                onClick={() => {
                  onSeek(f.start);
                  onSelect(f.id);
                }}
                className={cn("absolute inset-y-0 min-w-[6px] rounded-sm opacity-85 transition hover:opacity-100", SEV[f.severity], selectedId === f.id && "ring-2 ring-white")}
                style={{ left: pct(f.start), width: `calc(${pct(f.end)} - ${pct(f.start)})` }}
                aria-label={`Uwaga ${formatTimecode(f.start)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[10px] text-subtle">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 tabular" style={{ left: pct(t) }}>{formatTimecode(t, false)}</span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-good" /> dobry moment</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-warn" /> do poprawy</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-bad" /> problematyczny</span>
      </div>
    </div>
  );
}
