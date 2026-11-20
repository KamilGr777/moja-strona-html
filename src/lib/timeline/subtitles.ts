import { CHAR_WIDTH, assFontName } from "./presets";
import type { CaptionStyle, TextItem, TimelineDoc } from "./types";
import { PLATFORMS } from "../constants";

const REF_W = 1080;
const REF_H = 1920;

/** Łamie tekst na linie w oparciu o przybliżoną szerokość znaków (wspólne dla podglądu i renderu). */
export function wrapCaption(text: string, style: Pick<CaptionStyle, "fontFamily" | "fontSize" | "letterSpacing" | "uppercase">, maxWidthPx = 860): string[] {
  const t = style.uppercase ? text.toLocaleUpperCase("pl-PL") : text;
  const charW = style.fontSize * (CHAR_WIDTH[style.fontFamily] ?? 0.6) + style.letterSpacing;
  const maxChars = Math.max(6, Math.floor(maxWidthPx / charW));
  const lines: string[] = [];
  for (const para of t.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if ((line + " " + word).length <= maxChars) line += " " + word;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [t];
}

/** Szacowany prostokąt tekstu w px (1080×1920) — do sprawdzania bezpiecznych stref. */
export function captionBox(t: TextItem): { x: number; y: number; w: number; h: number; lines: string[] } {
  const lines = wrapCaption(t.text, t.style);
  const charW = t.style.fontSize * (CHAR_WIDTH[t.style.fontFamily] ?? 0.6) + t.style.letterSpacing;
  const w = Math.max(...lines.map((l) => l.length)) * charW + (t.style.background === "box" ? 36 : 0);
  const h = lines.length * t.style.fontSize * 1.25 + (t.style.background === "box" ? 24 : 0);
  return { x: t.position.x * REF_W - w / 2, y: t.position.y * REF_H - h / 2, w, h, lines };
}

export function isInSafeZone(t: TextItem, platform: keyof typeof PLATFORMS): boolean {
  const s = PLATFORMS[platform].safe;
  const b = captionBox(t);
  return b.x >= s.left - 4 && b.x + b.w <= REF_W - s.right + 4 && b.y >= s.top - 4 && b.y + b.h <= REF_H - s.bottom + 4;
}

// ───────────────────────── SRT ─────────────────────────

function srtTime(sec: number) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`;
}

export function toSrt(texts: TextItem[]): string {
  return [...texts]
    .sort((a, b) => a.start - b.start)
    .map((t, i) => `${i + 1}\n${srtTime(t.start)} --> ${srtTime(t.end)}\n${wrapCaption(t.text, { ...t.style, uppercase: false }).join("\n")}\n`)
    .join("\n");
}

// ───────────────────────── ASS (libass) ─────────────────────────

/** #RRGGBB + krycie → &HAABBGGRR */
export function assColor(hex: string, opacity = 1): string {
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  const a = Math.round((1 - opacity) * 255).toString(16).padStart(2, "0");
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

function assTime(sec: number) {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

function escapeAss(s: string) {
  return s.replace(/\\/g, "∖").replace(/\{/g, "(").replace(/\}/g, ")");
}

function styleLine(name: string, st: CaptionStyle) {
  const f = assFontName(st.fontFamily, st.fontWeight);
  const box = st.background === "box";
  const primary = assColor(st.color);
  const secondary = assColor(st.highlightColor);
  const outline = box ? assColor(st.boxColor, st.boxOpacity) : assColor(st.outlineColor);
  const back = assColor("#000000", box ? 0 : 0.55);
  const borderStyle = box ? 3 : 1;
  const outlineW = box ? 14 : st.outlineWidth;
  return `Style: ${name},${f.name},${Math.round(st.fontSize)},${primary},${secondary},${outline},${back},${f.bold ? -1 : 0},0,0,0,100,100,${st.letterSpacing},0,${borderStyle},${outlineW},${st.shadow},5,0,0,0,1`;
}

/** Generuje zdarzenia ASS dla jednego napisu (z animacją). */
export function textEvents(t: TextItem, styleName: string): string[] {
  const x = Math.round(t.position.x * REF_W);
  const y = Math.round(t.position.y * REF_H);
  const lines = wrapCaption(t.text, t.style);
  const body = lines.map(escapeAss).join("\\N");
  const durMs = Math.max(1, Math.round((t.end - t.start) * 1000));
  const fadeOut = Math.min(200, Math.round(durMs / 4));
  const ev = (start: number, end: number, text: string) => `Dialogue: 0,${assTime(start)},${assTime(end)},${styleName},,0,0,0,,${text}`;
  const hl = t.style.highlightColor;
  const base = t.style.color;

  switch (t.animation) {
    case "none":
      return [ev(t.start, t.end, `{\\an5\\pos(${x},${y})}${body}`)];
    case "fade":
      return [ev(t.start, t.end, `{\\an5\\pos(${x},${y})\\fad(220,${fadeOut})}${body}`)];
    case "pop":
      return [ev(t.start, t.end, `{\\an5\\pos(${x},${y})\\fad(60,${fadeOut})\\fscx70\\fscy70\\t(0,170,\\fscx106\\fscy106)\\t(170,260,\\fscx100\\fscy100)}${body}`)];
    case "slide-up":
      return [ev(t.start, t.end, `{\\an5\\move(${x},${y + 70},${x},${y},0,280)\\fad(160,${fadeOut})}${body}`)];
    case "typewriter":
    case "highlight": {
      // Słowa z czasami (transkrypcja) lub równomierny podział czasu.
      const tokens = body.split(/(\s+|\\N)/).filter((s) => s.length);
      const words = tokens.filter((s) => !/^\s+$/.test(s) && s !== "\\N");
      const timed =
        t.words && t.words.length === words.length
          ? t.words.map((w) => ({ start: w.start, end: w.end }))
          : words.map((_, i) => {
              const d = (t.end - t.start) / Math.max(1, words.length);
              return { start: t.start + i * d, end: t.start + (i + 1) * d };
            });
      const out: string[] = [];
      // tekst przed pierwszym słowem
      if (timed.length && timed[0].start > t.start + 0.02) {
        out.push(ev(t.start, timed[0].start, `{\\an5\\pos(${x},${y})}` + (t.animation === "typewriter" ? `{\\alpha&HFF&}${body}` : body)));
      }
      timed.forEach((w, wi) => {
        const end = wi === timed.length - 1 ? t.end : timed[wi + 1].start;
        let k = -1;
        const rendered = tokens
          .map((tok) => {
            if (/^\s+$/.test(tok) || tok === "\\N") return tok;
            k++;
            if (t.animation === "typewriter") return k <= wi ? `{\\alpha&H00&}${tok}` : `{\\alpha&HFF&}${tok}`;
            return k === wi ? `{\\c${assColor(hl).slice(0, 2)}${assColor(hl).slice(4)}&}${tok}{\\c${assColor(base).slice(0, 2)}${assColor(base).slice(4)}&}` : tok;
          })
          .join("");
        out.push(ev(Math.max(t.start, w.start), Math.max(end, w.start + 0.05), `{\\an5\\pos(${x},${y})}${rendered}`));
      });
      return out.length ? out : [ev(t.start, t.end, `{\\an5\\pos(${x},${y})}${body}`)];
    }
  }
}

export function toAss(doc: Pick<TimelineDoc, "texts">): string {
  const styles: string[] = [];
  const events: string[] = [];
  const sorted = [...doc.texts].sort((a, b) => a.start - b.start);
  sorted.forEach((t, i) => {
    const name = `S${i}`;
    styles.push(styleLine(name, t.style));
    events.push(...textEvents(t, name));
  });
  return [
    "[Script Info]",
    "; Wygenerowano przez DETAIL REEL AI",
    "ScriptType: v4.00+",
    `PlayResX: ${REF_W}`,
    `PlayResY: ${REF_H}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ...styles,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}
