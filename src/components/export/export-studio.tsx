"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileText, Film, Smartphone, Music2, MonitorPlay, Settings2, Clapperboard, ImageIcon, Share2, ListChecks, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SwitchRow } from "@/components/ui/switch";
import { Badge, Notice } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobProgress } from "@/components/jobs/job-progress";
import { api } from "@/lib/client/api";
import { cn, formatBytes, formatDate, formatDuration } from "@/lib/utils";
import type { CheckItem } from "@/lib/timeline/checklist";
import { Checklist } from "./checklist";
import { ShareBox } from "./share-box";
import { PostCopy } from "./post-copy";
import { ThumbnailEditor, type FrameCandidate } from "./thumbnail-editor";

export interface ExportRow {
  id: string;
  assetId: string;
  platform: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  sizeBytes: number;
  burnedSubtitles: boolean;
  withLogo: boolean;
  srtKey: string | null;
  checklist: CheckItem[] | null;
  shareActive: boolean;
  shareExpiresAt: string | null;
  reviewStatus: string | null;
  createdAt: string;
  comments: Array<{ id: string; authorName: string; body: string; timeSec: number | null; kind: string; createdAt: string }>;
}

const PLATFORMS = [
  { key: "instagram", label: "Instagram Reels", icon: Smartphone },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "youtube", label: "YouTube Shorts", icon: MonitorPlay },
  { key: "custom", label: "Niestandardowy", icon: Settings2 },
] as const;

