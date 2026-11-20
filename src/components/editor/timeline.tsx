"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Type, Music2, BadgeCheck, EyeOff, Sparkles, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { layoutVideo, moveItem, trimItem, updateText, updateAudio } from "@/lib/timeline/ops";
import type { AssetMap, TimelineDoc } from "@/lib/timeline/types";
import { clamp, cn, formatTimecode, round } from "@/lib/utils";
import type { EditorAsset } from "./state";

export interface Marker {
  id: string;
  start: number;
  end: number;
  severity: "GOOD" | "WARN" | "BAD";
  label: string;
}

const ROW = { ruler: 24, video: 62, text: 30, audio: 40, logo: 22, blur: 22, ai: 16 };
const GUTTER = 92;

const waveCache = new Map<string, Promise<{ step: number; peaks: number[] } | null>>();
function loadWave(assetId: string) {
  if (!waveCache.has(assetId)) waveCache.set(assetId, fetch(`/api/media/${assetId}?v=waveform`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return waveCache.get(assetId)!;
}

function Waveform({ assetId, sourceIn, sourceOut, width, height }: { assetId: string; sourceIn: number; sourceOut: number; width: number; height: number }) {
  const [wave, setWave] = useState<{ step: number; peaks: number[] } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadWave(assetId).then((w) => alive && setWave(w));
    return () => {
      alive = false;
    };
  }, [assetId]);
  if (!wave || width < 4) return null;
  const bars = Math.max(1, Math.floor(width / 3));
  const d: string[] = [];
  for (let i = 0; i < bars; i++) {
    const t = sourceIn + ((i + 0.5) / bars) * (sourceOut - sourceIn);
    const v = wave.peaks[Math.floor(t / wave.step)] ?? 0;
    const h = Math.max(1, v * (height - 6));
    d.push(`M${i * 3 + 1},${(height - h) / 2}v${h}`);
  }
  return (
    <svg width={width} height={height} className="pointer-events-none absolute inset-0 opacity-70">
      <path d={d.join("")} stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}

type Drag =
  | { kind: "clip-move"; id: string; index: number; x0: number; moved: boolean; target: number }
  | { kind: "clip-trim"; id: string; side: "in" | "out"; x0: number; orig: number; speed: number }
  | { kind: "range"; track: "text" | "logo" | "blur"; id: string; mode: "move" | "start" | "end"; x0: number; s0: number; e0: number; words?: Array<{ text: string; start: number; end: number }> }
  | { kind: "audio"; id: string; mode: "move" | "in" | "out"; x0: number; start0: number; in0: number; out0: number }
  | { kind: "scrub" };

export function Timeline({
  doc,
  assets,
  time,
  onSeek,
  selectedId,
  onSelect,
  apply,
  commit,
  markers,
}: {
  doc: TimelineDoc;
  assets: Record<string, EditorAsset>;
  time: number;
  onSeek: (t: number) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  apply: (fn: (d: TimelineDoc) => TimelineDoc, transient?: boolean) => void;
  commit: () => void;
  markers: Marker[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pps, setPps] = useState(60);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const { entries, total } = useMemo(() => layoutVideo(doc), [doc]);
  const assetMap: AssetMap = useMemo(() => Object.fromEntries(Object.values(assets).map((a) => [a.id, { id: a.id, durationSec: a.durationSec, hasAudio: a.hasAudio, width: a.width, height: a.height, kind: a.kind }])), [assets]);
  const width = Math.max(total + 4, 12) * pps;
  const textLanes = useMemo(() => {
    const lanes: number[] = [];
    const map = new Map<string, number>();
    [...doc.texts].sort((a, b) => a.start - b.start).forEach((t) => {
      let li = lanes.findIndex((end) => end <= t.start + 0.01);
      if (li < 0) {
        li = lanes.length;
        lanes.push(0);
      }
      lanes[li] = t.end;
      map.set(t.id, li);
    });
    return { map, count: Math.max(1, lanes.length) };
  }, [doc.texts]);
  const textRowH = Math.max(ROW.text, textLanes.count * 22 + 6);

  // dopasowanie zoomu do szerokości przy pierwszym renderze
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !scrollRef.current || total <= 0) return;
    fitted.current = true;
    setPps(clamp((scrollRef.current.clientWidth - 40) / Math.max(total + 1, 6), 12, 240));
  }, [total]);

  const toTime = (clientX: number) => {
    const el = scrollRef.current!;
    const r = el.getBoundingClientRect();
    return Math.max(0, (clientX - r.left + el.scrollLeft) / pps);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "scrub") return onSeek(clamp(toTime(e.clientX), 0, total));
      const dt = (e.clientX - ("x0" in d ? d.x0 : 0)) / pps;
      if (d.kind === "clip-move") {
        if (!d.moved && Math.abs(dt * pps) < 5) return;
        const t = toTime(e.clientX);
        let target = 0;
        entries.forEach((en, i) => {
          if (i !== d.index && t > en.start + en.duration / 2) target = i < d.index ? i + 1 : i;
        });
        if (t < (entries[0]?.start ?? 0) + (entries[0]?.duration ?? 0) / 2) target = 0;
        const next = { ...d, moved: true, target };
        dragRef.current = next;
        setDrag(next);
      } else if (d.kind === "clip-trim") {
        const v = d.orig + dt * d.speed;
        apply((doc0) => trimItem(doc0, d.id, d.side === "in" ? { sourceIn: v } : { sourceOut: v }, assetMap), true);
      } else if (d.kind === "range") {
        let s = d.s0;
        let en = d.e0;
        if (d.mode === "move") {
          s = Math.max(0, d.s0 + dt);
          en = s + (d.e0 - d.s0);
        } else if (d.mode === "start") s = clamp(d.s0 + dt, 0, d.e0 - 0.2);
        else en = Math.max(d.s0 + 0.2, d.e0 + dt);
        const shift = s - d.s0;
        if (d.track === "text")
          apply((doc0) => updateText(doc0, d.id, { start: round(s, 3), end: round(en, 3), ...(d.words && d.mode === "move" ? { words: d.words.map((w) => ({ ...w, start: round(w.start + shift, 3), end: round(w.end + shift, 3) })) } : {}) }), true);
        if (d.track === "logo") apply((doc0) => ({ ...doc0, logos: doc0.logos.map((l) => (l.id === d.id ? { ...l, start: round(s, 3), end: round(en, 3) } : l)) }), true);
        if (d.track === "blur") apply((doc0) => ({ ...doc0, blurs: doc0.blurs.map((b) => (b.id === d.id ? { ...b, start: round(s, 3), end: round(en, 3) } : b)) }), true);
      } else if (d.kind === "audio") {
        const a = doc.audio.find((x) => x.id === d.id);
        const max = assets[a?.assetId ?? ""]?.durationSec ?? 9999;
        if (d.mode === "move") apply((doc0) => updateAudio(doc0, d.id, { start: round(Math.max(0, d.start0 + dt), 3) }), true);
        else if (d.mode === "in") {
          const nin = clamp(d.in0 + dt, 0, d.out0 - 0.5);
          apply((doc0) => updateAudio(doc0, d.id, { sourceIn: round(nin, 3), start: round(Math.max(0, d.start0 + (nin - d.in0)), 3) }), true);
        } else apply((doc0) => updateAudio(doc0, d.id, { sourceOut: round(clamp(d.out0 + dt, d.in0 + 0.5, max), 3) }), true);
      }
    };
    const up = () => {
      const d = dragRef.current;
      if (d?.kind === "clip-move") {
        if (d.moved && d.target !== d.index) apply((doc0) => moveItem(doc0, d.id, d.target));
        else onSelect(d.id);
      } else if (d && d.kind !== "scrub") commit();
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.kind, pps, entries, total]);

  const begin = (d: Drag) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = d;
    setDrag(d);
    if (d.kind !== "clip-move" && d.kind !== "scrub") onSelect(d.id);
  };

  const step = pps >= 120 ? 0.5 : pps >= 50 ? 1 : pps >= 20 ? 5 : 10;
  const ticks = Array.from({ length: Math.ceil(width / pps / step) + 1 }, (_, i) => i * step);
  const tracks: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }>; h: number }> = [
    { key: "video", label: "Wideo", icon: Film, h: ROW.video },
    { key: "text", label: "Napisy", icon: Type, h: textRowH },
    { key: "audio", label: "Muzyka", icon: Music2, h: ROW.audio },
    { key: "logo", label: "Logo", icon: BadgeCheck, h: ROW.logo },
    { key: "blur", label: "Rozmycie", icon: EyeOff, h: ROW.blur },
    { key: "ai", label: "Uwagi AI", icon: Sparkles, h: ROW.ai },
  ];
  const rangeItem = (track: "text" | "logo" | "blur", id: string, start: number, end: number, cls: string, label: React.ReactNode, words?: Array<{ text: string; start: number; end: number }>, lane?: number) => (
    <div
      key={id}
      className={cn("absolute flex cursor-grab items-center overflow-hidden rounded-md border px-1.5 text-[10px] font-medium active:cursor-grabbing", cls, selectedId === id && "ring-2 ring-white")}
      style={{ left: start * pps, width: Math.max(6, (end - start) * pps), ...(lane !== undefined ? { top: 3 + lane * 22, height: 19 } : { top: 4, bottom: 4 }) }}
      onPointerDown={(e) => begin({ kind: "range", track, id, mode: "move", x0: e.clientX, s0: start, e0: end, words })(e)}
    >
      <span className="pointer-events-none truncate">{label}</span>
      <span className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize hover:bg-white/40" onPointerDown={(e) => begin({ kind: "range", track, id, mode: "start", x0: e.clientX, s0: start, e0: end })(e)} />
      <span className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-white/40" onPointerDown={(e) => begin({ kind: "range", track, id, mode: "end", x0: e.clientX, s0: start, e0: end })(e)} />
    </div>
  );
  const withX = <T extends Drag>(d: T, e: React.PointerEvent): T => ({ ...d, x0: e.clientX });

  return (
    <div className="select-none rounded-xl border border-border bg-elevated">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <span className="tabular text-xs text-muted">{formatTimecode(time)} / {formatTimecode(total)}</span>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" onClick={() => setPps((p) => clamp(p / 1.4, 8, 400))} aria-label="Pomniejsz"><ZoomOut className="size-4" /></button>
          <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" onClick={() => setPps(clamp(((scrollRef.current?.clientWidth ?? 600) - 40) / Math.max(total + 1, 6), 8, 400))} aria-label="Dopasuj"><Maximize2 className="size-4" /></button>
          <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" onClick={() => setPps((p) => clamp(p * 1.4, 8, 400))} aria-label="Powiększ"><ZoomIn className="size-4" /></button>
        </div>
      </div>
      <div className="flex">
        <div className="shrink-0 border-r border-border" style={{ width: GUTTER }}>
          <div style={{ height: ROW.ruler }} />
          {tracks.map((t) => (
            <div key={t.key} className="flex items-center gap-1.5 border-t border-border/60 px-2 text-[11px] text-muted" style={{ height: t.h }}>
              <t.icon className="size-3.5 shrink-0 text-subtle" /> {t.label}
            </div>
          ))}
        </div>
        <div
          ref={scrollRef}
          className="relative min-w-0 flex-1 overflow-x-auto"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setPps((p) => clamp(p * (e.deltaY < 0 ? 1.15 : 0.87), 8, 400));
            }
          }}
          onPointerDown={() => onSelect(null)}
        >
          <div className="relative" style={{ width }}>
            {/* linijka */}
            <div className="relative cursor-pointer border-b border-border bg-surface/60" style={{ height: ROW.ruler }} onPointerDown={(e) => { e.stopPropagation(); onSeek(toTime(e.clientX)); dragRef.current = { kind: "scrub" }; setDrag({ kind: "scrub" }); }}>
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 h-full border-l border-border-strong/70" style={{ left: t * pps }}>
                  <span className="absolute left-1 top-1 text-[9px] tabular text-subtle">{formatTimecode(t, false)}</span>
                </div>
              ))}
            </div>
            {/* wideo */}
            <div className="relative border-t border-border/60" style={{ height: ROW.video }}>
              {doc.video.map((v, i) => {
                const e = entries[i];
                const a = assets[v.assetId];
                const w = Math.max(8, e.duration * pps);
                const sp = a?.sprite;
                const th = ROW.video - 10;
                const tw = sp ? (sp.frameWidth / sp.frameHeight) * th : th * 0.56;
                const n = Math.min(80, Math.ceil(w / tw));
                const isDrag = drag?.kind === "clip-move" && drag.id === v.id && drag.moved;
                return (
                  <div
                    key={v.id}
                    className={cn("absolute top-[5px] overflow-hidden rounded-md border bg-surface-3 transition-[opacity]", selectedId === v.id ? "border-primary ring-2 ring-primary/60" : "border-border-strong", isDrag && "opacity-50", "cursor-grab active:cursor-grabbing")}
                    style={{ left: e.start * pps, width: w, height: th }}
                    onPointerDown={(ev) => begin(withX({ kind: "clip-move", id: v.id, index: i, x0: 0, moved: false, target: i }, ev))(ev)}
                    title={v.label ?? a?.name}
                  >
                    {sp && (
                      <div className="pointer-events-none absolute inset-0 flex">
                        {Array.from({ length: n }, (_, k) => {
                          const local = ((k + 0.5) * tw) / pps;
                          const src = v.sourceIn + local * v.speed;
                          const idx = clamp(Math.floor(src / sp.interval), 0, sp.count - 1);
                          return <div key={k} className="h-full shrink-0" style={{ width: tw, backgroundImage: `url(/api/media/${v.assetId}?v=sprite)`, backgroundSize: `${sp.count * tw}px ${th}px`, backgroundPosition: `${-idx * tw}px 0` }} />;
                        })}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-0.5 pt-3 text-[10px] text-white">
                      {i + 1}. {v.label ?? a?.name ?? "klip"} {v.speed !== 1 && <span className="text-accent">{v.speed}×</span>}
                    </div>
                    {v.transition.type !== "cut" && <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-accent/70 to-transparent" />}
                    <span className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/50" onPointerDown={(ev) => begin({ kind: "clip-trim", id: v.id, side: "in", x0: ev.clientX, orig: v.sourceIn, speed: v.speed })(ev)} />
                    <span className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/50" onPointerDown={(ev) => begin({ kind: "clip-trim", id: v.id, side: "out", x0: ev.clientX, orig: v.sourceOut, speed: v.speed })(ev)} />
                  </div>
                );
              })}
              {drag?.kind === "clip-move" && drag.moved && (
                <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent shadow-[0_0_8px_var(--accent)]" style={{ left: (drag.target <= drag.index ? entries[drag.target].start : entries[Math.min(drag.target, entries.length - 1)].end) * pps }} />
              )}
            </div>
            {/* napisy */}
            <div className="relative border-t border-border/60" style={{ height: textRowH }}>
              {doc.texts.map((t) => rangeItem("text", t.id, t.start, t.end, t.kind === "cta" ? "border-accent/50 bg-accent/20 text-accent" : t.kind === "transcript" ? "border-good/40 bg-good/15 text-good" : "border-primary/50 bg-primary/20 text-[#a9c4ff]", t.text, t.words, textLanes.map.get(t.id) ?? 0))}
            </div>
            {/* muzyka */}
            <div className="relative border-t border-border/60" style={{ height: ROW.audio }}>
              {doc.audio.map((m) => {
                const len = m.sourceOut - m.sourceIn;
                const w = Math.max(8, len * pps);
                return (
                  <div key={m.id} className={cn("absolute inset-y-1 overflow-hidden rounded-md border border-[#a78bfa]/50 bg-[#a78bfa]/15 text-[#c4b5fd]", selectedId === m.id && "ring-2 ring-white")} style={{ left: m.start * pps, width: w }} onPointerDown={(e) => begin({ kind: "audio", id: m.id, mode: "move", x0: e.clientX, start0: m.start, in0: m.sourceIn, out0: m.sourceOut })(e)}>
                    <Waveform assetId={m.assetId} sourceIn={m.sourceIn} sourceOut={m.sourceOut} width={w} height={ROW.audio - 8} />
                    <span className="pointer-events-none relative px-1.5 text-[10px] font-medium">{m.label ?? assets[m.assetId]?.name}</span>
                    <span className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize hover:bg-white/40" onPointerDown={(e) => begin({ kind: "audio", id: m.id, mode: "in", x0: e.clientX, start0: m.start, in0: m.sourceIn, out0: m.sourceOut })(e)} />
                    <span className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-white/40" onPointerDown={(e) => begin({ kind: "audio", id: m.id, mode: "out", x0: e.clientX, start0: m.start, in0: m.sourceIn, out0: m.sourceOut })(e)} />
                  </div>
                );
              })}
            </div>
            {/* logo */}
            <div className="relative border-t border-border/60" style={{ height: ROW.logo }}>
              {doc.logos.map((l) => rangeItem("logo", l.id, l.start, l.end, "border-warn/50 bg-warn/15 text-warn", "Logo"))}
            </div>
            {/* rozmycia */}
            <div className="relative border-t border-border/60" style={{ height: ROW.blur }}>
              {doc.blurs.map((b) => rangeItem("blur", b.id, b.start, b.end, "border-border-strong bg-surface-3 text-muted", b.label ?? "Rozmycie"))}
            </div>
            {/* znaczniki AI */}
            <div className="relative border-t border-border/60" style={{ height: ROW.ai }}>
              {markers.map((m) => (
                <button key={m.id} title={`${formatTimecode(m.start)} · ${m.label}`} onPointerDown={(e) => { e.stopPropagation(); onSeek(m.start); }} className={cn("absolute top-1 h-2 min-w-[6px] rounded-full", m.severity === "GOOD" ? "bg-good" : m.severity === "WARN" ? "bg-warn" : "bg-bad")} style={{ left: m.start * pps, width: Math.max(6, (m.end - m.start) * pps) }} />
              ))}
            </div>
            {/* playhead */}
            <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white" style={{ left: time * pps }}>
              <div className="absolute -left-[5px] top-0 size-[11px] rotate-45 rounded-[2px] bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
