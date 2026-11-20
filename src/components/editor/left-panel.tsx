"use client";
import { useState } from "react";
import { Plus, Film, Type, Music2, Blend, LayoutTemplate, BadgeCheck, Sparkles, Loader2, EyeOff, Save, MessageSquareText, Captions } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge, Notice } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Uploader } from "@/components/media/uploader";
import { api } from "@/lib/client/api";
import { CAPTION_PRESETS } from "@/lib/timeline/presets";
import { applyCaptionPreset, clampToDuration, layoutVideo, makeText, newVideoItem, snapCutsToBeats, totalDuration, updateVideoItem } from "@/lib/timeline/ops";
import { transcriptToTexts } from "@/lib/timeline/mapping";
import type { AssetMap, CaptionPresetKey, TimelineDoc } from "@/lib/timeline/types";
import { cn, formatDuration, round, uid } from "@/lib/utils";
import type { EditorAsset } from "./state";
import { ChatPanel } from "./chat-panel";

type Apply = (fn: (d: TimelineDoc) => TimelineDoc, transient?: boolean) => void;

export interface EditorContext {
  editingId: string;
  projectId: string;
  clientId: string | null;
  clientCta: string | null;
  clientLogoId: string | null;
  clientColors: string[];
  analysis: {
    id: string;
    assetId: string;
    captionIdeas: Array<{ text: string; start: number; end: number; kind: string }>;
    transcript: { segments: Array<{ start: number; end: number; text: string; words: Array<{ text: string; start: number; end: number }> }> } | null;
    music: { mood: string; tempo: string; recommendation: string } | null;
    findings: Array<{ id: string; start: number; end: number; severity: "GOOD" | "WARN" | "BAD"; suggestion: string; problem: string | null }>;
  } | null;
  templates: Array<{ id: string; name: string; captionPreset: string | null; colors: string[]; cta: string | null; endCardText: string | null; logoAssetId: string | null }>;
}

