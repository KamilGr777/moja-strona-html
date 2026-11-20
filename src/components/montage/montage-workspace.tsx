"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Wand2, Trash2, Loader2, AlertCircle, Clapperboard, Download, Film, RefreshCw, Check, ListChecks, Music2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SwitchRow } from "@/components/ui/switch";
import { Badge, Notice } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { Uploader } from "@/components/media/uploader";
import { JobProgress } from "@/components/jobs/job-progress";
import { api } from "@/lib/client/api";
import { cn, formatDuration } from "@/lib/utils";
import { SHOT_CATEGORIES, MONTAGE_STYLES } from "@/lib/constants";
import type { TimelineDoc } from "@/lib/timeline/types";
import type { EditorAsset } from "@/components/editor/state";
import { STYLE_OPTIONS, DURATION_OPTIONS, PACE_OPTIONS, MONTAGE_GOAL_OPTIONS, SHOT_OPTIONS } from "@/components/common/option-lists";
import { MiniPlayer } from "./mini-player";

export interface ClipRow {
  id: string;
  assetId: string;
  name: string;
  status: string;
  error: string | null;
  durationSec: number | null;
  tags: string[];
  category: string | null;
  categorySource: string | null;
  summary: string | null;
  scenes: number;
}

export interface VariantView {
  id: string;
  name: string;
  variant: string;
  doc: TimelineDoc;
  changes: string[];
  stats: { durationSec: number; shots: number; avgShot: number; cutsPerSecond: number; captions: number; hook: string } | null;
  exportId: string | null;
  summary?: string;
  useCase?: string;
}

interface Settings {
  style: string;
  duration: string;
  customDuration: number | null;
  pace: string;
  goal: string;
  withCaptions: boolean;
  variants: boolean;
  musicAssetId: string | null;
}

