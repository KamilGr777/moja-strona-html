"use client";
import type { CSSProperties } from "react";
import { wrapCaption } from "@/lib/timeline/subtitles";
import type { TextItem } from "@/lib/timeline/types";
import { clamp } from "@/lib/utils";

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Napis w podglądzie — te same fonty, łamanie linii i (w przybliżeniu) animacje co w renderze libass. */
export function CaptionOverlay({ t, time, scale, selected, onPointerDown, forceVisible }: { t: TextItem; time: number; scale: number; selected?: boolean; onPointerDown?: (e: React.PointerEvent) => void; forceVisible?: boolean }) {
  const local = time - t.start;
  const dur = t.end - t.start;
  const st = t.style;
  const lines = wrapCaption(t.text, st);
  const outW = st.outlineWidth * scale;
  const fadeOut = Math.min(0.2, dur / 4);
  let opacity = 1;
  let transform = "translate(-50%, -50%)";
  if (t.animation === "fade") opacity = clamp(local / 0.22, 0, 1) * clamp((dur - local) / fadeOut, 0, 1);
  if (t.animation === "pop") {
    const p = local;
    const s = p < 0.17 ? 0.7 + (1.06 - 0.7) * (p / 0.17) : p < 0.26 ? 1.06 - 0.06 * ((p - 0.17) / 0.09) : 1;
    transform += ` scale(${s})`;
    opacity = clamp(local / 0.06, 0, 1) * clamp((dur - local) / fadeOut, 0, 1);
  }
  if (t.animation === "slide-up") {
    const p = clamp(local / 0.28, 0, 1);
    transform = `translate(-50%, calc(-50% + ${(1 - p) * 70 * scale}px))`;
    opacity = clamp(local / 0.16, 0, 1) * clamp((dur - local) / fadeOut, 0, 1);
  }
  // słowa: podświetlanie (mowa) i maszyna do pisania
  const words = lines.join(" \n ").split(" ");
  const flat = words.filter((w) => w !== "\n");
  let activeIdx = -1;
  if (t.animation === "highlight" || t.animation === "typewriter") {
    if (t.words && t.words.length === flat.length) activeIdx = t.words.findIndex((w, i) => time >= w.start && (i === t.words!.length - 1 || time < t.words![i + 1].start));
    else activeIdx = Math.min(flat.length - 1, Math.floor((local / Math.max(0.01, dur)) * flat.length));
  }
  // podczas edycji zaznaczony napis jest zawsze widoczny (w renderze animacja działa normalnie)
  if (forceVisible) {
    opacity = 1;
    transform = "translate(-50%, -50%)";
  }
  const style: CSSProperties = {
    left: `${t.position.x * 100}%`,
    top: `${t.position.y * 100}%`,
    transform,
    opacity,
    fontFamily: `"${st.fontFamily}"`,
    fontWeight: st.fontWeight,
    fontSize: st.fontSize * scale,
    lineHeight: 1.18,
    letterSpacing: st.letterSpacing * scale,
    color: st.color,
    textTransform: st.uppercase ? "uppercase" : "none",
    textAlign: "center",
    whiteSpace: "pre",
    WebkitTextStroke: outW > 0 ? `${outW * 2}px ${st.outlineColor}` : undefined,
    paintOrder: "stroke fill",
    textShadow: st.shadow > 0 ? `${st.shadow * scale}px ${st.shadow * scale}px ${st.shadow * 1.5 * scale}px rgba(0,0,0,0.55)` : undefined,
    background: st.background === "box" ? hexA(st.boxColor, st.boxOpacity) : undefined,
    padding: st.background === "box" ? `${10 * scale}px ${18 * scale}px` : undefined,
    borderRadius: st.background === "box" ? 6 * scale : undefined,
  };
  let k = -1;
  return (
    <div className={`absolute ${onPointerDown ? "cursor-move" : ""} ${selected ? "outline outline-1 outline-offset-4 outline-primary" : ""}`} style={style} onPointerDown={onPointerDown}>
      {words.map((w, i) => {
        if (w === "\n") return <br key={i} />;
        k++;
        const idx = k;
        const sep = i < words.length - 1 && words[i + 1] !== "\n" ? " " : "";
        if (t.animation === "highlight") return <span key={i} style={idx === activeIdx ? { color: st.highlightColor } : undefined}>{w}{sep}</span>;
        if (t.animation === "typewriter") return <span key={i} style={{ opacity: idx <= activeIdx ? 1 : 0 }}>{w}{sep}</span>;
        return <span key={i}>{w}{sep}</span>;
      })}
    </div>
  );
}