export function LeftPanel({ doc, assets, apply, time, ctx, onAssetsChanged, selectedId }: { doc: TimelineDoc; assets: Record<string, EditorAsset>; apply: Apply; time: number; ctx: EditorContext; onAssetsChanged: () => void; selectedId: string | null }) {
  const assetMap: AssetMap = Object.fromEntries(Object.values(assets).map((a) => [a.id, { id: a.id, durationSec: a.durationSec, hasAudio: a.hasAudio, width: a.width, height: a.height, kind: a.kind }]));
  const videos = Object.values(assets).filter((a) => a.kind === "VIDEO" && a.role !== "RENDER");
  const music = Object.values(assets).filter((a) => a.kind === "AUDIO");
  const total = totalDuration(doc);
  const [license, setLicense] = useState("");
  const [tplName, setTplName] = useState("");

  const addClip = (a: EditorAsset) => {
    if (a.status !== "READY") return toast.info("Plik jest jeszcze przetwarzany.");
    apply((d) => ({ ...d, video: [...d.video, newVideoItem(a.id, 0, Math.min(a.durationSec, 6), { label: a.name })] }));
  };
  const addText = (kind: "caption" | "title" | "cta", text: string, len = 2) => {
    const start = Math.min(time, Math.max(0, total - 0.5));
    apply((d) => ({ ...d, texts: [...d.texts, makeText(text, start, Math.min(start + len, Math.max(total, start + 0.5)), { kind, preset: d.settings.captionPreset })] }));
  };
  const addMusic = (a: EditorAsset) => {
    if (a.status !== "READY") return toast.info("Utwór jest jeszcze analizowany.");
    apply((d) => ({
      ...d,
      settings: { ...d.settings, muteOriginal: d.audio.length ? d.settings.muteOriginal : true },
      audio: [...d.audio, { id: uid("a"), assetId: a.id, start: 0, sourceIn: 0, sourceOut: round(Math.min(a.durationSec, Math.max(totalDuration(d) + 0.5, 5)), 3), volume: 0.85, fadeIn: 0.3, fadeOut: 1.2, label: a.name }],
    }));
    toast.success("Dodano muzykę. Oryginalne audio wyciszone — możesz to zmienić w ustawieniach projektu.");
  };
  const applyTemplate = (t: EditorContext["templates"][number]) => {
    apply((d) => {
      let next = t.captionPreset ? applyCaptionPreset(d, t.captionPreset as CaptionPresetKey) : d;
      if (t.colors[0]) next = { ...next, texts: next.texts.map((x) => ({ ...x, style: { ...x.style, highlightColor: t.colors[0].toUpperCase() } })) };
      const cta = t.cta ?? t.endCardText;
      if (cta && !next.texts.some((x) => x.kind === "cta")) {
        const e = layoutVideo(next).entries.at(-1);
        if (e) next = { ...next, texts: [...next.texts, makeText(cta, e.start + 0.1, Math.min(totalDuration(next), e.start + 2.4), { kind: "cta", preset: next.settings.captionPreset, anchor: { itemId: next.video.at(-1)!.id, offset: 0.1 } })] };
      }
      const logo = t.logoAssetId ?? ctx.clientLogoId;
      if (logo && assets[logo] && !next.logos.length) {
        const tt = totalDuration(next);
        next = { ...next, logos: [{ id: uid("l"), assetId: logo, start: round(Math.max(0, tt - 2.5), 3), end: round(tt, 3), position: { x: 0.5, y: 0.17 }, width: 0.28, opacity: 1 }] };
      }
      return next;
    });
    toast.success(`Zastosowano szablon „${t.name}”.`);
  };
  async function saveTemplate() {
    const sample = doc.texts[0];
    await api("/api/brand-templates", {
      body: { name: tplName.trim() || "Szablon marki", clientId: ctx.clientId, captionPreset: doc.settings.captionPreset, colors: ctx.clientColors, fontFamily: sample?.style.fontFamily ?? null, captionStyle: sample?.style ?? null, animation: sample?.animation ?? null, cta: doc.texts.find((t) => t.kind === "cta")?.text ?? ctx.clientCta, logoAssetId: doc.logos[0]?.assetId ?? ctx.clientLogoId },
    });
    toast.success("Zapisano szablon marki.");
    setTplName("");
  }
  const sel = doc.video.find((v) => v.id === selectedId);

  return (
    <Tabs defaultValue="media" className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-7 gap-0.5 p-0.5">
        {[
          ["media", Film, "Media"],
          ["text", Type, "Teksty"],
          ["music", Music2, "Muzyka"],
          ["fx", Blend, "Przejścia"],
          ["tpl", LayoutTemplate, "Szablony"],
          ["logo", BadgeCheck, "Logo"],
          ["ai", Sparkles, "AI"],
        ].map(([v, Icon, label]) => {
          const I = Icon as typeof Film;
          return (
            <Tooltip key={v as string} content={label as string}>
              <TabsTrigger value={v as string} className="h-8 justify-center px-0" aria-label={label as string}><I /></TabsTrigger>
            </Tooltip>
          );
        })}
      </TabsList>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <TabsContent value="media" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Biblioteka mediów</h3>
          <ul className="space-y-1.5">
            {videos.map((a) => (
              <li key={a.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-1.5">
                {a.status === "READY" ? <img src={`/api/media/${a.id}?v=poster`} alt="" className="h-12 w-8 rounded object-cover" /> : <div className="flex h-12 w-8 items-center justify-center rounded bg-surface-3"><Loader2 className="size-3.5 animate-spin text-subtle" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{a.name}</p>
                  <p className="text-[11px] text-subtle">{a.status === "READY" ? formatDuration(a.durationSec) : a.status === "FAILED" ? "Błąd przetwarzania" : "Przetwarzanie…"}</p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => addClip(a)} disabled={a.status !== "READY"} aria-label="Dodaj na koniec"><Plus /></Button>
              </li>
            ))}
          </ul>
          <Uploader compact multiple accept="video" params={{ role: "RAW_CLIP", projectId: ctx.projectId }} title="Dodaj nagrania" onUploaded={() => onAssetsChanged()} />
        </TabsContent>

        <TabsContent value="text" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Dodaj w miejscu głowicy</h3>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => addText("title", "Zobacz efekt", 1.8)}>Hook</Button>
            <Button size="sm" variant="secondary" onClick={() => addText("caption", "Nowy napis")}>Napis</Button>
            <Button size="sm" variant="secondary" onClick={() => addText("cta", ctx.clientCta ?? "Umów termin już dziś", 2.4)}>CTA</Button>
          </div>
          {ctx.analysis?.transcript?.segments.length ? (
            <Button size="sm" variant="secondary" className="w-full" onClick={() => {
              const t = transcriptToTexts(doc, ctx.analysis!.assetId, ctx.analysis!.transcript!.segments, "bold_viral");
              if (!t.length) return toast.info("Żaden fragment mowy nie znajduje się w obecnym montażu.");
              apply((d) => ({ ...d, texts: [...d.texts.filter((x) => x.kind !== "transcript"), ...t] }));
              toast.success(`Dodano ${t.length} napisów z transkrypcji (z podświetlaniem słów).`);
            }}><Captions /> Napisy z transkrypcji mowy</Button>
          ) : null}
          {ctx.analysis?.captionIdeas.length ? (
            <>
              <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-subtle">Propozycje z analizy</h3>
              <ul className="space-y-1.5">
                {ctx.analysis.captionIdeas.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs">
                    <span className="min-w-0 flex-1">„{c.text}”</span>
                    <Badge>{c.kind}</Badge>
                    <Button size="icon-sm" variant="ghost" onClick={() => addText(c.kind === "cta" ? "cta" : c.kind === "hook" ? "title" : "caption", c.text)} aria-label="Dodaj"><Plus /></Button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-subtle">Napisy w projekcie ({doc.texts.length})</h3>
          <ul className="space-y-1 text-xs">{doc.texts.slice().sort((a, b) => a.start - b.start).map((t) => <li key={t.id} className="truncate text-muted">{t.start.toFixed(1)} s · {t.text}</li>)}</ul>
        </TabsContent>

        <TabsContent value="music" className="space-y-3">
          {ctx.analysis?.music && (
            <Notice tone="primary" title={`AI Music Advisor: ${ctx.analysis.music.mood}`}>
              <span className="text-xs">{ctx.analysis.music.tempo}. {ctx.analysis.music.recommendation}</span>
            </Notice>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Twoja muzyka (licencjonowana)</h3>
          <ul className="space-y-1.5">
            {music.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2">
                <Music2 className="size-4 shrink-0 text-[#c4b5fd]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{a.name}</p>
                  <p className="text-[11px] text-subtle">{a.status === "READY" ? `${formatDuration(a.durationSec)}${a.bpm ? ` · ${a.bpm} BPM` : ""}` : "Analiza tempa…"}</p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => addMusic(a)} disabled={a.status !== "READY"} aria-label="Dodaj"><Plus /></Button>
              </li>
            ))}
            {!music.length && <p className="text-xs text-muted">Brak utworów. Prześlij własny, legalnie wykorzystywany utwór.</p>}
          </ul>
          <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Źródło licencji (np. Epidemic Sound, własny utwór)" className="text-xs" />
          <Uploader compact accept="audio" params={{ role: "MUSIC", license: license || undefined }} title="Prześlij muzykę" hint="MP3, WAV, M4A — wykryjemy tempo i beaty" onUploaded={() => onAssetsChanged()} />
          {doc.audio.length > 0 && (() => {
            const a = assets[doc.audio[0].assetId];
            return a?.beats.length ? <Button size="sm" variant="secondary" className="w-full" onClick={() => apply((d) => snapCutsToBeats(d, a.beats, assetMap))}>Dopasuj cięcia do beatów ({a.bpm} BPM)</Button> : null;
          })()}
          <p className="text-[11px] text-subtle">Nie pobieramy muzyki z TikToka, Instagrama ani Spotify bez odpowiednich praw.</p>
        </TabsContent>

        <TabsContent value="fx" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Przejścia</h3>
          {sel && doc.video.indexOf(sel) > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {(["cut", "fade", "fadeblack"] as const).map((t) => (
                <Button key={t} size="sm" variant={sel.transition.type === t ? "primary" : "secondary"} onClick={() => apply((d) => updateVideoItem(d, sel.id, { transition: { type: t, duration: t === "cut" ? 0 : 0.35 } }))}>{t === "cut" ? "Cięcie" : t === "fade" ? "Przenikanie" : "Czerń"}</Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Zaznacz klip (nie pierwszy), aby ustawić przejście wejściowe.</p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => apply((d) => ({ ...d, video: d.video.map((v) => ({ ...v, transition: { type: "cut", duration: 0 } })) }))}>Wszędzie cięcia</Button>
            <Button size="sm" variant="secondary" onClick={() => apply((d) => ({ ...d, video: d.video.map((v, i) => (i ? { ...v, transition: { type: "fade", duration: 0.3 } } : v)) }))}>Wszędzie przenikanie</Button>
          </div>
          <p className="text-[11px] text-subtle">W car detailingu najlepiej działają czyste cięcia i pojedyncze miękkie przejścia między sekcjami — unikaj przypadkowych efektów.</p>
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-subtle">Efekty</h3>
          <Button size="sm" variant="secondary" className="w-full" onClick={() => {
            const s = Math.min(time, Math.max(0, total - 0.5));
            apply((d) => ({ ...d, blurs: [...d.blurs, { id: uid("b"), start: round(s, 3), end: round(Math.min(s + 2, Math.max(total, s + 0.5)), 3), x: 0.35, y: 0.6, w: 0.3, h: 0.06, strength: 20, label: "Tablica rejestracyjna" }] }));
          }}><EyeOff /> Rozmyj obszar (tablica / twarz)</Button>
        </TabsContent>

        <TabsContent value="tpl" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Style napisów</h3>
          <div className="grid gap-1.5">
            {Object.entries(CAPTION_PRESETS).map(([k, p]) => (
              <button key={k} onClick={() => apply((d) => applyCaptionPreset(d, k as CaptionPresetKey))} className={cn("rounded-lg border p-2.5 text-left transition hover:border-primary/60", doc.settings.captionPreset === k ? "border-primary/60 bg-primary/10" : "border-border bg-surface-2")}>
                <span className="block truncate text-base" style={{ fontFamily: `"${p.style.fontFamily}"`, fontWeight: p.style.fontWeight, color: p.style.color === "#FFFFFF" ? undefined : p.style.color, textTransform: p.style.uppercase ? "uppercase" : "none", letterSpacing: p.style.letterSpacing / 4, WebkitTextStroke: p.style.outlineWidth ? "1px #000" : undefined }}>{p.label}</span>
                <span className="block text-[11px] text-subtle">{p.description}</span>
              </button>
            ))}
          </div>
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-subtle">Szablony marki</h3>
          {ctx.templates.map((t) => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface-2 p-2 text-left text-xs hover:border-primary/60">
              <span className="flex gap-0.5">{t.colors.slice(0, 3).map((c) => <span key={c} className="size-3 rounded-full" style={{ background: c }} />)}</span>
              <span className="flex-1 truncate">{t.name}</span>
            </button>
          ))}
          <div className="flex gap-1.5">
            <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Nazwa szablonu" className="text-xs" />
            <Button size="sm" variant="secondary" onClick={saveTemplate}><Save /></Button>
          </div>
          <p className="text-[11px] text-subtle">Szablon zapisuje styl napisów, kolory, CTA i logo — do szybkiego użycia w kolejnych rolkach klienta.</p>
        </TabsContent>

        <TabsContent value="logo" className="space-y-3">
          {ctx.clientLogoId && assets[ctx.clientLogoId] ? (
            <>
              <img src={`/api/media/${ctx.clientLogoId}?v=proxy`} alt="Logo klienta" className="mx-auto max-h-20 rounded bg-surface-2 p-2" />
              <Button size="sm" className="w-full" onClick={() => {
                const tt = totalDuration(doc);
                apply((d) => ({ ...d, logos: [...d.logos, { id: uid("l"), assetId: ctx.clientLogoId!, start: round(Math.max(0, tt - 2.5), 3), end: round(tt, 3), position: { x: 0.5, y: 0.17 }, width: 0.28, opacity: 1 }] }));
              }}><Plus /> Dodaj logo na planszę końcową</Button>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => {
                apply((d) => ({ ...d, logos: [...d.logos, { id: uid("l"), assetId: ctx.clientLogoId!, start: 0, end: round(totalDuration(d), 3), position: { x: 0.84, y: 0.14 }, width: 0.16, opacity: 0.85 }] }));
              }}>Znak wodny przez cały film</Button>
            </>
          ) : ctx.clientId ? (
            <>
              <p className="text-xs text-muted">Klient nie ma jeszcze logo. Prześlij PNG (najlepiej z przezroczystym tłem).</p>
              <Uploader compact accept="image" params={{ role: "LOGO", clientId: ctx.clientId }} title="Prześlij logo klienta" onUploaded={() => onAssetsChanged()} />
            </>
          ) : (
            <p className="text-xs text-muted">Przypisz projekt do klienta (Historia projektów → projekt), aby używać jego logo.</p>
          )}
        </TabsContent>

        <TabsContent value="ai" className="flex h-full flex-col">
          <ChatPanel editingId={ctx.editingId} doc={doc} assets={assets} apply={apply} />
          {ctx.analysis && ctx.analysis.findings.filter((f) => f.severity !== "GOOD").length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle"><MessageSquareText className="size-3.5" /> Sugestie z analizy</h3>
              <ul className="space-y-1.5">
                {ctx.analysis.findings.filter((f) => f.severity !== "GOOD").slice(0, 8).map((f) => (
                  <li key={f.id} className={cn("rounded-lg border px-2.5 py-2 text-xs", f.severity === "BAD" ? "border-bad/30 bg-bad/5" : "border-warn/30 bg-warn/5")}>
                    <span className="tabular text-subtle">{f.start.toFixed(1)}–{f.end.toFixed(1)} s (oryginał) · </span>{f.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

export { clampToDuration };