export function MontageWorkspace({ projectId, name, clips: initialClips, music, settings: initialSettings, warnings, variants, assets, activeJobId, checklist }: {
  projectId: string;
  name: string;
  clips: ClipRow[];
  music: Array<{ id: string; name: string; status: string; bpm: number | null; license: string | null }>;
  settings: Settings | null;
  warnings: string[];
  variants: VariantView[];
  assets: Record<string, EditorAsset>;
  activeJobId: string | null;
  checklist: Array<{ name: string; done: boolean; detail?: string }> | null;
}) {
  const router = useRouter();
  const [clips, setClips] = useState(initialClips);
  const [s, setS] = useState<Settings>(initialSettings ?? { style: "premium", duration: "15-20", customDuration: 20, pace: "balanced", goal: "messages", withCaptions: true, variants: true, musicAssetId: null });
  const [jobId, setJobId] = useState<string | null>(activeJobId);
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState(checklist ?? []);
  const processing = clips.some((c) => c.status === "UPLOADED" || c.status === "PROCESSING");

  const refresh = useCallback(async () => {
    const r = await api<{ project: { clips: Array<{ id: string; assetId: string; category: string | null; categorySource: string | null; summary: string | null }>; assets: Array<{ id: string; originalName: string; status: string; error: string | null; durationSec: number | null; tags: string[]; metadata: { sceneCount?: number } }> } }>(`/api/projects/${projectId}`, { method: "GET", silent: true }).catch(() => null);
    if (!r) return;
    setClips(r.project.clips.map((c) => {
      const a = r.project.assets.find((x) => x.id === c.assetId)!;
      return { id: c.id, assetId: c.assetId, name: a?.originalName ?? "", status: a?.status ?? "UPLOADED", error: a?.error ?? null, durationSec: a?.durationSec ?? null, tags: a?.tags ?? [], category: c.category, categorySource: c.categorySource, summary: c.summary, scenes: a?.metadata?.sceneCount ?? 0 };
    }));
  }, [projectId]);
  useEffect(() => {
    if (!processing) return;
    const h = setInterval(refresh, 2000);
    return () => clearInterval(h);
  }, [processing, refresh]);

  async function generate() {
    setBusy(true);
    try {
      const r = await api<{ job: { id: string } }>(`/api/montage/${projectId}/generate`, { body: { ...s, customDuration: s.duration === "custom" ? s.customDuration : null } });
      setJobId(r.job.id);
    } finally {
      setBusy(false);
    }
  }
  async function setTag(c: ClipRow, tag: string) {
    const tags = tag === "none" ? [] : [tag];
    setClips((all) => all.map((x) => (x.id === c.id ? { ...x, tags } : x)));
    await api(`/api/assets/${c.assetId}`, { method: "PATCH", body: { tags } });
  }
  async function removeClip(c: ClipRow) {
    if (!confirm(`Usunąć klip „${c.name}”?`)) return;
    await api(`/api/assets/${c.assetId}`, { method: "DELETE" });
    setClips((all) => all.filter((x) => x.id !== c.id));
  }
  async function toggleShot(n: string) {
    const next = shots.map((x) => (x.name === n ? { ...x, done: !x.done } : x));
    setShots(next);
    await api(`/api/projects/${projectId}`, { method: "PATCH", body: { shotChecklist: next }, silent: true });
  }
  const main = variants.find((v) => v.variant === "AUTO");
  const ORDER = ["VIRAL", "PREMIUM", "SALES"];
  const abc = variants.filter((v) => ORDER.includes(v.variant)).sort((a, b) => ORDER.indexOf(a.variant) - ORDER.indexOf(b.variant));
  const readyClips = clips.filter((c) => c.status === "READY").length;

  return (
    <div>
      <div className="mb-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">AI Auto Montaż</p>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-1 text-sm text-muted">Prześlij surowe klipy (5, 10, 20 lub więcej), wybierz styl i długość — system przeanalizuje materiał i zbuduje rzeczywisty montaż.</p>
      </div>
      {warnings.map((w, i) => <Notice key={i} tone="warn" className="mb-3">{w}</Notice>)}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">1. Surowe nagrania <span className="font-normal text-subtle">({clips.length}, gotowe: {readyClips})</span></h2>
              {processing && <span className="flex items-center gap-1.5 text-xs text-muted"><Loader2 className="size-3.5 animate-spin" /> Przetwarzanie…</span>}
            </div>
            <Uploader multiple accept="video" params={{ role: "RAW_CLIP", projectId }} title="Przeciągnij surowe klipy (wiele naraz)" hint="Polerowanie, mycie, wnętrze, gotowy samochód… — każdy plik analizujemy osobno" onUploaded={() => refresh()} />
            {clips.length > 0 && (
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {clips.map((c) => (
                  <li key={c.id} className="flex gap-3 rounded-xl border border-border bg-surface-2 p-2">
                    {c.status === "READY" ? <img src={`/api/media/${c.assetId}?v=poster`} alt="" className="h-20 w-12 shrink-0 rounded-md object-cover" /> : <div className="flex h-20 w-12 shrink-0 items-center justify-center rounded-md bg-surface-3">{c.status === "FAILED" ? <AlertCircle className="size-4 text-bad" /> : <Loader2 className="size-4 animate-spin text-subtle" />}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-medium">{c.name}</p>
                        <button onClick={() => removeClip(c)} className="text-subtle hover:text-bad" aria-label="Usuń klip"><Trash2 className="size-3.5" /></button>
                      </div>
                      <p className="text-[11px] text-subtle">{c.status === "READY" ? `${formatDuration(c.durationSec)} · ${c.scenes} scen` : c.status === "FAILED" ? c.error : "Analiza…"}</p>
                      {c.categorySource === "ai" && c.category ? (
                        <Badge tone="primary" className="mt-1.5">AI: {SHOT_CATEGORIES[c.category as keyof typeof SHOT_CATEGORIES]}</Badge>
                      ) : (
                        <div className="mt-1.5"><Select value={c.tags[0] ?? "none"} onValueChange={(v) => setTag(c, v)} className="h-7 text-xs" options={[{ value: "none", label: "Rodzaj ujęcia (opcjonalnie)" }, ...SHOT_OPTIONS]} /></div>
                      )}
                      {c.summary && <p className="mt-1 line-clamp-2 text-[11px] text-muted">{c.summary}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {jobId && <JobProgress jobId={jobId} title="AI Auto Montaż" onDone={() => { setJobId(null); router.refresh(); }} onRetried={setJobId} />}

          {main && (
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">3. Twój montaż — {MONTAGE_STYLES[s.style as keyof typeof MONTAGE_STYLES]}</h2>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="secondary"><Link href={`/editor/${main.id}`}><Clapperboard /> Edytuj</Link></Button>
                  <Button asChild size="sm"><Link href={`/export/${main.id}`}><Download /> Eksportuj MP4</Link></Button>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-[260px_1fr]">
                <MiniPlayer doc={main.doc} assets={assets} />
                <div>
                  {main.stats && <Stats s={main.stats} />}
                  <p className="mb-2 mt-4 text-xs font-semibold text-muted">Decyzje montażowe</p>
                  <ul className="space-y-1.5 text-sm">{main.changes.map((c, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />{c}</li>)}</ul>
                </div>
              </div>
            </Card>
          )}

          {abc.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold">Trzy automatyczne wersje</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                {abc.map((v) => (
                  <Card key={v.id} className="flex flex-col p-4">
                    <p className="text-sm font-semibold">{v.name}</p>
                    <p className="mb-3 text-xs text-muted">{v.summary}</p>
                    <MiniPlayer doc={v.doc} assets={assets} />
                    {v.stats && <div className="mt-3"><Stats s={v.stats} compact /></div>}
                    <p className="mt-3 text-[11px] text-subtle"><span className="text-muted">Zastosowanie:</span> {v.useCase}</p>
                    <div className="mt-auto flex gap-2 pt-3">
                      <Button asChild size="sm" variant="secondary" className="flex-1"><Link href={`/editor/${v.id}`}><Clapperboard /> Edytuj</Link></Button>
                      <Button asChild size="sm" className="flex-1"><Link href={`/export/${v.id}`}><Film /> Eksport</Link></Button>
                    </div>
                  </Card>
                ))}
              </div>
              <Card className="mt-4 overflow-x-auto p-5">
                <h3 className="mb-3 text-sm font-semibold">Porównanie wersji</h3>
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-subtle"><th className="pb-2 font-medium">Cecha</th>{abc.map((v) => <th key={v.id} className="pb-2 font-medium">{v.variant}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Długość", (v: VariantView) => `${v.stats?.durationSec.toFixed(1).replace(".", ",")} s`],
                      ["Liczba ujęć", (v: VariantView) => String(v.stats?.shots)],
                      ["Śr. długość ujęcia", (v: VariantView) => `${v.stats?.avgShot.toFixed(2).replace(".", ",")} s`],
                      ["Tempo cięć", (v: VariantView) => `${v.stats?.cutsPerSecond.toFixed(2).replace(".", ",")}/s`],
                      ["Napisy", (v: VariantView) => String(v.stats?.captions)],
                      ["Hook", (v: VariantView) => v.stats?.hook ?? "—"],
                      ["Mocne strony", (v: VariantView) => v.summary ?? ""],
                      ["Najlepsze do", (v: VariantView) => v.useCase ?? ""],
                    ].map(([label, f]) => (
                      <tr key={label as string}><td className="py-2 pr-3 text-muted">{label as string}</td>{abc.map((v) => <td key={v.id} className="py-2 pr-3 align-top">{(f as (v: VariantView) => string)(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5 xl:sticky xl:top-6">
            <h2 className="mb-4 text-sm font-semibold">2. Ustawienia montażu</h2>
            <div className="space-y-3">
              <Field label="Styl montażu"><Select value={s.style} onValueChange={(v) => setS({ ...s, style: v })} options={STYLE_OPTIONS} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Docelowa długość"><Select value={s.duration} onValueChange={(v) => setS({ ...s, duration: v })} options={DURATION_OPTIONS} /></Field>
                <Field label="Tempo"><Select value={s.pace} onValueChange={(v) => setS({ ...s, pace: v })} options={PACE_OPTIONS} /></Field>
              </div>
              {s.duration === "custom" && <Field label={`Własna długość: ${s.customDuration ?? 20} s`}><Slider value={s.customDuration ?? 20} onChange={(v) => setS({ ...s, customDuration: Math.round(v) })} min={5} max={90} step={1} /></Field>}
              <Field label="Cel"><Select value={s.goal} onValueChange={(v) => setS({ ...s, goal: v })} options={MONTAGE_GOAL_OPTIONS} /></Field>
              <Field label="Muzyka">
                <Select value={s.musicAssetId ?? "none"} onValueChange={(v) => setS({ ...s, musicAssetId: v === "none" ? null : v })} options={[{ value: "none", label: "Bez muzyki (oryginalne audio)" }, ...music.filter((m) => m.status === "READY").map((m) => ({ value: m.id, label: m.name, hint: m.bpm ? `${m.bpm} BPM${m.license ? ` · ${m.license}` : ""}` : m.license ?? undefined }))]} />
              </Field>
              <details className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
                <summary className="flex cursor-pointer items-center gap-1.5 text-muted"><Music2 className="size-3.5" /> Prześlij własną muzykę (legalną)</summary>
                <div className="mt-2"><Uploader compact accept="audio" params={{ role: "MUSIC" }} title="Prześlij utwór" onUploaded={() => router.refresh()} /></div>
              </details>
              <SwitchRow label="Napisy marketingowe" hint="Hook, proces, efekt, CTA klienta" checked={s.withCaptions} onCheckedChange={(v) => setS({ ...s, withCaptions: v })} />
              <SwitchRow label="Trzy wersje A/B/C" hint="Viral, Premium i Sales do porównania" checked={s.variants} onCheckedChange={(v) => setS({ ...s, variants: v })} />
              <Button className="w-full" size="lg" variant="glow" disabled={!clips.length || Boolean(jobId)} loading={busy} onClick={generate}><Wand2 /> Generuj montaż</Button>
              {variants.length > 0 && (
                <Button className="w-full" variant="secondary" size="sm" onClick={async () => { await api(`/api/montage/${projectId}/replan`, { body: { patch: { ...s, customDuration: s.duration === "custom" ? s.customDuration : null } } }); toast.success("Montaż ułożony ponownie z nowymi ustawieniami."); router.refresh(); }}><RefreshCw /> Przelicz układ (bez ponownej analizy)</Button>
              )}
              {!clips.length && <p className="text-xs text-subtle">Najpierw dodaj nagrania.</p>}
            </div>
          </Card>
          {shots.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4 text-primary" /> Lista ujęć do nagrania</h2>
              <ul className="space-y-1.5">
                {shots.map((x) => (
                  <li key={x.name}>
                    <button onClick={() => toggleShot(x.name)} className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-surface-2">
                      <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", x.done ? "border-good bg-good text-white" : "border-border-strong")}>{x.done && <Check className="size-3" />}</span>
                      <span><span className={x.done ? "text-muted line-through" : ""}>{x.name}</span>{x.detail && <span className="block text-[11px] text-subtle">{x.detail}</span>}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5 text-xs text-muted">
            <p className="mb-1 font-semibold text-fg">Jak działa auto montaż?</p>
            Analiza każdego klipu (sceny, ruch, ostrość, jasność{" "}+ rozpoznanie ujęć przez AI) → odrzucenie słabych technicznie fragmentów → wybór najlepszych momentów → historia (hook → proces → efekt → CTA) → długość wg tempa → napisy → muzyka i cięcia na beat → rzeczywisty projekt timeline, który edytujesz i renderujesz do MP4.
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stats({ s, compact }: { s: NonNullable<VariantView["stats"]>; compact?: boolean }) {
  const items = [
    ["Długość", `${s.durationSec.toFixed(1).replace(".", ",")} s`],
    ["Ujęcia", String(s.shots)],
    ["Śr. ujęcie", `${s.avgShot.toFixed(1).replace(".", ",")} s`],
    ["Cięcia / s", s.cutsPerSecond.toFixed(2).replace(".", ",")],
    ...(compact ? [] : [["Napisy", String(s.captions)], ["Hook", s.hook]]),
  ];
  return (
    <dl className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      {items.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5"><dt className="text-[10px] uppercase tracking-wider text-subtle">{k}</dt><dd className="truncate text-sm font-medium tabular">{v}</dd></div>
      ))}
    </dl>
  );
}

