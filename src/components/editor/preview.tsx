"use client";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { layoutVideo, locate, totalDuration } from "@/lib/timeline/ops";
import type { TimelineDoc } from "@/lib/timeline/types";
import { PLATFORMS } from "@/lib/constants";
import { clamp } from "@/lib/utils";
import { CaptionOverlay } from "./caption-overlay";
import type { EditorAsset } from "./state";

export interface PreviewHandle {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(t: number): void;
  isPlaying(): boolean;
}

/**
 * Podgląd timeline w czasie rzeczywistym: elementy <video> (proxy) przełączane wg pozycji,
 * kadrowanie 9:16 identyczne z renderem, napisy, logo, rozmycia, muzyka.
 */
export const Preview = forwardRef<PreviewHandle, {
  doc: TimelineDoc;
  assets: Record<string, EditorAsset>;
  time: number;
  onTime: (t: number) => void;
  onPlayingChange?: (p: boolean) => void;
  showSafe: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveText: (id: string, x: number, y: number, commit: boolean) => void;
}>(function Preview({ doc, assets, time, onTime, onPlayingChange, showSafe, selectedId, onSelect, onMoveText }, ref) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const audios = useRef<Record<string, HTMLAudioElement | null>>({});
  const [W, setW] = useState(360);
  const [playing, setPlaying] = useState(false);
  const clock = useRef({ t: time, last: 0, raf: 0 });
  const total = totalDuration(doc);
  const H = (W * doc.settings.height) / doc.settings.width;
  const scale = W / 1080;
  const usedVideoAssets = useMemo(() => [...new Set(doc.video.map((v) => v.assetId))], [doc.video]);

  useEffect(() => {
    const el = boxRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setW(Math.max(160, Math.min(r.width, (r.height * 9) / 16)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // synchronizacja mediów z zegarem
  const sync = (t: number, isPlaying: boolean) => {
    const hit = locate(doc, t);
    for (const [aid, el] of Object.entries(videos.current)) {
      if (!el) continue;
      const active = hit && hit.item.assetId === aid;
      if (!active) {
        if (!el.paused) el.pause();
        el.style.visibility = "hidden";
        continue;
      }
      const it = hit.item;
      el.style.visibility = "visible";
      const a = assets[aid];
      const sw = a?.width ?? 1080;
      const sh = a?.height ?? 1920;
      const s = Math.max(W / sw, H / sh) * it.crop.zoom;
      const dw = sw * s;
      const dh = sh * s;
      el.style.width = `${dw}px`;
      el.style.height = `${dh}px`;
      el.style.left = `${-(dw - W) * it.crop.x}px`;
      el.style.top = `${-(dh - H) * it.crop.y}px`;
      // wejście przejścia / fade — przybliżenie przez krycie
      const e = hit.entry;
      const local = t - e.start;
      let op = 1;
      if (e.transition > 0 && local < e.transition) op = local / e.transition;
      if (it.fadeIn > 0 && local < it.fadeIn) op = Math.min(op, local / it.fadeIn);
      if (it.fadeOut > 0 && e.end - t < it.fadeOut) op = Math.min(op, (e.end - t) / it.fadeOut);
      el.style.opacity = String(clamp(op, 0, 1));
      el.playbackRate = it.speed;
      el.muted = doc.settings.muteOriginal || it.volume === 0;
      el.volume = clamp(it.volume, 0, 1);
      if (Math.abs(el.currentTime - hit.sourceTime) > (isPlaying ? 0.3 : 0.04)) el.currentTime = hit.sourceTime;
      if (isPlaying && el.paused) void el.play().catch(() => undefined);
      if (!isPlaying && !el.paused) el.pause();
    }
    for (const m of doc.audio) {
      const el = audios.current[m.id];
      if (!el) continue;
      const local = t - m.start;
      const len = m.sourceOut - m.sourceIn;
      const inRange = local >= 0 && local < len && t < total;
      if (!inRange) {
        if (!el.paused) el.pause();
        continue;
      }
      let vol = m.volume;
      if (m.fadeIn > 0 && local < m.fadeIn) vol *= local / m.fadeIn;
      if (m.fadeOut > 0 && Math.min(len, total - m.start) - local < m.fadeOut) vol *= Math.max(0, (Math.min(len, total - m.start) - local) / m.fadeOut);
      el.volume = clamp(vol, 0, 1);
      const target = m.sourceIn + local;
      if (Math.abs(el.currentTime - target) > (isPlaying ? 0.3 : 0.05)) el.currentTime = target;
      if (isPlaying && el.paused) void el.play().catch(() => undefined);
      if (!isPlaying && !el.paused) el.pause();
    }
  };

  const stop = () => {
    cancelAnimationFrame(clock.current.raf);
    setPlaying(false);
    onPlayingChange?.(false);
    sync(clock.current.t, false);
  };
  const start = () => {
    if (clock.current.t >= total - 0.05) clock.current.t = 0;
    setPlaying(true);
    onPlayingChange?.(true);
    clock.current.last = performance.now();
    const loop = (now: number) => {
      const dt = (now - clock.current.last) / 1000;
      clock.current.last = now;
      clock.current.t = Math.min(total, clock.current.t + dt);
      onTime(clock.current.t);
      sync(clock.current.t, true);
      if (clock.current.t >= total) return stop();
      clock.current.raf = requestAnimationFrame(loop);
    };
    clock.current.raf = requestAnimationFrame(loop);
  };

  useImperativeHandle(ref, () => ({
    play: start,
    pause: stop,
    toggle: () => (playing ? stop() : start()),
    seek: (t: number) => {
      clock.current.t = clamp(t, 0, total);
      onTime(clock.current.t);
      sync(clock.current.t, playing);
    },
    isPlaying: () => playing,
  }));

  // zewnętrzna zmiana czasu (scrub) lub dokumentu
  useEffect(() => {
    if (!playing) {
      clock.current.t = time;
      sync(time, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, doc, W, playing]);
  useEffect(() => () => cancelAnimationFrame(clock.current.raf), []);

  const safe = PLATFORMS[doc.settings.platform].safe;
  const texts = doc.texts.filter((t) => time >= t.start && time < t.end);
  const logos = doc.logos.filter((l) => time >= l.start && time < l.end);
  const blurs = doc.blurs.filter((b) => time >= b.start && time < b.end);
  const empty = !doc.video.length;

  const dragText = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(id);
    const box = boxRef.current!.getBoundingClientRect();
    const move = (ev: PointerEvent, commit: boolean) => onMoveText(id, clamp((ev.clientX - box.left) / box.width, 0.05, 0.95), clamp((ev.clientY - box.top) / box.height, 0.05, 0.95), commit);
    const mm = (ev: PointerEvent) => move(ev, false);
    const up = (ev: PointerEvent) => {
      move(ev, true);
      window.removeEventListener("pointermove", mm);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mm);
    window.addEventListener("pointerup", up);
  };

  return (
    <div ref={boxRef} className="relative mx-auto overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-border" style={{ width: W, height: H }} onPointerDown={() => onSelect(null)}>
      {usedVideoAssets.map((aid) => (
        <video key={aid} ref={(el) => { videos.current[aid] = el; }} src={`/api/media/${aid}?v=proxy`} preload="auto" playsInline muted className="pointer-events-none absolute max-w-none" style={{ visibility: "hidden" }} />
      ))}
      {doc.audio.map((m) => (
        <audio key={m.id} ref={(el) => { audios.current[m.id] = el; }} src={`/api/media/${m.assetId}?v=${assets[m.assetId]?.kind === "VIDEO" ? "proxy" : "original"}`} preload="auto" />
      ))}
      {blurs.map((b) => (
        <div key={b.id} className="pointer-events-none absolute border border-dashed border-white/30" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, backdropFilter: `blur(${b.strength * scale}px)` }} />
      ))}
      {logos.map((l) => (
        <img key={l.id} src={`/api/media/${l.assetId}?v=proxy`} alt="Logo" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${l.position.x * 100}%`, top: `${l.position.y * 100}%`, width: `${l.width * 100}%`, opacity: l.opacity }} />
      ))}
      {texts.map((t) => (
        <CaptionOverlay key={t.id} t={t} time={time} scale={scale} selected={selectedId === t.id} forceVisible={!playing && selectedId === t.id} onPointerDown={dragText(t.id)} />
      ))}
      {showSafe && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 bg-bad/20" style={{ height: safe.top * scale }} />
          <div className="absolute inset-x-0 bottom-0 bg-bad/20" style={{ height: safe.bottom * scale }} />
          <div className="absolute right-0 bg-bad/15" style={{ top: safe.top * scale, bottom: safe.bottom * scale, width: safe.right * scale }} />
          <div className="absolute border border-dashed border-white/40" style={{ top: safe.top * scale, bottom: safe.bottom * scale, left: safe.left * scale, right: safe.right * scale }} />
          <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">Strefy interfejsu: {PLATFORMS[doc.settings.platform].label}</span>
        </div>
      )}
      {empty && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/50">Dodaj klipy z biblioteki mediów, aby zobaczyć podgląd</div>}
    </div>
  );
});

export function useTotal(doc: TimelineDoc) {
  return useMemo(() => layoutVideo(doc).total, [doc]);
}
