"use client";
import { Scissors, Copy, Trash2, Wand2, Music2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SwitchRow } from "@/components/ui/switch";
import { Badge } from "@/components/ui/misc";
import { CAPTION_PRESETS } from "@/lib/timeline/presets";
import { FONT_FAMILIES, TEXT_ANIMATIONS, type AssetMap, type TimelineDoc, type TextItem, type VideoItem } from "@/lib/timeline/types";
import { clipDuration, duplicateItem, fitToDuration, layoutVideo, removeItem, snapCutsToBeats, splitAt, trimItem, updateAudio, updateText, updateVideoItem, clampToDuration } from "@/lib/timeline/ops";
import { isInSafeZone } from "@/lib/timeline/subtitles";
import { PLATFORM_OPTIONS } from "@/components/common/option-lists";
import { round } from "@/lib/utils";
import type { EditorAsset } from "./state";

type Apply = (fn: (d: TimelineDoc) => TimelineDoc, transient?: boolean) => void;

const WEIGHTS: Record<string, number[]> = { Poppins: [500, 600, 800], Montserrat: [600, 700, 800], Anton: [400], "Bebas Neue": [400], Cinzel: [400], "Playfair Display": [400] };
const ANIM_LABELS: Record<string, string> = { none: "Brak", fade: "Pojawienie", pop: "Pop (skala)", "slide-up": "Wjazd z dołu", typewriter: "Maszyna do pisania", highlight: "Podświetlanie słów" };

function Num({ label, value, onChange, step = 0.05, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <Input type="number" step={step} min={min} max={max} value={round(value, 3)} onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))} className="pr-8 tabular" />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-2 text-xs text-subtle">{suffix}</span>}
      </div>
    </Field>
  );
}

function SliderField({ label, value, onChange, onCommit, min, max, step, format }: { label: string; value: number; onChange: (v: number) => void; onCommit: () => void; min: number; max: number; step: number; format?: (v: number) => string }) {
  return (
    <div onPointerUp={onCommit} onKeyUp={onCommit}>
      <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">{label}</span><span className="tabular text-fg">{format ? format(value) : value}</span></div>
      <Slider value={value} onChange={onChange} min={min} max={max} step={step} />
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
      {label}
      <span className="flex items-center gap-2"><span className="tabular text-fg">{value.toUpperCase()}</span><input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" /></span>
    </label>
  );
}

