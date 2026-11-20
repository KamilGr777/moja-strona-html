"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clapperboard, Download, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { JobProgress } from "@/components/jobs/job-progress";
import { ScorePill } from "@/components/common/status";

export interface FixedVersion {
  editingProjectId: string;
  name: string;
  changes: string[];
  comparison: { before: Stat; after: Stat } | null;
  render: { id: string; status: string; jobId: string | null; outputAssetId: string | null; exportId: string | null; error: string | null } | null;
  reanalysis: { id: string; status: string; totalScore: number | null; mode: string; jobId: string | null } | null;
}
interface Stat {
  durationSec: number;
  shots: number;
  avgShot: number;
  cutsPerSecond: number;
  hook: string;
}

export function BeforeAfter({ originalAssetId, originalScore, originalScaled, v }: { originalAssetId: string; originalScore: number; originalScaled: boolean; v: FixedVersion }) {
  const router = useRouter();
  const rendering = v.render && ["QUEUED", "RUNNING"].includes(v.render.status);
  const rows: Array<[string, (s: Stat) => string]> = [
    ["Długość", (s) => `${s.durationSec.toFixed(1).replace(".", ",")} s`],
    ["Liczba ujęć", (s) => String(s.shots)],
    ["Średnia długość ujęcia", (s) => `${s.avgShot.toFixed(1).replace(".", ",")} s`],
    ["Tempo cięć", (s) => `${s.cutsPerSecond.toFixed(2).replace(".", ",")} / s`],
    ["Hook (pierwsze ujęcie)", (s) => s.hook],
  ];
  return (
    <Card id="before-after" className="mb-6 overflow-hidden border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Przed / Po</p>
          <h2 className="text-base font-semibold">{v.name}</h2>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link href={`/editor/${v.editingProjectId}`}><Clapperboard /> Edytuj ręcznie</Link></Button>
          {v.render?.status === "COMPLETED" && <Button asChild size="sm"><Link href={`/export/${v.editingProjectId}`}>Akceptuj i eksportuj <ArrowRight /></Link></Button>}
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-muted">Oryginał</span><ScorePill score={originalScore} scaled={originalScaled} /></div>
          <video src={`/api/media/${originalAssetId}?v=proxy`} controls playsInline className="aspect-[9/16] max-h-[460px] w-full rounded-xl bg-black object-contain" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Poprawiona wersja AI</span>
            {v.reanalysis?.status === "COMPLETED" ? <ScorePill score={v.reanalysis.totalScore} scaled={v.reanalysis.mode === "HEURISTIC"} /> : v.reanalysis ? <Badge tone="primary">ponowna ocena…</Badge> : null}
          </div>
          {v.render?.status === "COMPLETED" && v.render.outputAssetId ? (
            <>
              <video src={`/api/media/${v.render.outputAssetId}?v=proxy`} controls playsInline className="aspect-[9/16] max-h-[460px] w-full rounded-xl bg-black object-contain" />
              {v.render.exportId && <a href={`/api/exports/${v.render.exportId}/download`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"><Download className="size-3.5" /> Pobierz MP4</a>}
            </>
          ) : rendering && v.render?.jobId ? (
            <JobProgress jobId={v.render.jobId} title="Renderowanie poprawionej wersji" onDone={() => router.refresh()} />
          ) : (
            <div className="flex aspect-[9/16] max-h-[460px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-bad">{v.render?.error ?? "Render niedostępny"}</div>
          )}
          {v.reanalysis && ["QUEUED", "RUNNING"].includes(v.reanalysis.status) && v.reanalysis.jobId && v.render?.status === "COMPLETED" && (
            <JobProgress className="mt-3" jobId={v.reanalysis.jobId} title="Ponowna ocena" onDone={() => router.refresh()} />
          )}
          {v.reanalysis?.status === "COMPLETED" && <Link href={`/analysis/${v.reanalysis.id}`} className="mt-2 block text-xs text-primary hover:underline">Pełny raport poprawionej wersji →</Link>}
        </div>
        <div className="space-y-4">
          {v.comparison && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-subtle"><th className="pb-2 font-medium">Porównanie</th><th className="pb-2 font-medium">Przed</th><th className="pb-2 font-medium">Po</th></tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map(([label, f]) => (
                  <tr key={label}><td className="py-2 pr-2 text-muted">{label}</td><td className="py-2 pr-2 align-top">{f(v.comparison!.before)}</td><td className="py-2 align-top font-medium text-fg">{f(v.comparison!.after)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Najważniejsze poprawki</p>
            <ul className="space-y-1.5 text-sm">{v.changes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-primary">✓</span><span>{c}</span></li>)}</ul>
          </div>
          <p className="text-[11px] text-subtle">Ponowna ocena to prognoza jakości nowej wersji (AI lub pomiar techniczny — jak w oryginale), a nie gwarantowany wzrost statystyk.</p>
        </div>
      </div>
    </Card>
  );
}