export function ExportStudio({ editingId, projectId, name, durationSec, textsCount, logosCount, platform: initialPlatform, exports, activeJobId, frames, logoUrl, brandColor }: { editingId: string; projectId: string; name: string; durationSec: number; textsCount: number; logosCount: number; platform: string; exports: ExportRow[]; activeJobId: string | null; frames: FrameCandidate[]; logoUrl: string | null; brandColor: string | null }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>(initialPlatform);
  const [quality, setQuality] = useState("standard");
  const [fps, setFps] = useState("source");
  const [burn, setBurn] = useState(true);
  const [logo, setLogo] = useState(true);
  const [loud, setLoud] = useState(true);
  const [jobId, setJobId] = useState<string | null>(activeJobId);
  const [busy, setBusy] = useState(false);
  const latest = exports[0];

  async function render() {
    setBusy(true);
    try {
      const r = await api<{ jobId: string }>(`/api/editing/${editingId}/render`, {
        body: { quality, burnSubtitles: burn, withLogo: logo, loudnorm: loud, fps: fps === "source" ? null : Number(fps), platform: platform === "custom" ? undefined : platform },
      });
      setJobId(r.jobId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Export Studio</p>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-sm text-muted">{formatDuration(durationSec)} · {textsCount} napisów · {logosCount ? "z logo" : "bez logo"}</p>
        </div>
        <Button asChild variant="secondary"><Link href={`/editor/${editingId}`}><Clapperboard /> Wróć do edytora</Link></Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Platforma</h2>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <button key={p.key} onClick={() => setPlatform(p.key)} className={cn("flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition", platform === p.key ? "border-primary/60 bg-primary/10" : "border-border bg-surface-2 hover:border-border-strong")}>
                <p.icon className="size-4 text-primary" /> {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
            <p className="font-semibold text-fg">Format wyjściowy</p>
            1080 × 1920 · 9:16 · MP4 · H.264 (High) · AAC 48 kHz · faststart
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Jakość">
              <Select value={quality} onValueChange={setQuality} options={[{ value: "draft", label: "Robocza (szybko)" }, { value: "standard", label: "Standard (CRF 20)" }, { value: "high", label: "Najwyższa (CRF 17)" }]} />
            </Field>
            <Field label="Klatki / s">
              <Select value={fps} onValueChange={setFps} options={[{ value: "source", label: "Jak w projekcie" }, { value: "24", label: "24" }, { value: "25", label: "25" }, { value: "30", label: "30" }, { value: "60", label: "60" }]} />
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            <SwitchRow label="Napisy w filmie" hint={textsCount ? "Wypalane w obrazie (libass)" : "Projekt nie ma napisów"} checked={burn} onCheckedChange={setBurn} />
            <SwitchRow label="Logo klienta" hint={logosCount ? "Zgodnie z timeline" : "Brak logo na timeline"} checked={logo} onCheckedChange={setLogo} />
            <SwitchRow label="Normalizacja głośności" hint="−14 LUFS, limit −1,5 dBTP" checked={loud} onCheckedChange={setLoud} />
          </div>
          <Button className="mt-5 w-full" size="lg" variant="glow" loading={busy} disabled={Boolean(jobId)} onClick={render}><Film /> Renderuj MP4</Button>
          {jobId && <JobProgress className="mt-4" jobId={jobId} title="Renderowanie" onDone={() => { setJobId(null); router.refresh(); }} onRetried={setJobId} />}
          <p className="mt-3 text-[11px] text-subtle">Render powstaje z oryginalnych plików źródłowych (nie z proxy) w silniku FFmpeg w tle — możesz w tym czasie korzystać z aplikacji.</p>
        </Card>

        <div className="min-w-0">
          {!latest ? (
            <Notice>Nie masz jeszcze eksportu tego projektu. Ustaw opcje i kliknij „Renderuj MP4”.</Notice>
          ) : (
            <Tabs defaultValue="result">
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <TabsList>
                  <TabsTrigger value="result"><Film /> Wynik</TabsTrigger>
                  <TabsTrigger value="check"><ListChecks /> Checklista</TabsTrigger>
                  <TabsTrigger value="share"><Share2 /> Akceptacja klienta {latest.comments.length > 0 && <Badge tone="primary">{latest.comments.length}</Badge>}</TabsTrigger>
                  <TabsTrigger value="post"><PenLine /> Opis posta</TabsTrigger>
                  <TabsTrigger value="thumb"><ImageIcon /> Okładka</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="result" className="mt-4">
                <Card className="p-5">
                  <div className="grid gap-5 md:grid-cols-[minmax(200px,300px)_1fr]">
                    <video src={`/api/media/${latest.assetId}?v=proxy`} controls playsInline className="aspect-[9/16] w-full rounded-xl bg-black" />
                    <div className="space-y-4">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted">Rozdzielczość</dt><dd className="tabular">{latest.width}×{latest.height}</dd>
                        <dt className="text-muted">Długość</dt><dd className="tabular">{formatDuration(latest.durationSec)}</dd>
                        <dt className="text-muted">FPS</dt><dd className="tabular">{latest.fps}</dd>
                        <dt className="text-muted">Rozmiar</dt><dd className="tabular">{formatBytes(latest.sizeBytes)}</dd>
                        <dt className="text-muted">Napisy</dt><dd>{latest.burnedSubtitles ? "wypalone" : "bez napisów"}</dd>
                        <dt className="text-muted">Utworzono</dt><dd>{formatDate(latest.createdAt)}</dd>
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild><a href={`/api/exports/${latest.id}/download`}><Download /> Pobierz MP4</a></Button>
                        {latest.srtKey && <Button asChild variant="secondary"><a href={`/api/exports/${latest.id}/srt`}><FileText /> Pobierz SRT</a></Button>}
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted">Podgląd ostatniej klatki</p>
                        <img src={`/api/media/${latest.assetId}?v=last`} alt="Ostatnia klatka" className="h-48 rounded-lg border border-border" />
                      </div>
                    </div>
                  </div>
                </Card>
                {exports.length > 1 && (
                  <Card className="mt-4 p-5">
                    <h3 className="mb-3 text-sm font-semibold">Poprzednie eksporty</h3>
                    <ul className="divide-y divide-border text-sm">
                      {exports.slice(1).map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                          <span className="text-muted">{formatDate(e.createdAt)} · {e.platform} · {formatDuration(e.durationSec)} · {formatBytes(e.sizeBytes)}</span>
                          <a href={`/api/exports/${e.id}/download`} className="text-primary hover:underline">Pobierz</a>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="check" className="mt-4">
                <Card className="p-5">
                  <h3 className="mb-4 text-sm font-semibold">Checklista przed publikacją</h3>
                  {latest.checklist ? <Checklist items={latest.checklist} /> : <p className="text-sm text-muted">Brak danych.</p>}
                </Card>
              </TabsContent>
              <TabsContent value="share" className="mt-4 space-y-4">
                <Card className="p-5"><ShareBox exportId={latest.id} active={latest.shareActive} expiresAt={latest.shareExpiresAt} reviewStatus={latest.reviewStatus} /></Card>
                <Card className="p-5">
                  <h3 className="mb-3 text-sm font-semibold">Komentarze klienta</h3>
                  {latest.comments.length ? (
                    <ul className="space-y-2">
                      {latest.comments.map((c) => (
                        <li key={c.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className="font-semibold text-fg">{c.authorName}</span>
                            {c.timeSec != null && <Badge>{c.timeSec.toFixed(1)} s</Badge>}
                            {c.kind === "approval" && <Badge tone="good">akceptacja</Badge>}
                            {c.kind === "changes" && <Badge tone="warn">poprawki</Badge>}
                            <span>{formatDate(c.createdAt)}</span>
                          </div>
                          {c.body}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Brak komentarzy.</p>
                  )}
                </Card>
              </TabsContent>
              <TabsContent value="post" className="mt-4"><Card className="p-5"><PostCopy editingId={editingId} /></Card></TabsContent>
              <TabsContent value="thumb" className="mt-4"><Card className="p-5"><ThumbnailEditor frames={frames} projectId={projectId} logoUrl={logoUrl} brandColor={brandColor} /></Card></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