export function Inspector({ doc, selectedId, assets, apply, commit, time, onSelect }: { doc: TimelineDoc; selectedId: string | null; assets: Record<string, EditorAsset>; apply: Apply; commit: () => void; time: number; onSelect: (id: string | null) => void }) {
  const assetMap: AssetMap = Object.fromEntries(Object.values(assets).map((a) => [a.id, { id: a.id, durationSec: a.durationSec, hasAudio: a.hasAudio, width: a.width, height: a.height, kind: a.kind }]));
  const v = doc.video.find((x) => x.id === selectedId);
  const t = doc.texts.find((x) => x.id === selectedId);
  const m = doc.audio.find((x) => x.id === selectedId);
  const l = doc.logos.find((x) => x.id === selectedId);
  const b = doc.blurs.find((x) => x.id === selectedId);
  const total = layoutVideo(doc).total;

  const head = (title: string, extra?: React.ReactNode) => (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex gap-1">
        {extra}
        <Button size="icon-sm" variant="ghost" title="Usuń (Delete)" onClick={() => { apply((d) => clampToDuration(removeItem(d, selectedId!))); onSelect(null); }}><Trash2 /></Button>
      </div>
    </div>
  );

  if (v) {
    const a = assets[v.assetId];
    const up = (p: Partial<VideoItem>, transient = false) => apply((d) => updateVideoItem(d, v.id, p), transient);
    return (
      <div className="space-y-4">
        {head("Klip wideo", <>
          <Button size="icon-sm" variant="ghost" title="Podziel w miejscu głowicy (S)" onClick={() => apply((d) => splitAt(d, time))}><Scissors /></Button>
          <Button size="icon-sm" variant="ghost" title="Duplikuj (Ctrl+D)" onClick={() => apply((d) => duplicateItem(d, v.id))}><Copy /></Button>
        </>)}
        <p className="truncate text-xs text-muted">{v.label ?? a?.name} · długość w montażu <span className="text-fg">{clipDuration(v).toFixed(2).replace(".", ",")} s</span></p>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Początek (źródło)" value={v.sourceIn} suffix="s" onChange={(x) => apply((d) => trimItem(d, v.id, { sourceIn: x }, assetMap))} />
          <Num label="Koniec (źródło)" value={v.sourceOut} suffix="s" onChange={(x) => apply((d) => trimItem(d, v.id, { sourceOut: x }, assetMap))} />
        </div>
        <Field label="Prędkość odtwarzania">
          <Select value={String(v.speed)} onValueChange={(x) => apply((d) => clampToDuration(updateVideoItem(d, v.id, { speed: Number(x) })))} options={[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((s) => ({ value: String(s), label: `${s}×${s < 1 ? " (zwolnienie)" : s > 1 ? " (przyspieszenie)" : ""}` }))} />
        </Field>
        <SliderField label="Głośność oryginału" value={v.volume} onChange={(x) => up({ volume: x }, true)} onCommit={commit} min={0} max={2} step={0.05} format={(x) => `${Math.round(x * 100)}%`} />
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="Fade in" value={v.fadeIn} onChange={(x) => up({ fadeIn: x }, true)} onCommit={commit} min={0} max={2} step={0.05} format={(x) => `${x.toFixed(2)} s`} />
          <SliderField label="Fade out" value={v.fadeOut} onChange={(x) => up({ fadeOut: x }, true)} onCommit={commit} min={0} max={2} step={0.05} format={(x) => `${x.toFixed(2)} s`} />
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="mb-3 text-xs font-semibold text-muted">Kadrowanie pionowe 9:16</p>
          <div className="space-y-3">
            <SliderField label="Poziomo" value={v.crop.x} onChange={(x) => up({ crop: { ...v.crop, x } }, true)} onCommit={commit} min={0} max={1} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
            <SliderField label="Pionowo" value={v.crop.y} onChange={(x) => up({ crop: { ...v.crop, y: x } }, true)} onCommit={commit} min={0} max={1} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
            <SliderField label="Powiększenie" value={v.crop.zoom} onChange={(x) => up({ crop: { ...v.crop, zoom: x } }, true)} onCommit={commit} min={1} max={3} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
          </div>
        </div>
        {doc.video.indexOf(v) > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Przejście wejściowe">
              <Select value={v.transition.type} onValueChange={(x) => up({ transition: { type: x as VideoItem["transition"]["type"], duration: x === "cut" ? 0 : Math.max(0.3, v.transition.duration) } })} options={[{ value: "cut", label: "Cięcie" }, { value: "fade", label: "Przenikanie" }, { value: "fadeblack", label: "Przez czerń" }]} />
            </Field>
            {v.transition.type !== "cut" && <SliderField label="Czas przejścia" value={v.transition.duration} onChange={(x) => up({ transition: { ...v.transition, duration: x } }, true)} onCommit={commit} min={0.1} max={1.2} step={0.05} format={(x) => `${x.toFixed(2)} s`} />}
          </div>
        )}
        {v.note && <p className="rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 text-xs text-[#a9c4ff]">{v.note}</p>}
      </div>
    );
  }

  if (t) {
    const up = (p: Partial<TextItem>, transient = false) => apply((d) => updateText(d, t.id, p), transient);
    const st = t.style;
    const safe = isInSafeZone(t, doc.settings.platform);
    return (
      <div className="space-y-4">
        {head("Napis", <Button size="icon-sm" variant="ghost" title="Duplikuj" onClick={() => apply((d) => duplicateItem(d, t.id))}><Copy /></Button>)}
        <Field label="Tekst"><Textarea value={t.text} onChange={(e) => e.target.value.trim() && up({ text: e.target.value })} rows={3} maxLength={300} /></Field>
        {!safe && <Badge tone="warn">Napis wychodzi poza bezpieczną strefę platformy</Badge>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rodzaj">
            <Select value={t.kind} onValueChange={(x) => up({ kind: x as TextItem["kind"] })} options={[{ value: "caption", label: "Napis" }, { value: "title", label: "Tytuł / hook" }, { value: "cta", label: "CTA" }, { value: "transcript", label: "Transkrypcja" }]} />
          </Field>
          <Field label="Animacja">
            <Select value={t.animation} onValueChange={(x) => up({ animation: x as TextItem["animation"] })} options={TEXT_ANIMATIONS.map((a) => ({ value: a, label: ANIM_LABELS[a] }))} />
          </Field>
          <Num label="Start" value={t.start} suffix="s" min={0} onChange={(x) => up({ start: Math.max(0, x), end: Math.max(t.end, x + 0.3) })} />
          <Num label="Koniec" value={t.end} suffix="s" min={0} onChange={(x) => up({ end: Math.max(t.start + 0.2, x) })} />
        </div>
        <Field label="Styl (preset)">
          <Select value={st.preset} onValueChange={(x) => { const p = CAPTION_PRESETS[x as keyof typeof CAPTION_PRESETS]; up({ style: { ...p.style }, animation: t.kind === "transcript" ? t.animation : p.animation }); }} options={Object.entries(CAPTION_PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Czcionka">
            <Select value={st.fontFamily} onValueChange={(x) => up({ style: { ...st, fontFamily: x as TextItem["style"]["fontFamily"], fontWeight: WEIGHTS[x][Math.min(WEIGHTS[x].length - 1, 1)] } })} options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))} />
          </Field>
          <Field label="Grubość">
            <Select value={String(st.fontWeight)} onValueChange={(x) => up({ style: { ...st, fontWeight: Number(x) } })} options={(WEIGHTS[st.fontFamily] ?? [400]).map((w) => ({ value: String(w), label: String(w) }))} />
          </Field>
        </div>
        <SliderField label="Wielkość" value={st.fontSize} onChange={(x) => up({ style: { ...st, fontSize: Math.round(x) } }, true)} onCommit={commit} min={24} max={160} step={1} format={(x) => `${Math.round(x)} px`} />
        <div className="grid gap-2">
          <Color label="Kolor tekstu" value={st.color} onChange={(c) => up({ style: { ...st, color: c } })} />
          <Color label="Kolor podświetlenia" value={st.highlightColor} onChange={(c) => up({ style: { ...st, highlightColor: c } })} />
          <Color label="Obramowanie" value={st.outlineColor} onChange={(c) => up({ style: { ...st, outlineColor: c } })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="Grubość obramowania" value={st.outlineWidth} onChange={(x) => up({ style: { ...st, outlineWidth: x } }, true)} onCommit={commit} min={0} max={10} step={0.5} />
          <SliderField label="Cień" value={st.shadow} onChange={(x) => up({ style: { ...st, shadow: x } }, true)} onCommit={commit} min={0} max={8} step={0.5} />
        </div>
        <Field label="Tło">
          <Select value={st.background} onValueChange={(x) => up({ style: { ...st, background: x as "none" | "box" } })} options={[{ value: "none", label: "Brak" }, { value: "box", label: "Prostokąt" }]} />
        </Field>
        {st.background === "box" && (
          <div className="grid gap-2">
            <Color label="Kolor tła" value={st.boxColor} onChange={(c) => up({ style: { ...st, boxColor: c } })} />
            <SliderField label="Krycie tła" value={st.boxOpacity} onChange={(x) => up({ style: { ...st, boxOpacity: x } }, true)} onCommit={commit} min={0} max={1} step={0.05} format={(x) => `${Math.round(x * 100)}%`} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="Odstęp liter" value={st.letterSpacing} onChange={(x) => up({ style: { ...st, letterSpacing: x } }, true)} onCommit={commit} min={0} max={16} step={0.5} />
          <SwitchRow label="WERSALIKI" checked={st.uppercase} onCheckedChange={(c) => up({ style: { ...st, uppercase: c } })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="Pozycja X" value={t.position.x} onChange={(x) => up({ position: { ...t.position, x } }, true)} onCommit={commit} min={0.05} max={0.95} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Pozycja Y" value={t.position.y} onChange={(x) => up({ position: { ...t.position, y: x } }, true)} onCommit={commit} min={0.05} max={0.95} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
        </div>
        <p className="text-[11px] text-subtle">Napis możesz też przeciągnąć bezpośrednio w podglądzie.</p>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => apply((d) => ({ ...d, texts: d.texts.map((x) => (x.kind === "transcript" && t.kind !== "transcript" ? x : { ...x, style: { ...t.style }, animation: x.kind === "transcript" ? x.animation : t.animation })) }))}>Zastosuj ten styl do wszystkich napisów</Button>
      </div>
    );
  }

  if (m) {
    const a = assets[m.assetId];
    const up = (p: Parameters<typeof updateAudio>[2], transient = false) => apply((d) => updateAudio(d, m.id, p), transient);
    return (
      <div className="space-y-4">
        {head("Muzyka / audio")}
        <p className="truncate text-xs text-muted"><Music2 className="mr-1 inline size-3.5" />{a?.name}{a?.bpm ? ` · ${a.bpm} BPM` : ""}</p>
        {a?.license && <p className="text-[11px] text-subtle">Licencja: {a.license}</p>}
        <SliderField label="Głośność" value={m.volume} onChange={(x) => up({ volume: x }, true)} onCommit={commit} min={0} max={2} step={0.05} format={(x) => `${Math.round(x * 100)}%`} />
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="Fade in" value={m.fadeIn} onChange={(x) => up({ fadeIn: x }, true)} onCommit={commit} min={0} max={5} step={0.1} format={(x) => `${x.toFixed(1)} s`} />
          <SliderField label="Fade out" value={m.fadeOut} onChange={(x) => up({ fadeOut: x }, true)} onCommit={commit} min={0} max={5} step={0.1} format={(x) => `${x.toFixed(1)} s`} />
          <Num label="Start na osi" value={m.start} suffix="s" min={0} onChange={(x) => up({ start: Math.max(0, x) })} />
          <Num label="Początek utworu" value={m.sourceIn} suffix="s" min={0} onChange={(x) => up({ sourceIn: Math.max(0, Math.min(x, m.sourceOut - 0.5)) })} />
        </div>
        {a?.beats?.length ? (
          <Button size="sm" variant="secondary" className="w-full" onClick={() => apply((d) => snapCutsToBeats(d, a.beats, assetMap))}><Wand2 /> Dopasuj cięcia do beatów ({a.bpm} BPM)</Button>
        ) : (
          <p className="text-xs text-subtle">W tym utworze nie wykryto wyraźnego rytmu — dopasowanie do beatów niedostępne.</p>
        )}
      </div>
    );
  }

  if (l) {
    const up = (p: Partial<typeof l>, transient = false) => apply((d) => ({ ...d, logos: d.logos.map((x) => (x.id === l.id ? { ...x, ...p } : x)) }), transient);
    return (
      <div className="space-y-4">
        {head("Logo klienta")}
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="Pozycja X" value={l.position.x} onChange={(x) => up({ position: { ...l.position, x } }, true)} onCommit={commit} min={0} max={1} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Pozycja Y" value={l.position.y} onChange={(x) => up({ position: { ...l.position, y: x } }, true)} onCommit={commit} min={0} max={1} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Szerokość" value={l.width} onChange={(x) => up({ width: x }, true)} onCommit={commit} min={0.08} max={0.8} step={0.01} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Krycie" value={l.opacity} onChange={(x) => up({ opacity: x }, true)} onCommit={commit} min={0} max={1} step={0.05} format={(x) => `${Math.round(x * 100)}%`} />
          <Num label="Od" value={l.start} suffix="s" onChange={(x) => up({ start: Math.max(0, x) })} />
          <Num label="Do" value={l.end} suffix="s" onChange={(x) => up({ end: Math.max(l.start + 0.3, x) })} />
        </div>
      </div>
    );
  }

  if (b) {
    const up = (p: Partial<typeof b>, transient = false) => apply((d) => ({ ...d, blurs: d.blurs.map((x) => (x.id === b.id ? { ...x, ...p } : x)) }), transient);
    return (
      <div className="space-y-4">
        {head("Rozmycie obszaru")}
        <p className="text-xs text-muted">Zasłania np. tablicę rejestracyjną lub twarz w wybranym czasie (RODO). Ustaw prostokąt na podglądzie suwakami.</p>
        <Field label="Opis"><Input value={b.label ?? ""} onChange={(e) => up({ label: e.target.value.slice(0, 60) })} placeholder="np. tablica rejestracyjna" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="X" value={b.x} onChange={(x) => up({ x: Math.min(x, 1 - b.w) }, true)} onCommit={commit} min={0} max={1} step={0.005} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Y" value={b.y} onChange={(x) => up({ y: Math.min(x, 1 - b.h) }, true)} onCommit={commit} min={0} max={1} step={0.005} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Szerokość" value={b.w} onChange={(x) => up({ w: Math.min(x, 1 - b.x) }, true)} onCommit={commit} min={0.02} max={1} step={0.005} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Wysokość" value={b.h} onChange={(x) => up({ h: Math.min(x, 1 - b.y) }, true)} onCommit={commit} min={0.02} max={1} step={0.005} format={(x) => `${Math.round(x * 100)}%`} />
          <SliderField label="Siła" value={b.strength} onChange={(x) => up({ strength: x }, true)} onCommit={commit} min={4} max={40} step={1} />
          <div />
          <Num label="Od" value={b.start} suffix="s" onChange={(x) => up({ start: Math.max(0, x) })} />
          <Num label="Do" value={b.end} suffix="s" onChange={(x) => up({ end: Math.max(b.start + 0.2, x) })} />
        </div>
      </div>
    );
  }

  // Ustawienia projektu
  const s = doc.settings;
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Settings2 className="size-4 text-subtle" /> Ustawienia projektu</h3>
      <p className="text-xs text-muted">Długość: <span className="tabular text-fg">{total.toFixed(2).replace(".", ",")} s</span> · {doc.video.length} klipów · {doc.texts.length} napisów</p>
      <Field label="Platforma docelowa">
        <Select value={s.platform} onValueChange={(x) => apply((d) => ({ ...d, settings: { ...d.settings, platform: x as typeof s.platform } }))} options={PLATFORM_OPTIONS} />
      </Field>
      <Field label="Klatki na sekundę">
        <Select value={String(s.fps)} onValueChange={(x) => apply((d) => ({ ...d, settings: { ...d.settings, fps: Number(x) } }))} options={[24, 25, 30, 50, 60].map((f) => ({ value: String(f), label: `${f} kl./s` }))} />
      </Field>
      <SwitchRow label="Wycisz oryginalne audio" hint="Dźwięk z klipów zostanie wyciszony" checked={s.muteOriginal} onCheckedChange={(c) => apply((d) => ({ ...d, settings: { ...d.settings, muteOriginal: c } }))} />
      <SwitchRow label="Ducking muzyki" hint="Ścisza muzykę, gdy w klipie ktoś mówi" checked={s.ducking} onCheckedChange={(c) => apply((d) => ({ ...d, settings: { ...d.settings, ducking: c } }))} />
      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-xs font-semibold text-muted">Dopasuj długość rolki</p>
        <div className="flex gap-2">
          {[10, 15, 20, 30].map((sec) => (
            <Button key={sec} size="sm" variant="secondary" onClick={() => apply((d) => clampToDuration(fitToDuration(d, sec, assetMap, { protectFirst: true })))}>{sec} s</Button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-subtle">Najpierw skracane są najdłuższe ujęcia; pierwsze ujęcie (hook) jest chronione.</p>
      </div>
    </div>
  );
}
